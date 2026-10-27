const token = localStorage.getItem('token');
const userRole = localStorage.getItem('userRole');

if (!token || userRole !== 'admin') {
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', incarcaDateAdmin);

async function incarcaDateAdmin() {
    const container = document.getElementById('admin-container');
    
    try {
        const response = await fetch('http://localhost:5000/api/admin/users', {
            headers: { 'token': token }
        });
        const users = await response.json();

        if (!response.ok) {
            container.innerHTML = `<p style="color: red;">Eroare: ${users.error}</p>`;
            return;
        }

        container.innerHTML = '';

        users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.style.border = '1px solid #444';
            userCard.style.borderRadius = '8px';
            userCard.style.padding = '20px';
            userCard.style.marginBottom = '20px';
            userCard.style.backgroundColor = '#1e1e1e';

            let matchesHTML = user.matches.length > 0 
                ? user.matches.map(m => `
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #555; padding: 5px 0;">
                        <span>⚽ ${m.home_team} ${m.home_score ?? '-'} : ${m.away_score ?? '-'} ${m.away_team}</span>
                        <button onclick="stergeMeci(${m.id})" class="btn btn-danger" style="padding: 2px 10px; font-size: 12px;">Șterge Meci</button>
                    </div>
                `).join('') 
                : '<p style="color: #aaa; font-style: italic;">Nu are meciuri salvate.</p>';

            const promoteBtn = user.role === 'user' 
                ? `<button onclick="promoveazaUser(${user.id})" class="btn btn-success" style="margin-right: 10px;">Promovează la Admin</button>`
                : `<span style="color: gold; margin-right: 15px;">⭐ Administrator</span>`;

            userCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <h3 style="margin: 0; color: #3b82f6;">${user.name} (${user.email})</h3>
                        <small style="color: #aaa;">Rol: ${user.role}</small>
                    </div>
                    <div>
                        ${promoteBtn}
                        <button onclick="stergeUser(${user.id})" class="btn btn-danger">Șterge Cont</button>
                    </div>
                </div>
                <div style="background: #2a2a2a; padding: 10px; border-radius: 5px;">
                    <h4 style="margin-top: 0;">Meciuri Salvate (${user.matches.length}):</h4>
                    ${matchesHTML}
                </div>
            `;
            container.appendChild(userCard);
        });

    } catch (error) {
        container.innerHTML = '<p style="color: red;">Eroare la conectarea cu serverul.</p>';
    }
}

async function stergeUser(id) {
    if (!confirm('Ești sigur că vrei să ștergi definitiv acest cont și toate meciurile lui?')) return;
    
    await fetch(`http://localhost:5000/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'token': token }
    });
    incarcaDateAdmin();
}

async function stergeMeci(id) {
    if (!confirm('Ștergi acest meci?')) return;
    
    await fetch(`http://localhost:5000/api/admin/matches/${id}`, {
        method: 'DELETE',
        headers: { 'token': token }
    });
    incarcaDateAdmin(); 
}

async function promoveazaUser(id) {
    if (!confirm('Transformi acest cont în Administrator? Va avea acces la fel ca tine.')) return;
    
    await fetch(`http://localhost:5000/api/admin/users/${id}/promote`, {
        method: 'PUT',
        headers: { 'token': token }
    });
    incarcaDateAdmin(); 
}