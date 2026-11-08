import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function PendingCard({ item, languages, onReview, isBusy, isApproving, isRejecting }) {
    const [title, setTitle] = useState(item.title || '');
    const [syntax, setSyntax] = useState(item.syntax || '');
    const [language, setLanguage] = useState(item.language || 'python');
    const [difficulty, setDifficulty] = useState(item.difficulty || 'beginner');
    const [description, setDescription] = useState(item.description || '');
    const [example, setExample] = useState(item.example || '');
    const [output, setOutput] = useState(item.output || '');
    const [returns, setReturns] = useState(item.returns || '');
    const [docLink, setDocLink] = useState(item.doc_link || '');
    const [tags, setTags] = useState(item.tags || '');

    const handleApprove = () => {
        onReview(item.id, 'approve', {
            title,
            syntax,
            language,
            difficulty,
            description,
            example,
            output,
            returns,
            doc_link: docLink,
            tags
        });
    };

    const handleReject = () => {
        onReview(item.id, 'reject');
    };

    return (
        <div className="card syntax-card p-4 shadow-sm">
            {/* Header info */}
            <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
                <div>
                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <span className="badge bg-dark font-monospace text-uppercase px-2 py-1">
                            {language}
                        </span>
                        <h3 className="h5 fw-bold text-success font-monospace m-0">
                            {title || 'Untitled Syntax'}
                        </h3>
                        <span className="badge bg-warning bg-opacity-25 text-warning border border-warning">
                            Pending Admin Review
                        </span>
                    </div>
                    <div className="text-secondary small">
                        Submitted by <strong className="text-dark">{item.submitted_by || 'Community User'}</strong> on{' '}
                        {new Date(item.created_at).toLocaleString()}
                    </div>
                </div>

                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-danger btn-sm px-3"
                        onClick={handleReject}
                        disabled={isBusy}
                    >
                        {isRejecting ? 'Rejecting...' : '✕ Reject'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-success btn-sm px-4"
                        onClick={handleApprove}
                        disabled={isBusy}
                    >
                        {isApproving ? 'Publishing...' : '✓ Approve & Publish'}
                    </button>
                </div>
            </div>

            {/* Editable Admin Fields */}
            <div className="p-3 bg-light rounded border border-secondary border-opacity-10 mb-3">
                <span className="small text-uppercase fw-bold text-secondary d-block mb-3">
                    Admin Verification & Enrichment Editor
                </span>

                <div className="row g-3 mb-3">
                    <div className="col-md-4">
                        <label className="form-label text-muted small fw-bold">Target Language</label>
                        <select
                            className="form-control form-control-sm"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                        >
                            {languages.map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.name}
                                </option>
                            ))}
                            {languages.length === 0 && <option value="python">Python</option>}
                        </select>
                    </div>

                    <div className="col-md-4">
                        <label className="form-label text-muted small fw-bold">Title / Function</label>
                        <input
                            type="text"
                            className="form-control form-control-sm font-monospace"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="col-md-4">
                        <label className="form-label text-muted small fw-bold">Difficulty Level</label>
                        <select
                            className="form-control form-control-sm"
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                        >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>
                </div>

                <div className="mb-3">
                    <label className="form-label text-muted small fw-bold">Syntax Signature</label>
                    <textarea
                        className="form-control form-control-sm font-monospace"
                        rows={2}
                        value={syntax}
                        onChange={(e) => setSyntax(e.target.value)}
                        required
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label text-muted small fw-bold">Description</label>
                    <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Explain functionality and parameter rules..."
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label text-muted small fw-bold">Code Example (Admin fills in)</label>
                    <textarea
                        className="form-control form-control-sm font-monospace"
                        rows={3}
                        value={example}
                        onChange={(e) => setExample(e.target.value)}
                        placeholder="e.g. const res = arr.find(x => x > 5);"
                    />
                </div>

                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label className="form-label text-muted small fw-bold">Expected Output (Console / Out)</label>
                        <input
                            type="text"
                            className="form-control form-control-sm font-monospace"
                            value={output}
                            onChange={(e) => setOutput(e.target.value)}
                            placeholder="e.g. 10"
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label text-muted small fw-bold">Return Value / Type</label>
                        <input
                            type="text"
                            className="form-control form-control-sm font-monospace"
                            value={returns}
                            onChange={(e) => setReturns(e.target.value)}
                            placeholder="e.g. element | undefined"
                        />
                    </div>
                </div>

                <div className="row g-3">
                    <div className="col-md-6">
                        <label className="form-label text-muted small fw-bold">Official Documentation Link</label>
                        <input
                            type="url"
                            className="form-control form-control-sm"
                            value={docLink}
                            onChange={(e) => setDocLink(e.target.value)}
                            placeholder="https://..."
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label text-muted small fw-bold">Tags (comma-separated)</label>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="array, search, modern"
                        />
                    </div>
                </div>
            </div>

            {/* Bottom publish trigger */}
            <div className="d-flex justify-content-end align-items-center gap-2">
                <button
                    type="button"
                    className="btn btn-outline-danger btn-sm px-3"
                    onClick={handleReject}
                    disabled={isBusy}
                >
                    {isRejecting ? 'Rejecting...' : '✕ Reject'}
                </button>
                <button
                    type="button"
                    className="btn btn-success btn-sm px-4"
                    onClick={handleApprove}
                    disabled={isBusy}
                >
                    {isApproving ? 'Publishing...' : '✓ Approve & Publish to Database'}
                </button>
            </div>
        </div>
    );
}

