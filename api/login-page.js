// API endpoint to serve login page as fallback
// Access via: /api/login-page

import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
    try {
        // Read the login.html file content
        const loginHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Tabmangment</title>
    <!-- Login page v2.0 -->
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .login-container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
        }

        .logo {
            text-align: center;
            margin-bottom: 30px;
        }

        .logo h1 {
            color: #333;
            font-size: 28px;
            margin-bottom: 5px;
        }

        .logo p {
            color: #666;
            font-size: 14px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 500;
        }

        .form-group input {
            width: 100%;
            padding: 15px;
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            font-size: 16px;
            transition: border-color 0.2s;
        }

        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }

        .login-btn {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
            margin-bottom: 20px;
        }

        .login-btn:hover {
            transform: translateY(-2px);
        }

        .login-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
        }

        .register-link {
            text-align: center;
            color: #666;
        }

        .register-link a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }

        .register-link a:hover {
            text-decoration: underline;
        }

        .error-message {
            background: #fee2e2;
            color: #dc2626;
            padding: 10px 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
        }

        .success-message {
            background: #ecfdf5;
            color: #059669;
            padding: 10px 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <h1>🔐 Tabmangment Login</h1>
            <p>Sign in to your account to upgrade to Pro</p>
            <p><strong>API SERVED VERSION</strong></p>
        </div>

        <div id="error-message" class="error-message"></div>
        <div id="success-message" class="success-message"></div>

        <form id="login-form">
            <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" name="email" required>
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>

            <button type="submit" class="login-btn" id="login-btn">
                Sign In
            </button>
        </form>

        <div class="register-link">
            Don't have an account? <a href="register.html">Sign up</a>
        </div>
    </div>

    <script>
        console.log('🔐 Login page loaded via API endpoint');

        const loginForm = document.getElementById('login-form');
        const loginBtn = document.getElementById('login-btn');
        const errorMessage = document.getElementById('error-message');
        const successMessage = document.getElementById('success-message');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password) {
                showError('Please fill in all fields');
                return;
            }

            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing In...';
            hideMessages();

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const result = await response.json();

                if (result.success) {
                    localStorage.setItem('tabmangment_token', result.token);
                    localStorage.setItem('tabmangment_user', JSON.stringify(result.user));

                    try {
                        if (typeof chrome !== 'undefined' && chrome.runtime) {
                            chrome.runtime.sendMessage({
                                type: 'USER_LOGGED_IN',
                                user: result.user,
                                token: result.token
                            });
                        }
                    } catch (e) {
                        console.log('Extension not available');
                    }

                    showSuccess('Login successful! Redirecting...');

                    setTimeout(() => {
                        window.location.href = '/dashboard.html';
                    }, 1000);

                } else {
                    showError(result.message || 'Login failed');
                }

            } catch (error) {
                console.error('Login error:', error);
                showError('Network error. Please try again.');
            }

            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        });

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            successMessage.style.display = 'none';
        }

        function showSuccess(message) {
            successMessage.textContent = message;
            successMessage.style.display = 'block';
            errorMessage.style.display = 'none';
        }

        function hideMessages() {
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';
        }
    </script>
</body>
</html>`;

        // Set content type to HTML
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(loginHtml);

    } catch (error) {
        console.error('Error serving login page:', error);
        res.status(500).json({ error: 'Could not load login page' });
    }
}