const searchBtn = document.getElementById('search-btn');
const teamInput = document.getElementById('team-input');
const matchesContainer = document.getElementById('matches-container');
const token = localStorage.getItem('token');

if (!token || token === 'undefined' || token === 'null') {
    window.location.href = 'login.html';
}

searchBtn.addEventListener('click', async () => {
    const team = teamInput.value.trim();
    
    if (!team) {
        alert('Introdu numele unei echipe!');
        return;
    }

    matchesContainer.innerHTML = '<p style="text-align: center;">Se caută meciurile...</p>';

    try {
        const response = await fetch(`http://localhost:5000/api/search-matches?team=${encodeURIComponent(team)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'token': token
            }
        });

        const matches = await response.json();

        if (matches.error || matches.message) {
            matchesContainer.innerHTML = `<p style="text-align: center; color: red;">${matches.error || matches.message}</p>`;
            return;
        }

        matchesContainer.innerHTML = '';

        matches.forEach(match => {
            const matchDate = new Date(match.fixture.date).toLocaleDateString('ro-RO');
            
            const matchCard = document.createElement('div');
            matchCard.style.border = '1px solid #ccc';
            matchCard.style.padding = '15px';
            matchCard.style.borderRadius = '8px';
            matchCard.style.backgroundColor = 'white';
            matchCard.style.display = 'flex';
            matchCard.style.flexDirection = 'column';
            matchCard.style.gap = '15px';
            
            matchCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="text-align: center; flex: 1;">
                        <img src="${match.teams.home.logo}" width="60" alt="${match.teams.home.name}">
                        <p><strong>${match.teams.home.name}</strong></p>
                    </div>
                    <div style="text-align: center; flex: 1;">
                        <h2 style="margin-bottom: 5px;">${match.goals.home ?? '-'} : ${match.goals.away ?? '-'}</h2>
                        <span style="background: #eee; padding: 3px 8px; border-radius: 12px; font-size: 12px;">${matchDate}</span>
                    </div>
                    <div style="text-align: center; flex: 1;">
                        <img src="${match.teams.away.logo}" width="60" alt="${match.teams.away.name}">
                        <p><strong>${match.teams.away.name}</strong></p>
                    </div>
                </div>
                <button class="save-btn" style="padding: 10px; background-color: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    Adaugă în jurnal
                </button>
            `;
            
            const saveBtn = matchCard.querySelector('.save-btn');
            
            saveBtn.addEventListener('click', async () => {
                try {
                    saveBtn.textContent = 'Se salvează...';
                    
                    const response = await fetch('http://localhost:5000/api/matches', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'token': token
                        },
                        body: JSON.stringify({
                            home_team: match.teams.home.name,
                            away_team: match.teams.away.name,
                            home_score: match.goals.home,
                            away_score: match.goals.away,
                            match_date: match.fixture.date
                        })
                    });

                    if (response.ok) {
                        saveBtn.textContent = '✓ Adăugat în jurnal';
                        saveBtn.style.backgroundColor = '#6c757d';
                        saveBtn.disabled = true;
                    } else {
                        const errorData = await response.json();
                        alert(`Eroare: ${errorData.error || 'Nu am putut salva meciul.'}`);
                        saveBtn.textContent = 'Adaugă în jurnal';
                    }
                } catch (error) {
                    console.error('Eroare la salvare:', error);
                    alert('Eroare de rețea. Asigură-te că serverul merge.');
                    saveBtn.textContent = 'Adaugă în jurnal';
                }
            });
            
            matchesContainer.appendChild(matchCard);
        });

    } catch (error) {
        console.error('Eroare:', error);
        matchesContainer.innerHTML = '<p style="text-align: center; color: red;">A apărut o eroare la conectarea cu serverul.</p>';
    }
});