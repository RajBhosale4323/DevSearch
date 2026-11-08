import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { user, login } = useAuth();
    const navigate = useNavigate();

    if (user) {
        return <Navigate to="/languages" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim()) {
            setError('Please provide username.');
            return;
        }
        if (!password) {
            setError('Please provide password.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                login(data.user, data.isAdmin);
                if (data.isAdmin) {
                    navigate('/admin');
                } else {
                    navigate('/languages');
                }
            } else {
                setError(data.error || 'Invalid username or password.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Unable to connect to the server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <LoadingOverlay show={loading} message="Logging in to DevSearch..." />
            <div className="row justify-content-center mt-5">
                <div className="col-md-6 col-lg-5">
                <div className="card p-4 shadow-lg border-secondary">
                    <div className="text-center mb-4">
                        <h1 className="h3 fw-bold text-dark">Welcome to DevSearch</h1>
                        <p className="text-secondary small">Enter your credentials to start your session</p>
                    </div>

                    {error && (
                        <div className="alert alert-danger py-2 small" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label text-muted small text-uppercase fw-bold">Username or Email</label>
                            <input
                                type="text"
                                name="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                placeholder="Enter your username or email"
                                className="form-control py-2"
                                autoFocus
                                autoComplete="username"
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label text-muted small text-uppercase fw-bold">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="form-control py-2"
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-success w-100 py-2 mb-3"
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Login →'}
                        </button>
                        <div className="text-center">
                            <span className="text-muted small">Don't have an account? </span>
                            <Link to="/register" className="text-success text-decoration-none small fw-bold">
                                Register here
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </>
);
}
