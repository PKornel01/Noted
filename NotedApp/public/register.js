document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const passwordDoesntMatch = document.getElementById('passwordDoesntMatch')

    if (confirmPassword === password) {
        passwordDoesntMatch.innerHTML = ``
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({username, email, password}),
        });
        
        if (res.ok) {
            window.location.href = 'homepage.html'
        } else {
            const err = await res.json();
            alert(err.error || 'Registration failed')
        }
    } else {
        passwordDoesntMatch.innerHTML = `Password Doesn't Match!`
    }
});