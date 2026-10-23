const savedMatchesContainer = document.getElementById('saved-matches-container');
const token = localStorage.getItem('token');

if (!token || token === 'undefined' || token === 'null') {
    window.location.href = 'login.html';
}

async function loadSavedMatches() {
    try {
        const response = await fetch('http://localhost:5000/api/matches', {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'token': token
            }
        });

        const matches = await response.json();
        calculateAndDisplayStats(matches);
        savedMatchesContainer.innerHTML = '';

        if (matches.length === 0) {
            savedMatchesContainer.innerHTML = '<p style="text-align: center;">Nu ai niciun meci salvat în jurnal momentan.</p>';
            return;
        }

        matches.forEach(match => {
            const matchDate = new Date(match.match_date).toLocaleDateString('ro-RO');
            const matchId = match.id;
            
            const matchCard = document.createElement('div');
            matchCard.style.border = '2px solid #28a745';
            matchCard.style.padding = '15px';
            matchCard.style.borderRadius = '8px';
            matchCard.style.backgroundColor = 'white';
            matchCard.style.marginBottom = '20px';
            
            matchCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="text-align: center; flex: 1;">
                        <p style="font-size: 18px;"><strong>${match.home_team}</strong></p>
                    </div>
                    <div style="text-align: center; flex: 1;">
                        <h2 style="margin-bottom: 5px;">${match.home_score ?? '-'} : ${match.away_score ?? '-'}</h2>
                        <span style="background: #eee; padding: 3px 8px; border-radius: 12px; font-size: 12px;">${matchDate}</span>
                    </div>
                    <div style="text-align: center; flex: 1;">
                        <p style="font-size: 18px;"><strong>${match.away_team}</strong></p>
                    </div>
                </div>
                
                <div style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 15px; text-align: center;">
                    <h4 style="margin-bottom: 10px;">Cum ți s-a părut meciul?</h4>
                    
                    <div class="stars-container" style="font-size: 24px; cursor: pointer; color: #ccc; margin-bottom: 10px;">
                        <span class="star" data-value="1">★</span>
                        <span class="star" data-value="2">★</span>
                        <span class="star" data-value="3">★</span>
                        <span class="star" data-value="4">★</span>
                        <span class="star" data-value="5">★</span>
                    </div>
                    
                    <textarea class="review-input" rows="3" style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" placeholder="Scrie părerea ta aici...">${match.review || ''}</textarea>
                    <br>
                    
                    <button class="save-review-btn" style="margin-top: 10px; padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Salvează Părerea
                    </button>

                    <button class="delete-btn" style="margin-top: 10px; margin-left: 10px; padding: 8px 16px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Șterge
                    </button>
                </div>
            `;
            
            savedMatchesContainer.appendChild(matchCard);
            
            const stars = matchCard.querySelectorAll('.star');
            const reviewInput = matchCard.querySelector('.review-input');
            const saveReviewBtn = matchCard.querySelector('.save-review-btn');
            
            let currentRating = match.rating || 0;

            const updateStarsUI = (ratingValue) => {
                stars.forEach(star => {
                    if (star.getAttribute('data-value') <= ratingValue) {
                        star.style.color = '#ffc107'; // Auriu
                    } else {
                        star.style.color = '#ccc'; // Gri
                    }
                });
            };

            updateStarsUI(currentRating);

            stars.forEach(star => {
                star.addEventListener('click', () => {
                    currentRating = star.getAttribute('data-value');
                    updateStarsUI(currentRating);
                });
            });

            saveReviewBtn.addEventListener('click', async () => {
                const reviewText = reviewInput.value.trim();
                const finalRating = (currentRating === 0 || currentRating === '0') ? null : currentRating;
                
                try {
                    saveReviewBtn.textContent = 'Se salvează...';
                    
                    const updateRes = await fetch(`http://localhost:5000/api/matches/${matchId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'token': token
                        },
                        body: JSON.stringify({
                            rating: finalRating,
                            review: reviewText
                        })
                    });

                    if (updateRes.ok) {
                        saveReviewBtn.textContent = '✓ Salvat!';
                        saveReviewBtn.style.backgroundColor = '#28a745';
                        setTimeout(() => {
                            saveReviewBtn.textContent = 'Salvează Părerea';
                            saveReviewBtn.style.backgroundColor = '#007bff';
                        }, 2000);
                    } else {
                        alert('Eroare la salvarea recenziei.');
                        saveReviewBtn.textContent = 'Salvează Părerea';
                    }
                } catch (error) {
                    console.error(error);
                    alert('Eroare de conexiune.');
                }
            });

            const deleteBtn = matchCard.querySelector('.delete-btn');

            deleteBtn.addEventListener('click', async () => {
                const isConfirmed = confirm('Ești sigur că vrei să ștergi acest meci din jurnal?');
    
                if (isConfirmed) {
                    try {
                        const deleteRes = await fetch(`http://localhost:5000/api/matches/${matchId}`, {
                            method: 'DELETE',
                            headers: { 'token': token }
                        });

                        if (deleteRes.ok) {
                            matchCard.remove();
                
                            if (savedMatchesContainer.children.length === 0) {
                                savedMatchesContainer.innerHTML = '<p style="text-align: center;">Nu ai niciun meci salvat în jurnal momentan.</p>';
                            }
                        } else {
                            alert('Eroare la ștergerea meciului.');
                        }
                    } catch (error) {
                        console.error(error);
                        alert('Eroare de conexiune.');
                    }
                }
            });
        });

    } catch (error) {
        console.error('Eroare:', error);
        savedMatchesContainer.innerHTML = '<p style="text-align: center; color: red;">Eroare la conectarea cu serverul.</p>';
    }
}

