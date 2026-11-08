const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Verify a password against Werkzeug scrypt, bcrypt, or plain hash
 * Werkzeug scrypt format: scrypt:32768:8:1$salt$digest
 */
function verifyPassword(password, storedHash) {
    if (!storedHash || !password) return false;

    try {
        if (storedHash.startsWith('scrypt:')) {
            const parts = storedHash.split('$');
            if (parts.length !== 3) return false;
            
            const [method, salt, hash] = parts;
            const [_, N, r, p] = method.split(':').map(Number);
            
            const hashBuffer = Buffer.from(hash, 'hex');
            const derived = crypto.scryptSync(password, salt, hashBuffer.length, {
                N: N || 32768,
                r: r || 8,
                p: p || 1,
                maxmem: 128 * 1024 * 1024
            });

            return crypto.timingSafeEqual(derived, hashBuffer);
        }

        if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
            return bcrypt.compareSync(password, storedHash);
        }

        // Generic fallback or direct match (if ever unhashed)
        return password === storedHash;
    } catch (err) {
        console.error('Password verification error:', err);
        return false;
    }
}

/**
 * Hash password using Werkzeug-compatible scrypt so it can be verified
 * both here and in Python if needed.
 */
function hashPassword(password) {
    const N = 32768;
    const r = 8;
    const p = 1;
    const salt = crypto.randomBytes(8).toString('hex'); // 16 characters
    const derived = crypto.scryptSync(password, salt, 64, {
        N,
        r,
        p,
        maxmem: 128 * 1024 * 1024
    });
    return `scrypt:${N}:${r}:${p}$${salt}$${derived.toString('hex')}`;
}

module.exports = {
    verifyPassword,
    hashPassword
};
