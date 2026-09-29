(async function requireLogin() {
    const res = await fetch('/api/me');
    if (!res.ok) window.location.href = '/signin.html';
})();
const API_BASE_URL = 'http://localhost:3000/api';