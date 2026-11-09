const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from parent root .env or current dir
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const express = require('express');
const cookieSession = require('cookie-session');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const {
    supabaseContentGet,
    supabaseContentPost,
    supabaseContentPatch,
    supabaseContentDelete,
    supabaseContentGetCount,
    getUser,
    getEmail,
    createUser
} = require('./utils/supabase');

const { verifyPassword, hashPassword } = require('./utils/auth');
const { sendEmailAsync } = require('./utils/email');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.SECRET_KEY;
if (!SECRET_KEY) {
    console.warn('WARNING: SECRET_KEY is missing from environment variables!');
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const ADMIN_EMAIL = process.env.MAIL_FROM || process.env.SMTP_USER;

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration for React dev server
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // Allow during development
        }
    },
    credentials: true
}));

// Stateless client-side cookie session matching Flask's session behavior and compatible with Vercel serverless
app.use(cookieSession({
    name: 'session',
    keys: [SECRET_KEY || 'devsearch_default_session_secret_12345'],
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
}));

// In-memory TTL cache for languages list (matches Flask implementation)
const _LANG_CACHE = {
    data: null,
    timestamp: 0
};
const CACHE_TTL = 300; // 5 minutes in seconds

// In-memory 2-hour TTL cache for language syntax items (hash map cache)
const _SYNTAX_CACHE = {}; // language -> { data: formattedResults, timestamp: number }
const SYNTAX_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours in ms

async function getCachedLanguages() {
    const now = Math.floor(Date.now() / 1000);
    if (_LANG_CACHE.data && (now - _LANG_CACHE.timestamp < CACHE_TTL)) {
        return _LANG_CACHE.data;
    }

    const langs = await supabaseContentGet('languages');
    const langList = [];

    for (const lang of langs) {
        const tableName = `${lang.id.replace(/-/g, '_').replace(/\+/g, 'pp')}_syntax`;
        const count = await supabaseContentGetCount(tableName);
        langList.push({
            ...lang,
            count
        });
    }

    _LANG_CACHE.data = langList;
    _LANG_CACHE.timestamp = now;
    return langList;
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Unauthorized', authenticated: false });
    }
    next();
}

