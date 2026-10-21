from flask import Flask, render_template, request, redirect, url_for, session, abort
import os
from dotenv import load_dotenv
import requests
from werkzeug.security import generate_password_hash, check_password_hash

# Load variables from .env
load_dotenv()
app = Flask(__name__)

app.secret_key = os.environ.get("SECRET_KEY", '')
if not app.secret_key:
    raise RuntimeError("SECRET_KEY is missing from environment variables")

# Project A: Auth & Users
AUTH_URL = os.environ.get("AUTH_SUPABASE_URL", '').rstrip("/")
AUTH_KEY = os.environ.get("AUTH_SUPABASE_KEY", '')

# Project B: Content (Languages & Syntax)
CONTENT_URL = os.environ.get("CONTENT_SUPABASE_URL", '').rstrip("/")
CONTENT_KEY = os.environ.get("CONTENT_SUPABASE_KEY", '')

def supabase_content_get(table, params=None):
    if not (CONTENT_URL and CONTENT_KEY): return []
    headers = supabase_content_headers()
    try:
        res = requests.get(
            f'{CONTENT_URL}/rest/v1/{table}',
            headers=headers,
            params=params,
            timeout=5
        )
        return res.json() if res.status_code == 200 else []
    except Exception:
        return []

def supabase_content_post(table, data):
    if not (CONTENT_URL and CONTENT_KEY): return False
    headers = supabase_content_headers()
    try:
        res = requests.post(
            f'{CONTENT_URL}/rest/v1/{table}',
            headers=headers,
            json=data,
            timeout=5
        )
        return res.status_code in (200, 201)
    except Exception:
        return False

def supabase_content_get_count(table):
    if not (CONTENT_URL and CONTENT_KEY): return 0
    headers = supabase_content_headers()
    headers['Prefer'] = 'count=exact'
    try:
        # Request 0 items, just get the count header
        res = requests.get(
            f'{CONTENT_URL}/rest/v1/{table}',
            headers=headers,
            params={'select': 'id', 'limit': 1},
            timeout=5
        )
        if res.status_code == 200:
            # Header format: "items 0-0/123"
            content_range = res.headers.get('Content-Range', '')
            if '/' in content_range:
                return int(content_range.split('/')[-1])
        return 0
    except Exception:
        return 0

def supabase_auth_headers():
    return {
        'apikey': AUTH_KEY,
        'Authorization': f'Bearer {AUTH_KEY}',
        'Content-Type': 'application/json'
    }

def supabase_content_headers():
    return {
        'apikey': CONTENT_KEY,
        'Authorization': f'Bearer {CONTENT_KEY}',
        'Content-Type': 'application/json'
    }

def get_user(username):
    if not (AUTH_URL and AUTH_KEY): return None
    headers = supabase_auth_headers()
    try:
        res = requests.get(
            f'{AUTH_URL}/rest/v1/users',
            headers=headers,
            params={'username': f'eq.{username}', 'select': '*'},
            timeout=5
        )
        if res.status_code == 200:
            data = res.json()
            return data[0] if data else None
    except Exception:
        pass
    return None

def create_user(username, password_hash):
    if not (AUTH_URL and AUTH_KEY): return False
    headers = supabase_auth_headers()
    headers['Prefer'] = 'return=representation'
    try:
        res = requests.post(
            f'{AUTH_URL}/rest/v1/users',
            headers=headers,
            json={'username': username, 'password_hash': password_hash},
            timeout=5
        )
        return res.status_code in (200, 201)
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
        
    langs = supabase_content_get("languages")
    
    lang_list = []
    for lang in langs:
        table_name = f"{lang['id'].replace('-', '_').replace('+', 'pp')}_syntax"
        # Use efficient count header
        count = supabase_content_get_count(table_name)
        lang_dict = dict(lang)
        lang_dict['count'] = count
        lang_list.append(lang_dict)
        
    return render_template('languages.html', languages=lang_list)

@app.route("/add", methods=['GET', 'POST'])
def add():
    if 'user' not in session:
        return redirect(url_for('login'))

    if request.method == 'POST':
        title = request.form.get('title')
        syntax = request.form.get('syntax')
        description = request.form.get('description')
        example = request.form.get('example')
        tags = request.form.get('tags')

        table_name = f"{session['language'].replace('-', '_').replace('+', 'pp')}_syntax"

        data = {
            'title': title,
            'syntax': syntax,
            'description': description,
            'example': example,
            'tags': tags
        }
        
        if supabase_content_post(table_name, data):
            return redirect(f"/{session['language']}?q={title}")
        else:
            return "Failed to add entry.", 500

    return render_template("add.html")

@app.route('/<language>')
def search_language(language):
    if 'user' not in session:
        return redirect(url_for('login'))
        
    language = language.lower()
    
    # Check if language exists in Supabase
    langs = supabase_content_get("languages", params={'id': f'eq.{language}', 'select': '*'})
    if not langs:
        abort(404, description=f"Language '{language}' not found.")
        
    lang_row = langs[0]
    session['language'] = language
    query = request.args.get('q', '').strip()
    
    table_name = f"{language.replace('-', '_').replace('+', 'pp')}_syntax"
    
    results = []
    if query:
        # Supabase FTS or simple OR filter
        # For simplicity, filter in Python if REST API complexity is high
        entries = supabase_content_get(table_name)
        for e in entries:
            if any(query.lower() in str(e.get(k, '')).lower() for k in ['title', 'syntax', 'description', 'example', 'tags']):
                results.append(e)
    else:
        entries = supabase_content_get(table_name)
        results = entries if entries else []
        
    # Format entries
    formatted_results = []
    for entry in results:
        formatted_results.append({
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
        
    return render_template('search.html', language=language, lang_name=lang_row['name'], query=query, results=formatted_results)

@app.route('/api/<language>/search')
def api_search(language):
    if 'user' not in session:
        return {'error': 'Unauthorized'}, 401
    language = language.lower()
    
    # Check if language exists
    langs = supabase_content_get("languages", params={'id': f'eq.{language}', 'select': '*'})
    if not langs:
        return {'error': f"Language '{language}' not found"}, 404
    lang_row = langs[0]
        
    query = request.args.get('q', '').strip()
    table_name = f"{language.replace('-', '_').replace('+', 'pp')}_syntax"
    
    entries = supabase_content_get(table_name)
    
    results = []
    for entry in entries:
        # Client-side filtering as before
        if query and not any(query.lower() in str(entry.get(k, '')).lower() for k in ['title', 'syntax', 'description', 'example', 'tags']):
            continue
            
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
        
    return {'language': language, 'lang_name': lang_row['name'], 'count': len(results), 'results': results}

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html', error=e), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)
