document.getElementById('LoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (res.ok) {
        window.location.href ='/'
    } else {
        const err = await res.json();
        alert(err.error || 'Login failed');
    }
});