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
            matchCard.className = 'match-card';

            matchCard.innerHTML = `
            <div class="match-header" style="display: flex; justify-content: space-between; align-items: center;">
        
                <div style="flex: 1; text-align: center;">
                    <img src="${match.teams.home.logo}" alt="Home Logo" style="width: 50px; height: 50px; object-fit: contain; margin-bottom: 5px;">
                    <div class="team-name" style="font-size: 18px;">${match.teams.home.name}</div>
                </div>
        
                <div style="text-align: center;">
                    <div class="score-badge">${match.goals.home ?? '-'} : ${match.goals.away ?? '-'}</div>
                    <div style="margin-top: 8px; font-size: 13px; color: #aaa;">${new Date(match.fixture.date).toLocaleDateString()}</div>
                </div>
        
                <div style="flex: 1; text-align: center;">
                    <img src="${match.teams.away.logo}" alt="Away Logo" style="width: 50px; height: 50px; object-fit: contain; margin-bottom: 5px;">
                    <div class="team-name" style="font-size: 18px;">${match.teams.away.name}</div>
                </div>
        
            </div>

            <div style="margin-top: 20px; text-align: center; border-top: 1px dashed #333; padding-top: 20px;">
                <button class="btn btn-success add-to-journal-btn" style="width: 100%; max-width: 300px; font-size: 16px;">
                 ➕ Adaugă în Jurnal
                </button>
            </div>
        `;
            
            const saveBtn = matchCard.querySelector('.add-to-journal-btn');
            
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
                            home_logo: match.teams.home.logo,
                            away_team: match.teams.away.name,
                            away_logo: match.teams.away.logo,
                            home_score: match.goals.home,
                            away_score: match.goals.away,
                            match_date: match.fixture.date,
                            stadium_id: match.fixture.venue.id,
                            stadium_name: match.fixture.venue.name,
                            city: match.fixture.venue.city,
                            api_match_id: match.fixture.id,
                            rating: null,
                            review: ''
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