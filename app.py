import hashlib
import time
import os
import random
import smtplib
from email.message import EmailMessage
from functools import lru_cache
from flask import Flask, render_template, request, redirect, url_for, session, abort
from dotenv import load_dotenv
import requests
from werkzeug.security import generate_password_hash, check_password_hash
from concurrent.futures import ThreadPoolExecutor

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

# Email Config
SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
MAIL_FROM = os.environ.get("MAIL_FROM")

# Admin
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME")
ADMIN_PASSWORD_HASH = os.environ.get("ADMIN_PASSWORD_HASH")

# Thread pool for background tasks
executor = ThreadPoolExecutor(max_workers=2)

def send_email_async(to, subject, body):
    def _send():
        msg = EmailMessage()
        msg.set_content(body)
        msg['Subject'] = subject
        msg['From'] = MAIL_FROM
        msg['To'] = to
        try:
            with smtplib.SMTP(SMTP_HOST or '', SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER or '', SMTP_PASSWORD or '')
                server.send_message(msg)
        except Exception as e:
            print(f"Failed to send email: {e}")
    executor.submit(_send)


# In-memory TTL cache for languages list to eliminate repeated network fetches
_LANG_CACHE = {
    'data': None,
    'timestamp': 0
}
CACHE_TTL = 300  # 5 minutes

def get_cached_languages():
    global _LANG_CACHE
    now = time.time()
    if _LANG_CACHE['data'] and (now - _LANG_CACHE['timestamp'] < CACHE_TTL):
        return _LANG_CACHE['data']
        
    langs = supabase_content_get("languages")
    lang_list = []
    for lang in langs:
        table_name = f"{lang['id'].replace('-', '_').replace('+', 'pp')}_syntax"
        count = supabase_content_get_count(table_name)
        lang_dict = dict(lang)
        lang_dict['count'] = count
        lang_list.append(lang_dict)
        
    _LANG_CACHE['data'] = lang_list
    _LANG_CACHE['timestamp'] = now
    return lang_list

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
            # Check for Admin
            if username == ADMIN_USERNAME:
                if check_password_hash(ADMIN_PASSWORD_HASH or '', password):
                    session['user'] = username
                    return redirect(url_for('admin'))
                else:
                    error = 'Invalid credentials.'
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
                email = request.form.get('email', '').strip()
                if not email:
                    error = 'Email is required.'
                else:
                    # Generate OTP
                    otp = str(random.randint(100000, 999999))
                    # Store in session temporarily
                    session['temp_user'] = {'username': username, 'email': email, 'password_hash': generate_password_hash(password), 'otp': otp}
                    
                    # Send OTP via background thread
                    send_email_async(email, "DevSearch Verification Code", f"Your verification code is: {otp}")
                    
                    return redirect(url_for('verify_otp'))

    return render_template('register.html', error=error)

@app.route('/verify_otp', methods=['GET', 'POST'])
def verify_otp():
    if 'temp_user' not in session:
        return redirect(url_for('register'))
        
    if request.method == 'POST':
        otp = request.form.get('otp')
        if otp == session['temp_user']['otp']:
            # Create user
            if create_user(session['temp_user']['username'], session['temp_user']['password_hash']):
                session['user'] = session['temp_user']['username']
                session.pop('temp_user')
                return redirect(url_for('languages'))
            else:
                return "Registration failed."
        else:
            return "Invalid OTP. <a href='/register'>Try again</a>"

    return render_template('verify_otp.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/languages')
def languages():
    if 'user' not in session:
        return redirect(url_for('login'))
        
    lang_list = get_cached_languages()
    return render_template('languages.html', languages=lang_list)

@app.route('/profile')
def profile():
    if 'user' not in session:
        return redirect(url_for('login'))
    user = get_user(session['user'])
    if not user:
        return redirect(url_for('logout'))
    return render_template('profile.html', user=user)

@app.route('/admin', methods=['GET', 'POST'])
def admin():
    if session.get('user') != ADMIN_USERNAME:
        return redirect(url_for('login'))
    
    # Placeholder: fetch pending additions from Supabase
    pending = [] # supabase_content_get('pending_additions')
    
    if request.method == 'POST':
        # Logic to approve/reject
        pass
        
    return render_template('admin.html', pending=pending)

@app.route("/add_syntax", methods=['GET', 'POST'])
def add_syntax():
    if 'user' not in session:
        return redirect(url_for('login'))

    if request.method == 'POST':
        # Instead of direct add, submit to a 'pending' table or admin queue
        data = {
            'title': request.form.get('title'),
            'syntax': request.form.get('syntax'),
            'description': request.form.get('description'),
            'user': session['user'],
            'status': 'pending'
        }
        # supabase_content_post('pending_additions', data)
        return "Submission received. Pending admin approval."
    
    return render_template("add.html")

@app.route('/<language>')
def search_language(language):
    if 'user' not in session:
        return redirect(url_for('login'))
        
    language = language.lower()
    
    # Use cached language list for fast verification instead of network request
    cached_langs = get_cached_languages()
    lang_row = next((l for l in cached_langs if l['id'] == language), None)
    
    if not lang_row:
        abort(404, description=f"Language '{language}' not found.")
        
    session['language'] = language
    query = request.args.get('q', '').strip()
    
    table_name = f"{language.replace('-', '_').replace('+', 'pp')}_syntax"
    
    results = []
    entries = supabase_content_get(table_name)
    
    if query:
        for e in entries:
            if any(query.lower() in str(e.get(k, '')).lower() for k in ['title', 'syntax', 'description', 'example', 'tags']):
                results.append(e)
    else:
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
    
    # Use cached language list
    cached_langs = get_cached_languages()
    lang_row = next((l for l in cached_langs if l['id'] == language), None)
    if not lang_row:
        return {'error': f"Language '{language}' not found"}, 404
        
    query = request.args.get('q', '').strip()
    table_name = f"{language.replace('-', '_').replace('+', 'pp')}_syntax"
    
    entries = supabase_content_get(table_name)
    
    results = []
    for entry in entries:
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
        
    return {'language': language, 'lang_name': lang_row.get('name', language), 'count': len(results), 'results': results}


@app.route('/profile')
def profile():
    if 'user' not in session:
        return redirect(url_for('login'))
    user = get_user(session['user'])
    if not user:
        return redirect(url_for('logout'))
    return render_template('profile.html', user=user)

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html', error=e), 404

if __name__ == '__main__':
    app.run()
