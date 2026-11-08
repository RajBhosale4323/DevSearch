import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';

export default function VerifyOtp() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [infoMsg, setInfoMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(30);

    const inputRefs = useRef([]);
    const { login } = useAuth();
    const navigate = useNavigate();

    // Timer countdown for resending OTP
    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleChange = (index, value) => {
        if (value && !/^\d+$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value ? value.slice(-1) : '';
        setOtp(newOtp);

        // Auto-advance
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto submit if all 6 filled
        const full = newOtp.join('');
        if (full.length === 6) {
            submitOtp(full);
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim().slice(0, 6);
        if (/^\d+$/.test(pastedData)) {
            const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
            setOtp(newOtp);
            if (pastedData.length === 6) {
                submitOtp(pastedData);
            } else {
                inputRefs.current[pastedData.length]?.focus();
            }
        }
    };

    const submitOtp = async (codeToSubmit) => {
        setError('');
        setInfoMsg('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify_otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ otp: codeToSubmit })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                login(data.user, false);
                navigate('/languages');
            } else {
                setError(data.error || 'Invalid verification code.');
            }
        } catch (err) {
            console.error('OTP error:', err);
            setError('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0 || resending) return;

        setError('');
        setInfoMsg('');
        setResending(true);

        try {
            const res = await fetch('/api/auth/resend_otp', {
                method: 'POST',
                credentials: 'include'
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setInfoMsg(data.message || 'A new code has been sent to your email.');
                setCountdown(30);
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            } else {
                setError(data.error || 'Failed to resend code.');
            }
        } catch (err) {
            console.error('Resend error:', err);
            setError('Network error. Failed to resend code.');
        } finally {
            setResending(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const fullOtp = otp.join('');
        if (fullOtp.length < 6) {
            setError('Please enter all 6 digits.');
            return;
        }
        submitOtp(fullOtp);
    };

    return (
        <>
            <LoadingOverlay show={loading} message="Verifying code & completing registration..." />
            <div className="row justify-content-center mt-5">
                <div className="col-md-8 col-lg-6">
                    <div className="card p-4 shadow-lg border-primary">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <Link to="/register" className="btn btn-outline-secondary btn-sm">
                                &larr; Back to Register
                            </Link>
                            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1">
                                Step 2 of 2
                            </span>
                        </div>

                        <div className="text-center mb-4">
                            <h1 className="h3 fw-bold text-dark">Verify Email</h1>
                            <p className="text-secondary small">
                                Enter the 6-digit verification code sent to your email.
                            </p>
                        </div>

                        {error && (
                            <div className="alert alert-danger py-2 small" role="alert">
                                {error}
                            </div>
                        )}

                        {infoMsg && (
                            <div className="alert alert-success py-2 small" role="alert">
                                {infoMsg}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="d-flex justify-content-center gap-2 mb-4" onPaste={handlePaste}>
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => (inputRefs.current[index] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        className="form-control text-center fs-3 fw-bold otp-input"
                                        style={{
                                            width: '50px',
                                            height: '55px',
                                            border: '2px solid #1d4ed8',
                                            fontSize: '1.5rem !important'
                                        }}
                                        autoFocus={index === 0}
                                        required
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary w-100 py-2 mb-3"
                                disabled={loading}
                            >
                                {loading ? 'Verifying...' : 'Verify & Join'}
                            </button>

                            <div className="text-center pt-2 border-top border-secondary border-opacity-10">
                                <span className="text-muted small me-2">Didn't receive the code?</span>
                                {countdown > 0 ? (
                                    <span className="text-secondary small fst-italic">
                                        Resend code in {countdown}s
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn btn-link text-primary p-0 small fw-bold text-decoration-none"
                                        onClick={handleResend}
                                        disabled={resending}
                                    >
                                        {resending ? 'Sending...' : 'Resend Code'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
