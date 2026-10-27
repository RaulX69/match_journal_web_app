const savedMatchesContainer = document.getElementById('saved-matches-container');
const token = localStorage.getItem('token');
let map;

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
        renderMap(matches);
        savedMatchesContainer.innerHTML = '';

        if (matches.length === 0) {
            savedMatchesContainer.innerHTML = '<p style="text-align: center;">Nu ai niciun meci salvat în jurnal momentan.</p>';
            return;
        }

        matches.forEach(match => {
            const matchDate = new Date(match.match_date).toLocaleDateString('ro-RO');
            const matchId = match.id;
            
            const matchCard = document.createElement('div');
            matchCard.className = 'match-card';
            
            matchCard.innerHTML = `
                <button class="delete-x-btn" data-id="${match.id}">✖</button>
                <div class="match-header" style="display: flex; justify-content: space-between; align-items: center;">
                    
                    <div style="flex: 1; text-align: center;">
                        <img src="${match.home_logo || 'default-logo.png'}" alt="Home Logo" style="width: 50px; height: 50px; object-fit: contain; margin-bottom: 5px;">
                        <div class="team-name">${match.home_team}</div>
                    </div>
                    
                    <div style="text-align: center;">
                        <div class="score-badge">${match.home_score ?? '-'} : ${match.away_score ?? '-'}</div>
                        <div style="margin-top: 8px; font-size: 13px; color: #aaa;">${matchDate}</div>
                    </div>
                    
                    <div style="flex: 1; text-align: center;">
                        <img src="${match.away_logo || 'default-logo.png'}" alt="Away Logo" style="width: 50px; height: 50px; object-fit: contain; margin-bottom: 5px;">
                        <div class="team-name">${match.away_team}</div>
                    </div>
                    
                </div>
                
                <div style="margin-top: 20px; border-top: 1px dashed #eaeaea; padding-top: 20px; text-align: center;">
                    
                    <div class="stars-container" style="font-size: 28px; cursor: pointer; margin-bottom: 15px;">
                        <span class="star" data-value="1">★</span>
                        <span class="star" data-value="2">★</span>
                        <span class="star" data-value="3">★</span>
                        <span class="star" data-value="4">★</span>
                        <span class="star" data-value="5">★</span>
                    </div>
                    
                    <textarea class="review-input" rows="3" placeholder="Scrie părerea ta aici...">${match.review || ''}</textarea>
                    
                    <div style="margin-top: 15px; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                        <button class="btn btn-primary save-review-btn">Salvează Părerea</button>
                    </div>
                </div>

                <div style="margin-top: 20px; padding: 15px; border-radius: 8px; text-align: center;">
                    ${match.image_url 
                        ? `<img src="${match.image_url}" alt="Poză meci" style="max-width: 100%; max-height: 300px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">` 
                        : `<p style="font-size: 14px; margin-bottom: 10px;">Nu ai adăugat o poză încă.</p>`
                    }
                    <div style="display: flex; justify-content: center; gap: 10px; align-items: center;">
                        <input type="file" class="image-input" accept="image/*" style="font-size: 14px; max-width: 220px;">
                        <button class="btn btn-info upload-image-btn">Încarcă Poză</button>
                    </div>
                </div>
            `;
            
            savedMatchesContainer.appendChild(matchCard);
            
            const stars = matchCard.querySelectorAll('.star');
            const reviewInput = matchCard.querySelector('.review-input');
            const saveReviewBtn = matchCard.querySelector('.save-review-btn');
            const imageInput = matchCard.querySelector('.image-input');
            const uploadImageBtn = matchCard.querySelector('.upload-image-btn');

            uploadImageBtn.addEventListener('click', async () => {
                const file = imageInput.files[0];
                if (!file) {
                    alert('Te rog să selectezi o imagine mai întâi.');
                    return;
                }

                const formData = new FormData();
                formData.append('match_image', file);

                try {
                    uploadImageBtn.textContent = 'Se încarcă...';
                    const response = await fetch(`http://localhost:5000/api/matches/${matchId}/image`, {
                        method: 'POST',
                        headers: {
                            'token': token
                        },
                        body: formData
                    });

                    if (response.ok) {
                        alert('Poză adăugată cu succes!');
                        loadSavedMatches(); 
                    } else {
                        alert('Eroare la salvarea pozei.');
                        uploadImageBtn.textContent = '📷 Încarcă';
                    }
                } catch (error) {
                    console.error(error);
                    alert('Eroare de conexiune.');
                    uploadImageBtn.textContent = '📷 Încarcă';
                }
            });
            
            let currentRating = match.rating || 0;

            const updateStarsUI = (ratingValue) => {
                stars.forEach(star => {
                    if (star.getAttribute('data-value') <= ratingValue) {
                        star.style.color = '#ffc107';
                    } else {
                        star.style.color = '#ccc';
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

            const deleteBtn = matchCard.querySelector('.delete-x-btn');

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

function renderMap(matches) {
    if (map) {
        map.remove();
    }

    map = L.map('map').setView([48.0, 15.0], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let hasMarkers = false;

    matches.forEach(match => {
        if (match.lat && match.lng) {
            hasMarkers = true;
            const marker = L.marker([match.lat, match.lng]).addTo(map);
            
            marker.bindPopup(`
                <strong>${match.stadium_name || 'Stadion'}</strong><br>
                ${match.home_team} vs ${match.away_team}<br>
                Scor: ${match.home_score} - ${match.away_score}
            `);
        }
    });
}

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
            const isAdmin = user.role === 'admin' || localStorage.getItem('userRole') === 'admin';
            const adminBadge = isAdmin 
                ? `<span style="color: gold; font-weight: bold; font-size: 14px; margin-left: 10px;">⭐ Administrator</span>` 
                : '';

            profileInfo.innerHTML = `
                <p style="margin: 0; font-size: 18px;">Salut, <strong>${user.name || 'Pasionat de Fotbal'}</strong>!</p>
                <div style="display: flex; align-items: center; margin-top: 3px;">
                    <p style="margin: 0; font-size: 14px; color: #666;">${user.email}</p>
                    ${adminBadge}
                </div>
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