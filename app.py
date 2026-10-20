from flask import Flask, render_template, request, redirect, url_for, session, abort
import sqlite3
import os
from dotenv import load_dotenv
import requests
from werkzeug.security import generate_password_hash, check_password_hash

# Load variables from .env
load_dotenv()
app = Flask(__name__)

# Never use a fallback secret key in production
app.secret_key = os.environ.get("SECRET_KEY")

if not app.secret_key:
    raise RuntimeError("SECRET_KEY is missing from environment variables")

DB_PATH = os.path.join(os.path.dirname(__file__), "data.db")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://bsxisbucmkefostycuvq.supabase.co").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_xQFnLLWbyLpvdBtfXrBjWQ_uxvTx7_d")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def is_supabase_enabled():
    return bool(SUPABASE_URL and SUPABASE_KEY)

def get_user(username):
    if is_supabase_enabled():
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
        }
        try:
            res = requests.get(
                f'{SUPABASE_URL}/rest/v1/users',
                headers=headers,
                params={'username': f'eq.{username}', 'select': '*'},
                timeout=5
            )
            if res.status_code == 200:
                data = res.json()
                if data:
                    return data[0]
        except Exception:
            pass

    # Fallback to local SQLite data.db
    try:
        conn = get_db()
        user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        conn.close()
        return dict(user) if user else None
    except Exception:
        return None

def create_user(username, password_hash):
    if is_supabase_enabled():
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        try:
            res = requests.post(
                f'{SUPABASE_URL}/rest/v1/users',
                headers=headers,
                json={'username': username, 'password_hash': password_hash},
                timeout=5
            )
            if res.status_code in (200, 201):
                return True
        except Exception:
            pass

    # Fallback to local SQLite data.db
    try:
        conn = get_db()
        conn.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, password_hash))
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

@app.route('/')
def index():
    if 'user' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('languages'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user' in session:
        return redirect(url_for('languages'))
        
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        if not username or not password:
            error = 'Please provide both username and password.'
        else:
            user = get_user(username)
            if user and check_password_hash(user['password_hash'], password):
                session['user'] = user['username']
                return redirect(url_for('languages'))
            else:
                error = 'Invalid username or password.'
                
    return render_template('login.html', error=error)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if 'user' in session:
        return redirect(url_for('languages'))
        
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        if not username or not password:
            error = 'Username and password are required.'
        elif len(password) < 6:
            error = 'Password must be at least 6 characters long.'
        else:
            existing = get_user(username)
            if existing:
                error = 'Username already exists. Choose another.'
            else:
                pass_hash = generate_password_hash(password)
                if create_user(username, pass_hash):
                    session['user'] = username
                    return redirect(url_for('languages'))
                else:
                    error = 'Registration failed. Please try again.'
                
    return render_template('register.html', error=error)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/languages')
def languages():
    if 'user' not in session:
        return redirect(url_for('login'))
        
    conn = get_db()
    langs = conn.execute("SELECT * FROM languages").fetchall()
    
    lang_list = []
    for lang in langs:
        table_name = f"{lang['id'].replace('-', '_').replace('+', 'pp')}_syntax"
        try:
            count = conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
        except Exception:
            count = 0
        lang_dict = dict(lang)
        lang_dict['count'] = count
        lang_list.append(lang_dict)
        
    conn.close()
    return render_template('languages.html', languages=lang_list)

@app.route('/<language>')
def search_language(language):
    if 'user' not in session:
        return redirect(url_for('login'))
        
    language = language.lower()
    conn = get_db()
    
    lang_row = conn.execute("SELECT * FROM languages WHERE id = ?", (language,)).fetchone()
    if not lang_row:
        conn.close()
        abort(404, description=f"Language '{language}' not found.")
        
    session['language'] = language
    query = request.args.get('q', '').strip()
    
    table_name = f"{language.replace('-', '_').replace('+', 'pp')}_syntax"
    
    results = []
    if query:
        sql = f"""
            SELECT * FROM {table_name}
            WHERE title LIKE ? OR 
                  syntax LIKE ? OR 
                  description LIKE ? OR
                  example LIKE ? OR 
                  tags LIKE ?
        """
        like_query = f"%{query}%"
        cursor = conn.execute(sql, (like_query, like_query, like_query, like_query, like_query))
        entries = cursor.fetchall()
    else:
        entries = conn.execute(f"SELECT * FROM {table_name}").fetchall()
        
    for entry in entries:
        results.append({
            'id': entry['id'],
            'title': entry['title'],
            'syntax': entry['syntax'],
            'description': entry['description'],
            'example': entry['example'],
            'output': entry['output'],
            'returns': entry['returns'],
            'difficulty': entry['difficulty'] or 'general',
            'tags': [t.strip() for t in entry['tags'].split(',') if t.strip()] if entry['tags'] else [],
            'doc_link': entry['doc_link'],
            'parameters': []
        })
        
    conn.close()
    return render_template('search.html', language=language, lang_name=lang_row['name'], query=query, results=results)

@app.route('/api/<language>/search')
def api_search(language):
    if 'user' not in session:
        return {'error': 'Unauthorized'}, 401
    language = language.lower()
    conn = get_db()
    lang_row = conn.execute("SELECT * FROM languages WHERE id = ?", (language,)).fetchone()
    if not lang_row:
        conn.close()
        return {'error': f"Language '{language}' not found"}, 404
        
    query = request.args.get('q', '').strip()
    difficulty = request.args.get('difficulty', '').strip()
    tag = request.args.get('tag', '').strip()
    
    table_name = f"{language.replace('-', '_').replace('+', 'pp')}_syntax"
    
    conditions = []
    params = []
    
    if query:
        conditions.append("(title LIKE ? OR syntax LIKE ? OR description LIKE ? OR example LIKE ? OR tags LIKE ?)")
        lq = f"%{query}%"
        params.extend([lq, lq, lq, lq, lq])
        
    if difficulty and difficulty.lower() != 'all':
        conditions.append("LOWER(difficulty) = ?")
        params.append(difficulty.lower())
        
    if tag:
        conditions.append("tags LIKE ?")
        params.append(f"%{tag}%")
        
    where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
    sql = f"SELECT * FROM {table_name}{where_clause}"
    
    cursor = conn.execute(sql, tuple(params))
    entries = cursor.fetchall()
    
    results = []
    for entry in entries:
        results.append({
            'id': entry['id'],
            'title': entry['title'],
            'syntax': entry['syntax'],
            'description': entry['description'],
            'example': entry['example'],
            'output': entry['output'],
            'returns': entry['returns'],
            'difficulty': entry['difficulty'] or 'general',
            'tags': [t.strip() for t in entry['tags'].split(',') if t.strip()] if entry['tags'] else [],
            'doc_link': entry['doc_link']
        })
    conn.close()
    return {'language': language, 'lang_name': lang_row['name'], 'count': len(results), 'results': results}

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html', error=e), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)
