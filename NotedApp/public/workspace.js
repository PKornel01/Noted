(async function requireLogin() {
    const res = await fetch('/api/me');
    if (!res.ok) window.location.href = '/signin.html';
})();
const API_BASE_URL = 'http://localhost:3000/api';

const params = new URLSearchParams(window.location.search);
const projectId = params.get('id');

if (!projectId) {
    window.location.href = '/homepage.html';
}

const sheetEl = document.getElementById('sheet');

function growCanvasIfNeeded(canvas, neededWidth, neededHeight) {
    const padding = 40;
    if (neededWidth + padding > canvas.offsetWidth) {
        canvas.style.width = (neededWidth + padding) + 'px';
    }
    if (neededHeight + padding > canvas.offsetHeight) {
        canvas.style.height = (neededHeight + padding) + 'px';
    }
}