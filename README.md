# DevSearch ⚡

DevSearch is an interactive code syntax reference, parameter guide, and documentation search engine ported to **React (Vite)**, **Express.js (Node.js)**, **Supabase**, and **Bootstrap 5** paired with a custom handwritten student notebook aesthetic. It allows developers and students to securely authenticate, select across 14 programming languages, and instantly search or browse through structured syntax references with live code snippets, outputs/returns, and official documentation links.

---

## Architecture & Features

- **Frontend (`client/`)**: Built with **React 18 + Vite**, using React Router for seamless single-page navigation (`react-router-dom`), custom notebook aesthetic (`style.css`), Devicon, and FontAwesome icons.
- **Backend (`server/`)**: Built with **Express.js**, session management via `express-session`, password verification supporting Werkzeug `scrypt` and `bcrypt`, Nodemailer for OTP email dispatch, and in-memory TTL caching for fast Supabase querying.
- **Flask Backup**: Saved to `/home/raj/Desktop/DevSearch_flask_backup` (contains the original Flask application files, templates, and requirements).

### Core Features
- **User Authentication**: Secure session registration and login with cookie session tracking (`/login`, `/register`, `/logout`).
- **OTP Email Verification**: 6-digit numeric OTP code sent to user email upon registration.
- **14 Programming Languages**: Python, JavaScript, SQL (SQLite), C++, Go, Java, C#, C, TypeScript, Rust, Ruby, PHP, Swift, and Kotlin with live syntax counts.
- **Dynamic Instant Search**: Real-time client-side filtering as you type across titles, syntax statements, descriptions, and tags.
- **Difficulty Filter Pills**: Single-click filtering by difficulty level (`All`, `Beginner`, `Intermediate`, `Advanced`).
- **Interactive Tag Navigation**: Click any `#tag` badge to filter related syntax entries instantly.
- **1-Click Code Copy**: Clipboard copy button on every syntax definition and code example with animated feedback (`✓ Copied!`).
- **RESTful API**: Dedicated `/api/languages/:language` and `/api/:language/search` endpoints supporting `q`, `difficulty`, and `tag` queries.
- **Keyboard Shortcuts**: Quick search focus via `/` or `Ctrl+K`, instant clear with `Esc`.
- **Notebook UI Aesthetic**: Warm paper background, ruled lines, binder-hole accents, JetBrains Mono code blocks, and high-contrast typography.

---

## Project Structure

```text
DevSearch/
├── client/                 # React (Vite) Frontend
│   ├── src/
│   │   ├── components/     # Navbar, Footer, ProtectedRoute
│   │   ├── context/        # AuthContext (session state)
│   │   ├── pages/          # Login, Register, VerifyOtp, Languages, LanguageSearch, Profile, Admin, AddSyntax, NotFound
│   │   ├── style.css       # Notebook aesthetic & responsive styling
│   │   ├── App.jsx         # Routing & layout
│   │   └── main.jsx        # Entrypoint
│   ├── index.html
│   └── vite.config.js      # Proxy configuration to Express backend
├── server/                 # Express.js Backend
│   ├── utils/
│   │   ├── auth.js         # Werkzeug scrypt & bcrypt password hashing/checking
│   │   ├── email.js        # Nodemailer SMTP OTP dispatch
│   │   └── supabase.js     # Supabase REST client with exact count & filtering
│   ├── server.js           # API routes, sessions, caching, & static serving
│   └── package.json
├── package.json            # Root workspace scripts
└── .env                    # Environment configuration
```

---

## How to Run

### Development Mode (Concurrent React + Express)

Run both the Express backend (port 5000) and the React Vite dev server (port 5173) with hot reloading:

```bash
npm run dev
```

Open your browser at:
```text
http://localhost:5173
```

*(Requests to `/api` from Vite are automatically proxied to the Express backend at `http://localhost:5000`)*

### Production Mode

Build the React frontend and serve everything through Express on port 5000:

```bash
npm run build
npm start
```

Open your browser at:
```text
http://localhost:5000
```