export default function Admin() {
    const [pending, setPending] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [feedback, setFeedback] = useState({ text: '', type: '' });

    const fetchPending = () => {
        setLoading(true);
        Promise.all([
            fetch('/api/admin/pending', { credentials: 'include' }).then((r) => r.json()),
            fetch('/api/languages', { credentials: 'include' }).then((r) => r.json())
        ])
            .then(([pendingData, langData]) => {
                setPending(pendingData.pending || []);
                setLanguages(langData.languages || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleReview = async (id, action, enrichedData = {}) => {
        setActionLoading((prev) => ({ ...prev, [id]: action }));
        setFeedback({ text: '', type: '' });

        try {
            const res = await fetch('/api/admin/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    id,
                    action,
                    ...enrichedData
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setFeedback({
                    text: data.message || `Submission ${action === 'approve' ? 'approved & published' : 'rejected'}.`,
                    type: action === 'approve' ? 'success' : 'warning'
                });
                setPending((prev) => prev.filter((item) => item.id !== id));
            } else {
                setFeedback({
                    text: data.error || 'Failed to process action.',
                    type: 'danger'
                });
            }
        } catch (err) {
            console.error('Review error:', err);
            setFeedback({
                text: 'Network error processing review action.',
                type: 'danger'
            });
        } finally {
            setActionLoading((prev) => ({ ...prev, [id]: null }));
        }
    };

    if (loading) {
        return (
            <div className="text-center my-5 py-5">
                <div className="spinner-border text-warning" role="status">
                    <span className="visually-hidden">Loading pending submissions...</span>
                </div>
                <p className="text-secondary mt-3">Loading pending syntax submissions...</p>
            </div>
        );
    }

    return (
        <div className="my-4">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h1 className="h3 fw-bold text-dark mb-1">
                        🛡️ Admin Panel &mdash; Syntax Verification & Publishing
                    </h1>
                    <p className="text-secondary small mb-0">
                        Users suggest syntax. Admin enriches with examples, difficulty, output, and publishes.
                    </p>
                </div>
                <div className="d-flex gap-2 align-items-center">
                    <span className="badge bg-warning bg-opacity-25 text-warning border border-warning px-3 py-2 fs-6">
                        {pending.length} Pending
                    </span>
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={fetchPending}
                        title="Refresh submissions"
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {feedback.text && (
                <div
                    className={`alert alert-${feedback.type} alert-dismissible fade show shadow-sm mb-4`}
                    role="alert"
                >
                    <span className="fw-bold me-2">
                        {feedback.type === 'success' ? '✓' : feedback.type === 'warning' ? '✕' : '⚠️'}
                    </span>
                    {feedback.text}
                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setFeedback({ text: '', type: '' })}
                        aria-label="Close"
                    ></button>
                </div>
            )}

            {pending.length > 0 ? (
                <div className="d-flex flex-column gap-4" id="admin-pending-container">
                    {pending.map((item) => (
                        <PendingCard
                            key={item.id}
                            item={item}
                            languages={languages}
                            onReview={handleReview}
                            isBusy={actionLoading[item.id] === 'approve' || actionLoading[item.id] === 'reject'}
                            isApproving={actionLoading[item.id] === 'approve'}
                            isRejecting={actionLoading[item.id] === 'reject'}
                        />
                    ))}
                </div>
            ) : (
                <div className="card p-5 text-center shadow-sm">
                    <span className="display-4 text-success mb-2 d-block">✓</span>
                    <h2 className="h4 fw-bold text-dark mb-1">Queue is Empty</h2>
                    <p className="text-secondary small mb-3">
                        There are no pending syntax submissions awaiting verification.
                    </p>
                    <div>
                        <Link to="/languages" className="btn btn-outline-success btn-sm px-3">
                            &larr; View Languages
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
