document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const confirmPassword = confirmPasswordInput.value;
    const passwordDoesntMatch = document.getElementById('passwordDoesntMatch')

    if (password.length < 6) {
        passwordDoesntMatch.textContent = 'The password need to be at least 6 charaters long'
        confirmPasswordInput.classList.remove('password-invalid');
        confirmPasswordInput.setAttribute('aria-invalid', 'false');
        passwordInput.setAttribute('aria-invalid', 'true');
        passwordInput.classList.remove('password-invalid');
        void passwordInput.offsetWidth;
        passwordInput.classList.add('password-invalid');
        return;
    }

    passwordInput.classList.remove('password-invalid');
    passwordInput.setAttribute('aria-invalid', 'false');

    if (confirmPassword === password) {
        passwordDoesntMatch.textContent = ''
        confirmPasswordInput.classList.remove('password-invalid');
        confirmPasswordInput.setAttribute('aria-invalid', 'false');
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
        passwordDoesntMatch.textContent = "Password doesn't match"
        confirmPasswordInput.setAttribute('aria-invalid', 'true');
        confirmPasswordInput.classList.remove('password-invalid');
        void confirmPasswordInput.offsetWidth;
        confirmPasswordInput.classList.add('password-invalid');
    }
});