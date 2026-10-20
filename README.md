# DevSearch ⚡

DevSearch is an interactive code syntax reference, parameter guide, and documentation search engine built with **Python (Flask)**, **SQLite**, and **Bootstrap 5** paired with a custom notebook-inspired design. It allows developers and students to securely authenticate, select across 14 programming languages, and instantly search or browse through structured syntax references with live code snippets, returns, and official documentation links.

---

## Features

- **User Authentication**: Secure session registration and login with password hashing (`werkzeug.security`) and session tracking (`/login`, `/register`, `/logout`).
- **14 Programming Languages**: Python, JavaScript, SQL (SQLite), C++, Go, Java, C#, C, TypeScript, Rust, Ruby, PHP, Swift, and Kotlin with live syntax counts.
- **Dynamic Instant Search**: Real-time client-side filtering as you type across titles, syntax statements, descriptions, and tags — no page reload required.
- **Cheatsheet Default View**: Displays all available syntax references upon entering a language page.
- **Difficulty Filter Pills**: Single-click filtering by difficulty level (`All`, `Beginner`, `Intermediate`, `Advanced`).
- **Interactive Tag Navigation**: Click any `#tag` badge to filter related syntax entries instantly.
- **1-Click Code Copy**: Clipboard copy button on every syntax definition and code example with animated feedback (`✓ Copied!`).
- **RESTful Search API**: Dedicated `/api/<language>/search` JSON endpoint supporting `q`, `difficulty`, and `tag` queries.
- **Keyboard Shortcuts**: Quick search focus via `/` or `Ctrl+K`, instant clear with `Esc`.
- **Custom UI**: Handwritten student notebook aesthetic (warm paper background, ruled lines, binder-hole accents) with JetBrains Mono monospace code formatting and high-contrast typography.

---

## Project Structure

```text
C:\code\6678\
├── app.py                 # Flask server, route handlers, DB connection, and API
├── data.db                # SQLite database with language tables, syntax records, and users
├── requirements.txt       # Python dependencies (Flask, requests)
├── static\
│   └── style.css          # Custom notebook styling, dark code blocks, and UI components
└── templates\             # Jinja2 HTML templates
    ├── base.html          # Global layout, responsive navbar, and footer
    ├── login.html         # User login form
    ├── register.html      # Account creation form
    ├── languages.html     # Language dashboard with live search & entry counters
    ├── search.html        # Interactive syntax search engine & cheatsheet
    └── 404.html           # Custom not-found error page
```

---

## Database Schema (`data.db`)

1. **`users`**: User account credentials (`id`, `username`, `password_hash`).
2. **`languages`**: Supported languages (`id`, `name`, `icon`, `color`, `version`, `docs_home`).
3. **Language Syntax Tables** (`<lang>_syntax`, e.g. `python_syntax`, `javascript_syntax`):
   - `id`: Unique record ID
   - `title`: Function or syntax title (e.g. `print()`, `filter()`)
   - `syntax`: Formal syntax signature
   - `description`: Plain-text explanation
   - `example`: Runnable code snippet
   - `output`: Expected console output
   - `returns`: Return type or value
   - `difficulty`: `beginner`, `intermediate`, or `advanced`
   - `doc_link`: Official documentation URL
   - `tags`: Comma-delimited searchable tags

---

## How to Run

1. Open a terminal in the project directory:
   ```bash
   cd /c/code/6678
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Launch the application:
   ```bash
   python app.py
   ```

4. Open your browser:
   ```text
   http://127.0.0.1:5000
   ```