loadSavedMatches();

function calculateAndDisplayStats(matches) {
    if (!matches || matches.length === 0) return;


    const totalMatches = matches.length;

    let totalGoals = 0;
    const teamCounts = {};

    matches.forEach(match => {
        const homeGoals = Number(match.home_score) || 0;
        const awayGoals = Number(match.away_score) || 0;
        totalGoals += (homeGoals + awayGoals);

        // Numărăm aparițiile fiecărei echipe
        teamCounts[match.home_team] = (teamCounts[match.home_team] || 0) + 1;
        teamCounts[match.away_team] = (teamCounts[match.away_team] || 0) + 1;
    });

    const avgGoals = (totalGoals / totalMatches).toFixed(2);

    let favoriteTeam = '-';
    let maxCount = 0;
    
    for (const team in teamCounts) {
        if (teamCounts[team] > maxCount) {
            maxCount = teamCounts[team];
            favoriteTeam = team;
        }
    }

    document.getElementById('stat-total').textContent = totalMatches;
    document.getElementById('stat-favorite').textContent = favoriteTeam;
    document.getElementById('stat-goals').textContent = avgGoals;
}

const profileInfo = document.getElementById('profile-info');
const logoutBtn = document.getElementById('logout-btn');

async function loadProfile() {
    try {
        const response = await fetch('http://localhost:5000/auth/me', {
            method: 'GET',
            headers: { 'token': token }
        });

        if (response.ok) {
            const user = await response.json();
            // Afișăm un mesaj de salut și email-ul dedesubt
            profileInfo.innerHTML = `
                <p style="margin: 0; font-size: 18px;">Salut, <strong>${user.name || 'Pasionat de Fotbal'}</strong>!</p>
                <p style="margin: 3px 0 0 0; font-size: 14px; color: #666;">${user.email}</p>
            `;
        } else {
            profileInfo.innerHTML = '<p style="margin: 0; color: red;">Eroare la încărcarea profilului.</p>';
        }
    } catch (error) {
        console.error(error);
        profileInfo.innerHTML = '<p style="margin: 0; color: red;">Eroare de conexiune.</p>';
    }
}

logoutBtn.addEventListener('click', () => {
    const confirmLogout = confirm('Ești sigur că vrei să te deconectezi?');
    if (confirmLogout) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
});

loadProfile();