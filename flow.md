# DevSearch System Architecture & Flow

## Overview
DevSearch is a Flask-based application for searching syntax references. It integrates with Supabase for data storage and authentication.

## Core Features
- **Authentication**: Supports standard user login and an Admin role.
- **OTP Verification**: New user registrations require OTP verification via email.
- **Syntax Management**: Users can propose new syntax additions; Admins manage these via the Admin panel.
- **Background Processing**: Email sending is offloaded to a background thread to maintain responsiveness.

## Application Flow

### 1. User Registration
1. User submits username/password at `/register`.
2. System checks if username exists.
3. If new, generates a 6-digit OTP, stores temporary user data in session, and sends OTP via email in a background thread.
4. User redirected to `/verify_otp`.
5. User enters OTP; if correct, user is created in Supabase via `create_user`, and the user is logged in.

### 2. Login
1. User enters credentials at `/login`.
2. System checks if username is `ADMIN_USERNAME`.
   - If yes, verifies against `ADMIN_PASSWORD_HASH` and redirects to `/admin`.
   - If no, verifies against Supabase and redirects to `/languages`.

### 3. Syntax Addition
1. User goes to `/add_syntax`.
2. Submits syntax details.
3. Data is stored with `status='pending'` (currently commented out placeholder in `app.py`).

### 4. Admin Panel
1. Accessible only to `ADMIN_USERNAME` at `/admin`.
2. Serves as the dashboard to view and approve/reject pending syntax submissions.

### 5. Profile
1. Accessible at `/profile` for logged-in users.
2. Shows basic user information.

## Environment Variables
Ensure the following are set in `.env`:
- `SECRET_KEY`: Flask session secret.
- `AUTH_SUPABASE_URL`/`KEY`: Supabase auth API.
- `CONTENT_SUPABASE_URL`/`KEY`: Supabase content API.
- `SMTP_*`: Gmail credentials for background email processing.
- `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH`: Admin account credentials.
