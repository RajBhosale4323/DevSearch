const AUTH_URL = (process.env.AUTH_SUPABASE_URL || '').replace(/\/$/, '');
const AUTH_KEY = process.env.AUTH_SUPABASE_KEY || '';

const CONTENT_URL = (process.env.CONTENT_SUPABASE_URL || '').replace(/\/$/, '');
const CONTENT_KEY = process.env.CONTENT_SUPABASE_KEY || '';

function supabaseAuthHeaders() {
    return {
        'apikey': AUTH_KEY,
        'Authorization': `Bearer ${AUTH_KEY}`,
        'Content-Type': 'application/json'
    };
}

function supabaseContentHeaders() {
    return {
        'apikey': CONTENT_KEY,
        'Authorization': `Bearer ${CONTENT_KEY}`,
        'Content-Type': 'application/json'
    };
}

async function supabaseContentGet(table, queryParams = {}) {
    if (!CONTENT_URL || !CONTENT_KEY) return [];
    try {
        let url = `${CONTENT_URL}/rest/v1/${table}`;
        const params = new URLSearchParams();
        for (const [key, val] of Object.entries(queryParams)) {
            if (val !== undefined && val !== null) {
                params.append(key, val);
            }
        }
        const qs = params.toString();
        if (qs) url += `?${qs}`;

        const res = await fetch(url, {
            headers: supabaseContentHeaders(),
            signal: AbortSignal.timeout(10000)
        });

        if (res.status === 200) {
            return await res.json();
        }
        return [];
    } catch (err) {
        console.error(`Error fetching table ${table}:`, err.message);
        return [];
    }
}

async function supabaseContentPost(table, data) {
    if (!CONTENT_URL || !CONTENT_KEY) return false;
    try {
        const res = await fetch(`${CONTENT_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: supabaseContentHeaders(),
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(10000)
        });
        return res.status === 200 || res.status === 201;
    } catch (err) {
        console.error(`Error posting to table ${table}:`, err.message);
        return false;
    }
}

async function supabaseContentDelete(table, queryParams = {}) {
    if (!CONTENT_URL || !CONTENT_KEY) return false;
    try {
        let url = `${CONTENT_URL}/rest/v1/${table}`;
        const params = new URLSearchParams();
        for (const [key, val] of Object.entries(queryParams)) {
            if (val !== undefined && val !== null) {
                params.append(key, val);
            }
        }
        const qs = params.toString();
        if (qs) url += `?${qs}`;

        const res = await fetch(url, {
            method: 'DELETE',
            headers: supabaseContentHeaders(),
            signal: AbortSignal.timeout(10000)
        });
        return res.status === 200 || res.status === 204;
    } catch (err) {
        console.error(`Error deleting from table ${table}:`, err.message);
        return false;
    }
}

async function supabaseContentPatch(table, queryParams = {}, data = {}) {
    if (!CONTENT_URL || !CONTENT_KEY) return false;
    try {
        let url = `${CONTENT_URL}/rest/v1/${table}`;
        const params = new URLSearchParams();
        for (const [key, val] of Object.entries(queryParams)) {
            if (val !== undefined && val !== null) {
                params.append(key, val);
            }
        }
        const qs = params.toString();
        if (qs) url += `?${qs}`;

        const res = await fetch(url, {
            method: 'PATCH',
            headers: supabaseContentHeaders(),
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(10000)
        });
        return res.status === 200 || res.status === 204;
    } catch (err) {
        console.error(`Error patching table ${table}:`, err.message);
        return false;
    }
}

async function supabaseContentGetCount(table) {
    if (!CONTENT_URL || !CONTENT_KEY) return 0;
    try {
        const headers = supabaseContentHeaders();
        headers['Prefer'] = 'count=exact';
        const res = await fetch(`${CONTENT_URL}/rest/v1/${table}?select=id&limit=1`, {
            headers,
            signal: AbortSignal.timeout(10000)
        });

        if (res.status === 200) {
            const range = res.headers.get('content-range') || '';
            if (range.includes('/')) {
                const count = parseInt(range.split('/')[1], 10);
                return isNaN(count) ? 0 : count;
            }
        }
        return 0;
    } catch (err) {
        console.error(`Error getting count for table ${table}:`, err.message);
        return 0;
    }
}

async function getUser(username) {
    if (!AUTH_URL || !AUTH_KEY || !username) return null;
    const cleanUsername = username.trim();
    try {
        const res = await fetch(
            `${AUTH_URL}/rest/v1/users?username=ilike.${encodeURIComponent(cleanUsername)}&select=*`,
            {
                headers: supabaseAuthHeaders(),
                signal: AbortSignal.timeout(10000)
            }
        );
        if (res.status === 200) {
            const data = await res.json();
            return data && data.length > 0 ? data[0] : null;
        }
    } catch (err) {
        console.error('Error fetching user:', err.message);
    }
    return null;
}

async function getEmail(email) {
    if (!AUTH_URL || !AUTH_KEY || !email) return null;
    const cleanEmail = email.trim().toLowerCase();
    try {
        const res = await fetch(
            `${AUTH_URL}/rest/v1/users?email=ilike.${encodeURIComponent(cleanEmail)}&select=*`,
            {
                headers: supabaseAuthHeaders(),
                signal: AbortSignal.timeout(10000)
            }
        );
        if (res.status === 200) {
            const data = await res.json();
            return data && data.length > 0 ? data[0] : null;
        }
    } catch (err) {
        console.error('Error fetching email:', err.message);
    }
    return null;
}

async function createUser(username, email, passwordHash) {
    if (!AUTH_URL || !AUTH_KEY) return false;
    try {
        const headers = supabaseAuthHeaders();
        headers['Prefer'] = 'return=representation';
        const res = await fetch(`${AUTH_URL}/rest/v1/users`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                username: username.trim(),
                email: email.trim().toLowerCase(),
                password_hash: passwordHash,
                email_verified: true
            }),
            signal: AbortSignal.timeout(10000)
        });
        return res.status === 200 || res.status === 201;
    } catch (err) {
        console.error('Error creating user:', err.message);
        return false;
    }
}

module.exports = {
    supabaseContentGet,
    supabaseContentPost,
    supabaseContentPatch,
    supabaseContentDelete,
    supabaseContentGetCount,
    getUser,
    getEmail,
    createUser
};