// Admin middleware
function requireAdmin(req, res, next) {
    if (!req.session || req.session.user !== ADMIN_USERNAME) {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
}

// --- AUTH ROUTES ---

// Current auth status
app.get('/api/auth/me', (req, res) => {
    if (req.session && req.session.user) {
        return res.json({
            authenticated: true,
            user: req.session.user,
            isAdmin: req.session.user === ADMIN_USERNAME,
            currentLanguage: req.session.language || null
        });
    }
    return res.json({
        authenticated: false,
        user: null,
        isAdmin: false,
        currentLanguage: null
    });
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { username = '', password = '' } = req.body;
    const cleanIdentifier = username.trim();

    if (!cleanIdentifier) {
        return res.status(400).json({ error: 'Please provide your username or email.' });
    }
    if (!password) {
        return res.status(400).json({ error: 'Please provide password.' });
    }

    // Check for Admin (matches ADMIN_USERNAME or configured admin email)
    const isAdminIdentifier = cleanIdentifier.toLowerCase() === (ADMIN_USERNAME || '').toLowerCase()
        || (ADMIN_EMAIL && cleanIdentifier.toLowerCase() === ADMIN_EMAIL.toLowerCase());

    if (isAdminIdentifier) {
        if (verifyPassword(password, ADMIN_PASSWORD_HASH || '')) {
            req.session.user = ADMIN_USERNAME;
            return res.json({
                success: true,
                user: ADMIN_USERNAME,
                isAdmin: true
            });
        } else {
            return res.status(401).json({ error: 'Invalid password. Please try again.' });
        }
    }

    // Check Standard User: Try username first, then email (case-insensitive)
    let user = await getUser(cleanIdentifier);
    if (!user) {
        user = await getEmail(cleanIdentifier);
    }

    if (!user) {
        return res.status(401).json({ error: 'Account not found. Please check your username or email, or register.' });
    }

    if (verifyPassword(password, user.password_hash)) {
        req.session.user = user.username;
        return res.json({
            success: true,
            user: user.username,
            isAdmin: false
        });
    }

    return res.status(401).json({ error: 'Invalid password. Please try again.' });
});

// Register
app.post('/api/auth/register', async (req, res) => {
    const { username = '', email = '', password = '' } = req.body;
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername) {
        return res.status(400).json({ error: 'Username is required.' });
    }
    if (!cleanEmail) {
        return res.status(400).json({ error: 'Email is required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!password) {
        return res.status(400).json({ error: 'Password is required.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const existingUser = await getUser(cleanUsername);
    const existingEmail = await getEmail(cleanEmail);

    if (existingUser) {
        return res.status(400).json({ error: 'Username already exists. Choose another.' });
    }
    if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists. Choose another or login.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in session temporarily
    req.session.temp_user = {
        username: cleanUsername,
        email: cleanEmail,
        password_hash: hashPassword(password),
        otp
    };

    // Send OTP email (awaited so serverless execution context does not freeze before delivery)
    try {
        await sendEmailAsync(cleanEmail, 'DevSearch Verification Code', `Your verification code is: ${otp}`);
    } catch (emailErr) {
        console.error('Failed to dispatch registration OTP email:', emailErr);
    }

    return res.json({
        success: true,
        message: 'Verification code sent to your email.'
    });
});

// Resend OTP
app.post('/api/auth/resend_otp', async (req, res) => {
    if (!req.session || !req.session.temp_user) {
        return res.status(400).json({ error: 'No pending registration session found. Please register again.' });
    }

    const tempUser = req.session.temp_user;
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    req.session.temp_user.otp = newOtp;

    try {
        await sendEmailAsync(tempUser.email, 'DevSearch Verification Code', `Your new verification code is: ${newOtp}`);
    } catch (emailErr) {
        console.error('Failed to dispatch resend OTP email:', emailErr);
    }

    return res.json({
        success: true,
        message: 'A new verification code has been sent to your email.'
    });
});

// Verify OTP
app.post('/api/auth/verify_otp', async (req, res) => {
    if (!req.session || !req.session.temp_user) {
        return res.status(400).json({ error: 'No pending registration session found. Please register again.' });
    }

    const { otp } = req.body;
    const tempUser = req.session.temp_user;

    if (otp && otp.trim() === tempUser.otp) {
        const created = await createUser(tempUser.username, tempUser.email, tempUser.password_hash);
        if (created) {
            req.session.user = tempUser.username;
            delete req.session.temp_user;
            return res.json({
                success: true,
                user: req.session.user
            });
        } else {
            return res.status(500).json({ error: 'Registration failed during user creation in database.' });
        }
    }

    return res.status(400).json({ error: 'Invalid verification code.' });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session = null;
    res.clearCookie('session');
    res.clearCookie('connect.sid');
    return res.json({ success: true });
});

// --- CORE APP ROUTES ---

// Languages list
app.get('/api/languages', requireAuth, async (req, res) => {
    try {
        const langList = await getCachedLanguages();
        return res.json({ languages: langList });
    } catch (err) {
        console.error('Failed to get languages:', err);
        return res.status(500).json({ error: 'Failed to load languages' });
    }
});

// Select active language in session
app.post('/api/languages/select', requireAuth, (req, res) => {
    const { language } = req.body;
    if (language) {
        req.session.language = language.toLowerCase();
    }
    return res.json({ success: true, language: req.session.language });
});

// Helper to get language syntax from 2-hour in-memory cache or Supabase
async function getCachedLanguageSyntax(language) {
    const langKey = language.toLowerCase();
    const now = Date.now();
    if (_SYNTAX_CACHE[langKey] && (now - _SYNTAX_CACHE[langKey].timestamp < SYNTAX_CACHE_TTL_MS)) {
        return _SYNTAX_CACHE[langKey].data;
    }

    const tableName = `${langKey.replace(/-/g, '_').replace(/\+/g, 'pp')}_syntax`;
    const entries = await supabaseContentGet(tableName);

    const formatted = entries.map(entry => ({
        id: entry.id,
        title: entry.title,
        syntax: entry.syntax,
        description: entry.description,
        example: entry.example,
        output: entry.output,
        returns: entry.returns,
        difficulty: entry.difficulty || 'general',
        tags: entry.tags ? entry.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        doc_link: entry.doc_link,
        parameters: []
    }));

    _SYNTAX_CACHE[langKey] = {
        data: formatted,
        timestamp: now
    };

    return formatted;
}

// Language syntax search / cheatsheet entries
app.get('/api/languages/:language', requireAuth, async (req, res) => {
    const language = (req.params.language || '').toLowerCase();

    const cachedLangs = await getCachedLanguages();
    const langRow = cachedLangs.find(l => l.id.toLowerCase() === language);

    if (!langRow) {
        return res.status(404).json({ error: `Language '${language}' not found.` });
    }

    req.session.language = language;
    const query = (req.query.q || '').trim().toLowerCase();

    const entries = await getCachedLanguageSyntax(language);
    let results = entries;

    if (query) {
        results = entries.filter(e => {
            const inFields = ['title', 'syntax', 'description', 'example'].some(k => {
                const val = e[k];
                return val ? String(val).toLowerCase().includes(query) : false;
            });
            const inTags = e.tags && e.tags.some(t => t.toLowerCase().includes(query));
            return inFields || inTags;
        });
    }

    return res.json({
        language,
        lang_name: langRow.name,
        query,
        count: results.length,
        results
    });
});

// Flask legacy API compatibility endpoint: /api/<language>/search
app.get('/api/:language/search', requireAuth, async (req, res) => {
    const language = (req.params.language || '').toLowerCase();
    const cachedLangs = await getCachedLanguages();
    const langRow = cachedLangs.find(l => l.id.toLowerCase() === language);

    if (!langRow) {
        return res.status(404).json({ error: `Language '${language}' not found` });
    }

    const query = (req.query.q || '').trim().toLowerCase();
    const entries = await getCachedLanguageSyntax(language);

    let results = entries;
    if (query) {
        results = entries.filter(e => {
            const inFields = ['title', 'syntax', 'description', 'example'].some(k => {
                const val = e[k];
                return val ? String(val).toLowerCase().includes(query) : false;
            });
            const inTags = e.tags && e.tags.some(t => t.toLowerCase().includes(query));
            return inFields || inTags;
        });
    }

    return res.json({
        language,
        lang_name: langRow.name || language,
        count: results.length,
        results
    });
});

// User Profile
app.get('/api/user/profile', requireAuth, async (req, res) => {
    const user = await getUser(req.session.user);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
        username: user.username,
        email: user.email,
        created_at: user.created_at || null
    });
});

// Add Syntax (Submitted by user, goes to pending_entries for admin approval)
app.post('/api/syntax/add', requireAuth, async (req, res) => {
    const {
        language = '',
        title = '',
        syntax = '',
        description = '',
        example = '',
        output = '',
        returns = '',
        difficulty = 'beginner',
        tags = '',
        doc_link = ''
    } = req.body;

    const cleanLanguage = language.trim().toLowerCase();
    const cleanTitle = title.trim();
    const cleanSyntax = syntax.trim();

    if (!cleanLanguage) {
        return res.status(400).json({ error: 'Please select a programming language.' });
    }
    if (!cleanTitle) {
        return res.status(400).json({ error: 'Title is required.' });
    }
    if (!cleanSyntax) {
        return res.status(400).json({ error: 'Syntax signature is required.' });
    }

    const data = {
        language: cleanLanguage,
        title: cleanTitle,
        syntax: cleanSyntax,
        description: description.trim(),
        example: example.trim(),
        output: output.trim(),
        returns: returns.trim(),
        difficulty: ['beginner', 'intermediate', 'advanced'].includes(difficulty) ? difficulty : 'beginner',
        tags: tags.trim(),
        doc_link: doc_link.trim(),
        submitted_by: req.session.user,
        status: 'pending'
    };

    const saved = await supabaseContentPost('pending_entries', data);
    if (saved) {
        return res.json({
            success: true,
            message: 'Submission received! Your syntax was submitted for admin verification and approval.'
        });
    } else {
        return res.status(500).json({ error: 'Failed to record submission in database. Please try again.' });
    }
});

// Admin: Get submissions (support filtering by status: 'pending', 'approved', 'rejected', or 'all')
app.get('/api/admin/pending', requireAuth, requireAdmin, async (req, res) => {
    try {
        const statusFilter = (req.query.status || 'pending').toLowerCase();
        const queryParams = { order: 'id.desc' };
        if (statusFilter !== 'all') {
            queryParams.status = `eq.${statusFilter}`;
        }
        const pending = await supabaseContentGet('pending_entries', queryParams);
        return res.json({ pending: pending || [] });
    } catch (err) {
        console.error('Failed to get pending additions:', err);
        return res.status(500).json({ error: 'Failed to load pending submissions.' });
    }
});

// Admin: Review submission (approve or reject)
app.post('/api/admin/review', requireAuth, requireAdmin, async (req, res) => {
    const { id, action } = req.body;
    if (!id || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action or missing submission ID.' });
    }

    try {
        const entries = await supabaseContentGet('pending_entries', { id: `eq.${id}` });
        if (!entries || entries.length === 0) {
            return res.status(404).json({ error: 'Pending submission not found.' });
        }
        const entry = entries[0];

        if (action === 'approve') {
            const finalLanguage = (req.body.language || entry.language || '').toLowerCase().trim();
            const tableName = `${finalLanguage.replace(/-/g, '_').replace(/\+/g, 'pp')}_syntax`;

            // Calculate next safe ID in case Postgres auto-increment sequence is un-synced
            const maxRows = await supabaseContentGet(tableName, {
                select: 'id',
                order: 'id.desc',
                limit: 1
            });
            const nextId = (maxRows && maxRows[0] && typeof maxRows[0].id === 'number')
                ? maxRows[0].id + 1
                : undefined;

            const syntaxPayload = {
                title: (req.body.title !== undefined ? req.body.title : entry.title).trim(),
                syntax: (req.body.syntax !== undefined ? req.body.syntax : entry.syntax).trim(),
                description: (req.body.description !== undefined ? req.body.description : (entry.description || '')).trim(),
                example: (req.body.example !== undefined ? req.body.example : (entry.example || '')).trim(),
                output: (req.body.output !== undefined ? req.body.output : (entry.output || '')).trim(),
                returns: (req.body.returns !== undefined ? req.body.returns : (entry.returns || '')).trim(),
                difficulty: req.body.difficulty || entry.difficulty || 'beginner',
                tags: (req.body.tags !== undefined ? req.body.tags : (entry.tags || '')).trim(),
                doc_link: (req.body.doc_link !== undefined ? req.body.doc_link : (entry.doc_link || '')).trim()
            };
            if (nextId) {
                syntaxPayload.id = nextId;
            }

            // Insert into official language syntax table
            const inserted = await supabaseContentPost(tableName, syntaxPayload);

            if (!inserted) {
                return res.status(500).json({ error: `Failed to insert syntax into ${tableName}.` });
            }

            // Update pending status to approved
            await supabaseContentPatch('pending_entries', { id: `eq.${id}` }, { status: 'approved' });

            // Clear in-memory cache so updates show up immediately
            delete _SYNTAX_CACHE[finalLanguage];
            _LANG_CACHE.data = null;

            return res.json({
                success: true,
                message: `Submission "${syntaxPayload.title}" approved and published to ${finalLanguage}!`
            });
        } else {
            // Update pending status to rejected
            await supabaseContentPatch('pending_entries', { id: `eq.${id}` }, { status: 'rejected' });

            return res.json({
                success: true,
                message: `Submission "${entry.title}" rejected.`
            });
        }
    } catch (err) {
        console.error('Review action failed:', err);
        return res.status(500).json({ error: 'Failed to process review action.' });
    }
});

// Serve frontend static build in production
const clientBuildPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));
app.use((req, res) => {
    const indexPath = path.join(clientBuildPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(404).json({ error: 'Not found' });
        }
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`⚡ DevSearch Express server listening on http://127.0.0.1:${PORT}`);
    });
}

module.exports = app;
