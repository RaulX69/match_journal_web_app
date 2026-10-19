const searchBtn = document.getElementById('search-btn');
const teamInput = document.getElementById('team-input');
const matchesContainer = document.getElementById('matches-container');

const TEMP_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJpYXQiOjE3OTI0MDY5OTgsImV4cCI6MTc5MjQxMDU5OH0.8Xlh8yt0e3JhMorsRbDw_FJpfQ7VAIsmcDWE-ULAG-s"; 

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
                'token': TEMP_TOKEN
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
            `;
            
            matchesContainer.appendChild(matchCard);
        });

    } catch (error) {
        console.error('Eroare:', error);
        matchesContainer.innerHTML = '<p style="text-align: center; color: red;">A apărut o eroare la conectarea cu serverul.</p>';
    }
});