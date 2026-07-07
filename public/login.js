const API_BASE = '/api';

// Toggle between login and register forms
function toggleForm() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm.style.display === 'none') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }

  // Clear forms
  loginForm.reset();
  registerForm.reset();
  clearMessages();
}

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);

  // Check if already logged in
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = '/index.html';
  }
});

// Handle login
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showError('Please provide email and password');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      showSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1500);
    } else {
      showError(data.error || 'Login failed');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('An error occurred: ' + error.message);
  }
}

// Handle register
async function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

  if (!name || !email || !password || !passwordConfirm) {
    showError('Please fill in all fields');
    return;
  }

  if (password.length < 6) {
    showError('Password must be at least 6 characters');
    return;
  }

  if (password !== passwordConfirm) {
    showError('Passwords do not match');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, passwordConfirm }),
    });

    const data = await response.json();

    if (response.ok) {
      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      showSuccess('Registration successful! Redirecting...');
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1500);
    } else {
      showError(data.error || 'Registration failed');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('An error occurred: ' + error.message);
  }
}

// Show error message
function showError(message) {
  clearMessages();
  const form = document.getElementById('loginForm').style.display !== 'none' 
    ? document.getElementById('loginForm') 
    : document.getElementById('registerForm');
  
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-error';
  alertDiv.textContent = message;
  form.insertBefore(alertDiv, form.firstChild);
}

// Show success message
function showSuccess(message) {
  clearMessages();
  const form = document.getElementById('loginForm').style.display !== 'none' 
    ? document.getElementById('loginForm') 
    : document.getElementById('registerForm');
  
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-success';
  alertDiv.textContent = message;
  form.insertBefore(alertDiv, form.firstChild);
}

// Clear all messages
function clearMessages() {
  document.querySelectorAll('.alert').forEach(alert => alert.remove());
}
