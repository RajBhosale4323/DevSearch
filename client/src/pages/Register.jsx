import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';

export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { user } = useAuth();
    const navigate = useNavigate();

    if (user) {
        return <Navigate to="/languages" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanUsername) {
            setError('Username is required.');
            return;
        }
        if (!cleanEmail) {
            setError('Email is required.');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            setError('Please enter a valid email address.');
            return;
        }
        if (!password) {
            setError('Password is required.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username: cleanUsername, email: cleanEmail, password })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                navigate('/verify_otp');
            } else {
                setError(data.error || 'Registration failed.');
            }
        } catch (err) {
            console.error('Registration error:', err);
            setError('Unable to connect to the server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <LoadingOverlay show={loading} message="Creating account & sending verification code..." />
            <div className="row justify-content-center mt-5">
                <div className="col-md-6 col-lg-5">
                <div className="card p-4 shadow-lg border-secondary">
                    <div className="text-center mb-4">
                        <h1 className="h3 fw-bold text-dark">Create Account</h1>
                        <p className="text-secondary small">Register to start using DevSearch</p>
                    </div>

                    {error && (
                        <div className="alert alert-danger py-2 small" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label text-muted small text-uppercase fw-bold">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                placeholder="Choose a username"
                                className="form-control py-2"
                                autoComplete="off"
                                autoFocus
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label text-muted small text-uppercase fw-bold">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="your@email.com"
                                className="form-control py-2"
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label text-muted small text-uppercase fw-bold">
                                Password (min 8 chars)
                            </label>
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
                            {loading ? 'Sending Verification Code...' : 'Register →'}
                        </button>
                        <div className="text-center">
                            <span className="text-muted small">Already have an account? </span>
                            <Link to="/login" className="text-success text-decoration-none small fw-bold">
                                Login here
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </>
);
}
