import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';

export default function AddSyntax() {
    const { currentLanguage } = useAuth();
    const navigate = useNavigate();

    const [languages, setLanguages] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage || 'python');
    const [title, setTitle] = useState('');
    const [syntax, setSyntax] = useState('');
    const [description, setDescription] = useState('');

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch('/api/languages', { credentials: 'include' })
            .then((res) => res.json())
            .then((data) => {
                if (data.languages && data.languages.length > 0) {
                    setLanguages(data.languages);
                    setSelectedLanguage((prev) => prev || data.languages[0].id);
                }
            })
            .catch((err) => console.error('Error fetching languages:', err));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!selectedLanguage) {
            setError('Please select a programming language.');
            return;
        }
        if (!title.trim()) {
            setError('Please enter a function name or syntax title.');
            return;
        }
        if (!syntax.trim()) {
            setError('Please enter the syntax signature.');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/syntax/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    language: selectedLanguage,
                    title,
                    syntax,
                    description
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setMessage(data.message || 'Syntax proposal received! The admin will review, enrich, and publish it.');
                setTitle('');
                setSyntax('');
                setDescription('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setError(data.error || 'Failed to submit syntax.');
            }
        } catch (err) {
            console.error('Error submitting syntax:', err);
            setError('Network error. Failed to submit syntax.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <LoadingOverlay show={loading} message="Submitting syntax proposal..." />
            <div className="row justify-content-center my-4">
                <div className="col-lg-8 col-md-10">
                    <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
                        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                            <div>
                                <h1 className="h3 fw-bold text-dark mb-1">⚡ Suggest a Syntax Reference</h1>
                                <p className="text-secondary small mb-0">
                                    Just send any syntax or function. The admin will verify it, add code examples, difficulty, and publish it!
                                </p>
                            </div>
                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1">
                                Quick Suggestion
                            </span>
                        </div>

                        {message && (
                            <div className="alert alert-success py-3 shadow-sm d-flex align-items-center mb-4" role="alert">
                                <span className="fs-4 me-2">✓</span>
                                <div>{message}</div>
                            </div>
                        )}

                        {error && (
                            <div className="alert alert-danger py-2 small mb-4" role="alert">
                                {error}
                            </div>
                        )}

                        <div className="mb-3">
                            <label className="form-label text-muted small text-uppercase fw-bold">
                                Programming Language <span className="text-danger">*</span>
                            </label>
                            <select
                                className="form-control"
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                required
                            >
                                {languages.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.name}
                                    </option>
                                ))}
                                {languages.length === 0 && (
                                    <option value="python">Python</option>
                                )}
                            </select>
                        </div>

                        <div className="mb-3">
                            <label className="form-label text-muted small text-uppercase fw-bold">
                                Title / Function Name <span className="text-danger">*</span>
                            </label>
                            <input
                                type="text"
                                className="form-control font-monospace"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="e.g. Array.prototype.find() or dict.get()"
                                autoFocus
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label text-muted small text-uppercase fw-bold">
                                Syntax <span className="text-danger">*</span>
                            </label>
                            <textarea
                                className="form-control font-monospace"
                                value={syntax}
                                onChange={(e) => setSyntax(e.target.value)}
                                rows={2}
                                required
                                placeholder="e.g. find(predicateFn, thisArg) or dict.get(key, default=None)"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="form-label text-muted small text-uppercase fw-bold">
                                Short Description / Note (Optional)
                            </label>
                            <textarea
                                className="form-control"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                placeholder="What does this function do or why should it be added?"
                            />
                        </div>

                        <div className="d-flex justify-content-between align-items-center pt-3 border-top border-secondary border-opacity-10">
                            <button
                                type="submit"
                                className="btn btn-success px-4 py-2"
                                disabled={loading}
                            >
                                {loading ? 'Submitting...' : 'Send Suggestion →'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => navigate(-1)}
                            >
                                Back
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
