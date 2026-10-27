document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('log-email').value.trim();
    const password = document.getElementById('log-password').value.trim();

    if (!email || !password) {
        return alert('Te rog introdu emailul și parola!');
    }

    try {
        const response = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userEmail', document.getElementById('log-email').value);
            localStorage.setItem('userRole', data.role);
            window.location.href = 'index.html';
        } else {
            alert(`Eroare: ${data.error || 'Email sau parolă incorecte'}`);
        }
    } catch (error) {
        console.error(error);
        alert('Eroare de conexiune cu serverul.');
    }
});