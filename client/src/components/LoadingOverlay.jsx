import React from 'react';

export default function LoadingOverlay({ show, message = 'Loading...' }) {
    if (!show) return null;

    return (
        <div
            id="loading-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 99999,
                animation: 'overlayFadeIn 0.2s ease-out'
            }}
        >
            <div className="loader"></div>
            <div className="loading-text mt-3">{message}</div>
            <div className="text-secondary small mt-1">Please wait a moment...</div>
        </div>
    );
}
