import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOtp from './pages/VerifyOtp';
import Languages from './pages/Languages';
import LanguageSearch from './pages/LanguageSearch';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import AddSyntax from './pages/AddSyntax';
import NotFound from './pages/NotFound';

function RootRedirect() {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center my-5 py-5">
                <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }
    return user ? <Navigate to="/languages" replace /> : <Navigate to="/login" replace />;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <div className="d-flex flex-column min-vh-100">
                    <Navbar />
                    <main className="container my-5 flex-grow-1" style={{ maxWidth: '900px' }}>
                        <Routes>
                            <Route path="/" element={<RootRedirect />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/verify_otp" element={<VerifyOtp />} />

                            <Route
                                path="/languages"
                                element={
                                    <ProtectedRoute>
                                        <Languages />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/profile"
                                element={
                                    <ProtectedRoute>
                                        <Profile />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute adminOnly>
                                        <Admin />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/add_syntax"
                                element={
                                    <ProtectedRoute>
                                        <AddSyntax />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/:language"
                                element={
                                    <ProtectedRoute>
                                        <LanguageSearch />
                                    </ProtectedRoute>
                                }
                            />

                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </main>
                    <Footer />
                </div>
            </BrowserRouter>
        </AuthProvider>
    );
}
