import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/user/profile', {
            credentials: 'include'
        })
            .then(res => res.json())
            .then(data => {
                setProfile(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="text-center my-5">
                <div className="spinner-border text-success" role="status"></div>
            </div>
        );
    }

    return (
        <div className="row justify-content-center my-5">
            <div className="col-md-6">
                <div className="card p-4 shadow-sm">
                    <h1 className="h3 fw-bold mb-4 text-dark">Your Profile</h1>
                    <div className="mb-3">
                        <span className="text-secondary small text-uppercase fw-bold d-block">Username</span>
                        <span className="fs-5">{profile?.username || user}</span>
                    </div>
                    {profile?.email && (
                        <div className="mb-3">
                            <span className="text-secondary small text-uppercase fw-bold d-block">Email</span>
                            <span className="fs-6">{profile.email}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
