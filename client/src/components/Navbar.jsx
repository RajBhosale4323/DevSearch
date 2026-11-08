import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, isAdmin, currentLanguage, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async (e) => {
        e.preventDefault();
        await logout();
        navigate('/login');
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark px-4 py-3 shadow-sm">
            <div className="container-fluid">
                <Link className="navbar-brand fw-bold text-success" to="/">
                    ⚡ DevSearch
                </Link>
                <div className="d-flex align-items-center gap-3">
                    {user ? (
                        <>
                            <Link to="/profile" className="text-decoration-none text-white-50 small">
                                👤 <strong className="text-white">{user}</strong>
                            </Link>

                            {isAdmin && (
                                <Link to="/admin" className="btn btn-outline-warning btn-sm">
                                    Admin
                                </Link>
                            )}

                            {currentLanguage && (
                                <>
                                    <Link
                                        to={`/${currentLanguage}`}
                                        className="badge bg-success bg-opacity-25 text-success border border-success text-decoration-none p-2"
                                    >
                                        Lang: {currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1)}
                                    </Link>
                                    <Link to="/languages" className="small text-info text-decoration-underline">
                                        Change
                                    </Link>
                                </>
                            )}

                            <button onClick={handleLogout} className="btn btn-outline-danger btn-sm">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-outline-success btn-sm">
                                Login
                            </Link>
                            <Link to="/register" className="btn btn-success btn-sm">
                                Register
                            </Link>
                        </>
                    )}

                    <Link to="/add_syntax" className="btn btn-outline-primary btn-sm">
                        Add Syntax
                    </Link>
                </div>
            </div>
        </nav>
    );
}
