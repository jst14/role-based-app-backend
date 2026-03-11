async function login(username, password) {
  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Save token in sessionStorage (persists on page refresh)
      sessionStorage.setItem('authToken', data.token);
      showDashboard(data.user); // Your existing function
    } else {
      alert('Login failed: ' + data.error);
    }
  } catch (err) {
    alert('Network error');
  }
}

// Logout
async function logout() {
  const token = sessionStorage.getItem('token');
  if (token) {
    await fetch('/api/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
  sessionStorage.clear();
  showLogin();
}

// Forgot Password
async function forgotPassword() {
  const username = prompt('Username:');
  const res = await fetch('/api/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  const data = await res.json();
  alert(data.message + ' (check server console for token)');
}

// Reset Password (after getting token from console)
async function resetPassword() {
  const username = prompt('Username:');
  const token = prompt('Reset token:');
  const newPassword = prompt('New password:');
  
  const res = await fetch('/api/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, token, newPassword })
  });
  alert((await res.json()).message);
}

function getAuthHeader() {
  const token = sessionStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Example: Fetch admin data
async function loadAdminDashboard() {
  const res = await fetch('http://localhost:3000/api/admin/dashboard', {
    headers: getAuthHeader()
  });

  if (res.ok) {
    const data = await res.json();
    document.getElementById('content').innerText = data.message;
  } else {
    document.getElementById('content').innerText = 'Access denied!';
  }
}

