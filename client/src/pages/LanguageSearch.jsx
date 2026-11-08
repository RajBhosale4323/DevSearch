import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// In-memory cache surviving SPA navigation across languages (2-hour TTL)
const syntaxMemoryCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export default function LanguageSearch() {
    const { language } = useParams();
    const { setCurrentLanguage } = useAuth();

    const [langName, setLangName] = useState('');
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [difficulty, setDifficulty] = useState('all');
    const [activeTag, setActiveTag] = useState('');
    const [copiedMap, setCopiedMap] = useState({});

    const searchInputRef = useRef(null);

    useEffect(() => {
        if (language) {
            setCurrentLanguage(language);
        }
        fetchLanguageData();
    }, [language]);

    const fetchLanguageData = async () => {
        const langKey = (language || '').toLowerCase();
        const now = Date.now();

        // 1. Check in-memory Map cache (0ms instant switch)
        if (syntaxMemoryCache.has(langKey)) {
            const cached = syntaxMemoryCache.get(langKey);
            if (now - cached.timestamp < CACHE_TTL_MS) {
                setLangName(cached.langName);
                setEntries(cached.entries);
                setLoading(false);
                setError('');
                return;
            }
        }

        // 2. Check sessionStorage (survives page refresh within 2 hours)
        try {
            const stored = sessionStorage.getItem(`syntax_cache_${langKey}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (now - parsed.timestamp < CACHE_TTL_MS) {
                    syntaxMemoryCache.set(langKey, parsed);
                    setLangName(parsed.langName);
                    setEntries(parsed.entries);
                    setLoading(false);
                    setError('');
                    return;
                }
            }
        } catch (e) {}

        // 3. Network fetch
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/languages/${language}`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                const resolvedName = data.lang_name || language;
                const resolvedEntries = data.results || [];
                setLangName(resolvedName);
                setEntries(resolvedEntries);

                const cachePayload = {
                    langName: resolvedName,
                    entries: resolvedEntries,
                    timestamp: Date.now()
                };
                syntaxMemoryCache.set(langKey, cachePayload);
                try {
                    sessionStorage.setItem(`syntax_cache_${langKey}`, JSON.stringify(cachePayload));
                } catch (e) {}
            } else if (res.status === 404) {
                setError(`Language '${language}' not found.`);
            } else {
                setError('Failed to load syntax references.');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    // Keyboard shortcuts: / or Ctrl+K to focus search input, Escape to clear
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && document.activeElement !== searchInputRef.current) {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
                setSearchQuery('');
                searchInputRef.current?.blur();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleCopy = (id, text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedMap((prev) => ({ ...prev, [id]: true }));
            setTimeout(() => {
                setCopiedMap((prev) => ({ ...prev, [id]: false }));
            }, 2000);
        }).catch((err) => {
            console.error('Copy failed:', err);
        });
    };

    const resetAllFilters = () => {
        setSearchQuery('');
        setDifficulty('all');
        setActiveTag('');
        searchInputRef.current?.focus();
    };

    // Filter logic
    const q = searchQuery.trim().toLowerCase();
    const filteredEntries = entries.filter((item) => {
        // Difficulty filter
        if (difficulty !== 'all') {
            if ((item.difficulty || '').toLowerCase() !== difficulty.toLowerCase()) {
                return false;
            }
        }

        // Tag filter
        if (activeTag) {
            const itemTags = (item.tags || []).map((t) => t.toLowerCase());
            if (!itemTags.includes(activeTag.toLowerCase())) {
                return false;
            }
        }

        // Query filter
        if (q) {
            const inTitle = (item.title || '').toLowerCase().includes(q);
            const inSyntax = (item.syntax || '').toLowerCase().includes(q);
            const inDesc = (item.description || '').toLowerCase().includes(q);
            const inExample = (item.example || '').toLowerCase().includes(q);
            const inTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));

            if (!inTitle && !inSyntax && !inDesc && !inExample && !inTags) {
                return false;
            }
        }

        return true;
    });

    if (loading) {
        return (
            <div className="text-center my-5 py-5">
                <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading syntax references...</span>
                </div>
                <p className="text-secondary mt-3">Loading {language} documentation...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="row justify-content-center my-5">
                <div className="col-md-7 text-center">
                    <div className="card p-5 shadow-sm">
                        <span className="display-1 text-danger mb-3 d-block">404</span>
                        <h1 className="h3 fw-bold text-dark mb-2">Language Not Found</h1>
                        <p className="text-secondary mb-4">{error}</p>
                        <div>
                            <Link to="/languages" className="btn btn-success px-4 py-2">
                                &larr; Return to Languages
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="d-flex flex-column gap-4 my-2">
            {/* Header */}
            <div className="text-center">
                <h1 className="h3 fw-bold text-dark mb-1">
                    🔍 {langName} Syntax & Reference
                </h1>
                <p className="text-secondary small mb-3">
                    Instant search across syntax, descriptions, live examples, returns, and tags
                </p>
            </div>

            {/* Search Form */}
            <div className="row justify-content-center">
                <div className="col-lg-10">
                    <div id="search-form" className="row g-2 align-items-center">
                        <div className="col-12 position-relative">
                            <div className="input-group shadow-sm">
                                <span className="input-group-text bg-white border-end-0 text-muted">⚡</span>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search syntax, functions, methods, tags (e.g. print, filter, SELECT)..."
                                    autoComplete="off"
                                    className="form-control border-start-0 py-2"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary border-start-0 bg-white"
                                        onClick={() => {
                                            setSearchQuery('');
                                            searchInputRef.current?.focus();
                                        }}
                                        title="Clear search"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Difficulty Filter Pills */}
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3 pt-2 border-top border-secondary border-opacity-10">
                        <div className="d-flex flex-wrap align-items-center gap-1" id="difficulty-filters">
                            <span className="small text-secondary me-1 fw-bold">Difficulty:</span>
                            <button
                                type="button"
                                className={`btn btn-sm diff-btn ${difficulty === 'all' ? 'btn-dark active' : 'btn-outline-dark'}`}
                                onClick={() => setDifficulty('all')}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm diff-btn ${difficulty === 'beginner' ? 'btn-success active text-white' : 'btn-outline-success'}`}
                                onClick={() => setDifficulty('beginner')}
                            >
                                Beginner
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm diff-btn ${difficulty === 'intermediate' ? 'btn-warning active text-dark' : 'btn-outline-warning'}`}
                                onClick={() => setDifficulty('intermediate')}
                            >
                                Intermediate
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm diff-btn ${difficulty === 'advanced' ? 'btn-danger active text-white' : 'btn-outline-danger'}`}
                                onClick={() => setDifficulty('advanced')}
                            >
                                Advanced
                            </button>
                        </div>
                        <div className="small text-secondary">
                            <span>
                                Showing <strong className="text-dark">{filteredEntries.length}</strong> of {entries.length} entries
                            </span>
                        </div>
                    </div>

                    {/* Active Tag Badge Filter */}
                    {activeTag && (
                        <div className="mt-2">
                            <span className="small text-muted me-1">Filtered by tag:</span>
                            <span className="badge bg-primary text-white font-monospace px-2 py-1">
                                #{activeTag}
                                <span
                                    role="button"
                                    className="text-white text-decoration-none ms-1 fw-bold"
                                    onClick={() => setActiveTag('')}
                                    style={{ cursor: 'pointer' }}
                                    title="Remove tag filter"
                                >
                                    &times;
                                </span>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Search Results / Cheatsheet Cards */}
            <div className="d-flex flex-column gap-4" id="cards-container">
                {filteredEntries.map((item, index) => {
                    const syntaxCopyKey = `syntax-${item.id}`;
                    const exampleCopyKey = `example-${item.id}`;

                    return (
                        <div
                            key={item.id}
                            className="card syntax-card p-4 shadow-sm"
                            style={{ animationDelay: `${Math.min(index * 25, 200)}ms` }}
                        >
                            <div className="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                        <h3 className="h5 fw-bold text-success font-monospace m-0">{item.title}</h3>
                                        {item.difficulty && (
                                            <span
                                                className={`badge ${
                                                    item.difficulty === 'beginner'
                                                        ? 'bg-success bg-opacity-25 text-success border border-success'
                                                        : item.difficulty === 'intermediate'
                                                        ? 'bg-warning bg-opacity-25 text-warning border border-warning'
                                                        : 'bg-danger bg-opacity-25 text-danger border border-danger'
                                                }`}
                                            >
                                                {item.difficulty}
                                            </span>
                                        )}
                                    </div>
                                    {item.description && (
                                        <p className="text-secondary small m-0">{item.description}</p>
                                    )}
                                </div>
                                {item.doc_link && (
                                    <a
                                        href={item.doc_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-outline-secondary btn-sm shrink-0"
                                    >
                                        Docs ↗
                                    </a>
                                )}
                            </div>

                            {/* Syntax */}
                            {item.syntax && (
                                <div className="mb-3">
                                    <span className="text-secondary small fw-bold text-uppercase d-block mb-1">
                                        Syntax
                                    </span>
                                    <div className="code-block-wrapper">
                                        <button
                                            type="button"
                                            className={`copy-code-btn ${copiedMap[syntaxCopyKey] ? 'copied' : ''}`}
                                            onClick={() => handleCopy(syntaxCopyKey, item.syntax)}
                                        >
                                            {copiedMap[syntaxCopyKey] ? '✓ Copied!' : '📋 Copy'}
                                        </button>
                                        <pre className="m-0">
                                            <code>{item.syntax}</code>
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* Example & Output */}
                            {item.example && (
                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <span className="text-secondary small fw-bold text-uppercase d-block mb-1">
                                            Example
                                        </span>
                                        <div className="code-block-wrapper h-100">
                                            <button
                                                type="button"
                                                className={`copy-code-btn ${copiedMap[exampleCopyKey] ? 'copied' : ''}`}
                                                onClick={() => handleCopy(exampleCopyKey, item.example)}
                                            >
                                                {copiedMap[exampleCopyKey] ? '✓ Copied!' : '📋 Copy'}
                                            </button>
                                            <pre className="m-0 h-100">
                                                <code>{item.example}</code>
                                            </pre>
                                        </div>
                                    </div>
                                    {item.output && (
                                        <div className="col-md-6">
                                            <span className="text-secondary small fw-bold text-uppercase d-block mb-1">
                                                Output / Returns
                                            </span>
                                            <div className="output-box h-100 font-monospace small m-0 d-flex flex-column justify-content-center">
                                                <div>
                                                    <span className="return-out">Out:</span>{' '}
                                                    <span className="text-info">{item.output}</span>
                                                </div>
                                                {item.returns && (
                                                    <div className="mt-1">
                                                        <span className="return-out">Returns:</span>{' '}
                                                        <span className="text-warning">{item.returns}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tags */}
                            {item.tags && item.tags.length > 0 && (
                                <div className="d-flex flex-wrap gap-1 pt-2 border-top border-secondary border-opacity-10 align-items-center">
                                    <span className="small text-muted me-1 font-monospace" style={{ fontSize: '0.75rem' }}>
                                        Tags:
                                    </span>
                                    {item.tags.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            role="button"
                                            className={`badge tag-pill font-monospace px-2 py-1 ${activeTag.toLowerCase() === tag.toLowerCase() ? 'active' : ''}`}
                                            onClick={() => setActiveTag(tag.toLowerCase())}
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* No matching results state */}
                {filteredEntries.length === 0 && (
                    <div className="card p-5 text-center shadow-sm">
                        <p className="h5 text-dark mb-2">No matching syntax entries</p>
                        <p className="text-secondary small mb-3">
                            Try adjusting your search terms or resetting the difficulty/tag filters.
                        </p>
                        <div>
                            <button
                                type="button"
                                className="btn btn-outline-success btn-sm px-3"
                                onClick={resetAllFilters}
                            >
                                Reset All Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
