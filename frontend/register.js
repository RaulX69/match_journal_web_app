document.getElementById('register-btn').addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    if (!name || !email || !password) {
        return alert('Te rog completează toate câmpurile!');
    }

    try {
        const response = await fetch('http://localhost:5000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            alert('Cont creat cu succes!');
            window.location.href = 'index.html';
        } else {
            alert(`Eroare: ${data.error || 'Nu am putut crea contul'}`);
        }
    } catch (error) {
        console.error(error);
        alert('Eroare de conexiune cu serverul.');
    }
});