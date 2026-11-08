import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentLanguage, setCurrentLanguage] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/auth/me', {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                if (data.authenticated) {
                    setUser(data.user);
                    setIsAdmin(data.isAdmin || false);
                    setCurrentLanguage(data.currentLanguage || null);
                } else {
                    setUser(null);
                    setIsAdmin(false);
                }
            } else {
                setUser(null);
                setIsAdmin(false);
            }
        } catch (err) {
            console.error('Failed to check auth state:', err);
            setUser(null);
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = (username, isUserAdmin) => {
        setUser(username);
        setIsAdmin(!!isUserAdmin);
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {
            console.error('Error during logout:', err);
        } finally {
            setUser(null);
            setIsAdmin(false);
            setCurrentLanguage(null);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAdmin,
            currentLanguage,
            setCurrentLanguage,
            loading,
            login,
            logout,
            checkAuth
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
