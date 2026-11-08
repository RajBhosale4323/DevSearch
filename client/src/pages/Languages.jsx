import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Languages() {
    const [languages, setLanguages] = useState([]);
    const [filterQuery, setFilterQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const searchInputRef = useRef(null);
    const { setCurrentLanguage } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLanguages = async () => {
            try {
                const res = await fetch('/api/languages', {
                    credentials: 'include'
                });
                if (res.ok) {
                    const data = await res.json();
                    setLanguages(data.languages || []);
                } else {
                    setError('Failed to load programming languages.');
                }
            } catch (err) {
                console.error('Error fetching languages:', err);
                setError('Failed to load programming languages.');
            } finally {
                setLoading(false);
            }
        };

        fetchLanguages();
    }, []);

    // Keyboard shortcuts: / or Ctrl+K to focus search, Escape to clear
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && document.activeElement !== searchInputRef.current) {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
                setFilterQuery('');
                searchInputRef.current?.blur();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleLanguageClick = (lang) => {
        setCurrentLanguage(lang.id);
        navigate(`/${lang.id}`);
    };

    const query = filterQuery.trim().toLowerCase();
    const filteredLanguages = languages.filter((lang) => {
        if (!query) return true;
        const name = (lang.name || '').toLowerCase();
        const id = (lang.id || '').toLowerCase();
        return name.includes(query) || id.includes(query);
    });

    if (loading) {
        return (
            <div className="text-center my-5 py-5">
                <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading languages...</span>
                </div>
                <p className="text-secondary mt-3">Loading programming languages...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger my-5 text-center" role="alert">
                {error}
            </div>
        );
    }

    return (
        <div className="row justify-content-center my-4">
            <div className="col-lg-11 text-center">
                <h1 className="display-5 fw-bold text-dark mb-2">Select a Programming Language</h1>
                <p className="text-secondary fs-6 mb-4">
                    Explore instant documentation, syntax references, and live code examples.
                </p>

                {/* Live Language Filter Bar */}
                <div className="row justify-content-center mb-5">
                    <div className="col-md-6 col-lg-5">
                        <div className="input-group shadow-sm">
                            <span className="input-group-text bg-white border-end-0 text-muted">🔍</span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="form-control border-start-0 border-end-0 py-2"
                                placeholder="Filter languages (e.g. Python, SQL, Rust, C++)..."
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                autoComplete="off"
                            />
                            {filterQuery && (
                                <button
                                    className="btn btn-outline-secondary border-start-0 bg-white"
                                    type="button"
                                    onClick={() => {
                                        setFilterQuery('');
                                        searchInputRef.current?.focus();
                                    }}
                                    title="Clear filter"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-2 px-1">
                            <small className="text-secondary">
                                Showing {filteredLanguages.length} of {languages.length} languages
                            </small>
                            <small className="text-muted fst-italic">Instant search (/ or Ctrl+K)</small>
                        </div>
                    </div>
                </div>

                {/* Languages Grid */}
                <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4" id="languages-grid">
                    {filteredLanguages.map((lang) => (
                        <div key={lang.id} className="col lang-col">
                            <div
                                onClick={() => handleLanguageClick(lang)}
                                className="card lang-card p-4 h-100 text-center d-flex flex-column align-items-center justify-content-center text-decoration-none cursor-pointer"
                                style={{ cursor: 'pointer' }}
                            >
                                <span
                                    className="display-4 mb-3"
                                    dangerouslySetInnerHTML={{ __html: lang.icon || '💻' }}
                                />
                                <h3 className="h5 fw-bold text-dark mb-1">{lang.name}</h3>
                                <div className="mt-2">
                                    {lang.count !== undefined && lang.count > 0 ? (
                                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1">
                                            {lang.count} syntax items &rarr;
                                        </span>
                                    ) : (
                                        <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2 py-1">
                                            Reference docs &rarr;
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* No matching language state */}
                {filteredLanguages.length === 0 && (
                    <div className="card p-5 text-center my-4 shadow-sm">
                        <p className="h5 text-dark mb-2">No programming languages found</p>
                        <p className="text-secondary small mb-3">No indexed languages match your filter.</p>
                        <div>
                            <button
                                type="button"
                                className="btn btn-outline-success btn-sm px-3"
                                onClick={() => {
                                    setFilterQuery('');
                                    searchInputRef.current?.focus();
                                }}
                            >
                                Reset Filter
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
