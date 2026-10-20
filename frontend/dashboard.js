const savedMatchesContainer = document.getElementById('saved-matches-container');
const TEMP_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJpYXQiOjE3OTI1MDk1NzMsImV4cCI6MTc5MjUxMzE3M30.mnbpnWM0Sq5ggC-LxUpQ_GwEtzu0pGKQM_VtIV_qQ_k"; // Nu uita să pui token-ul!

async function loadSavedMatches() {
    try {
        const response = await fetch('http://localhost:5000/api/matches', {
            method: 'GET',
            headers: { 'token': TEMP_TOKEN }
        });

        const matches = await response.json();
        savedMatchesContainer.innerHTML = '';

        if (matches.length === 0) {
            savedMatchesContainer.innerHTML = '<p style="text-align: center;">Nu ai niciun meci salvat în jurnal momentan.</p>';
            return;
        }

        matches.forEach(match => {
            const matchDate = new Date(match.match_date).toLocaleDateString('ro-RO');
            const matchId = match.id; // Asigură-te că id-ul corespunde cu coloana din baza ta de date (poate fi match_id)
            
            const matchCard = document.createElement('div');
            matchCard.style.border = '2px solid #28a745';
            matchCard.style.padding = '15px';
            matchCard.style.borderRadius = '8px';
            matchCard.style.backgroundColor = 'white';
            matchCard.style.marginBottom = '20px'; // Spațiu între meciuri
            
            // Structura cartelei, inclusiv zona de recenzie
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
                
                <!-- Secțiunea de recenzii și stele -->
                <div style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 15px; text-align: center;">
                    <h4 style="margin-bottom: 10px;">Cum ți s-a părut meciul?</h4>
                    
                    <!-- Stelele -->
                    <div class="stars-container" style="font-size: 24px; cursor: pointer; color: #ccc; margin-bottom: 10px;">
                        <span class="star" data-value="1">★</span>
                        <span class="star" data-value="2">★</span>
                        <span class="star" data-value="3">★</span>
                        <span class="star" data-value="4">★</span>
                        <span class="star" data-value="5">★</span>
                    </div>
                    
                    <!-- Câmpul de text -->
                    <textarea class="review-input" rows="3" style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" placeholder="Scrie părerea ta aici...">${match.review || ''}</textarea>
                    <br>
                    
                    <!-- Butonul de salvare recenzie -->
                    <button class="save-review-btn" style="margin-top: 10px; padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Salvează Părerea
                    </button>
                </div>
            `;
            
            savedMatchesContainer.appendChild(matchCard);

            // --- LOGICA PENTRU ACEASTĂ CARTELĂ SPECIFICĂ ---
            
            const stars = matchCard.querySelectorAll('.star');
            const reviewInput = matchCard.querySelector('.review-input');
            const saveReviewBtn = matchCard.querySelector('.save-review-btn');
            
            let currentRating = match.rating || 0; // Luăm rating-ul deja existent, sau 0

            // Funcție pentru a colora stelele în funcție de rating-ul curent
            const updateStarsUI = (ratingValue) => {
                stars.forEach(star => {
                    if (star.getAttribute('data-value') <= ratingValue) {
                        star.style.color = '#ffc107'; // Auriu
                    } else {
                        star.style.color = '#ccc'; // Gri
                    }
                });
            };

            // Colorăm stelele inițial, dacă meciul avea deja o notă
            updateStarsUI(currentRating);

            // Când dăm click pe o stea
            stars.forEach(star => {
                star.addEventListener('click', () => {
                    currentRating = star.getAttribute('data-value');
                    updateStarsUI(currentRating);
                });
            });

            // Când apăsăm butonul "Salvează Părerea"
            saveReviewBtn.addEventListener('click', async () => {
                const reviewText = reviewInput.value.trim();
                
                try {
                    saveReviewBtn.textContent = 'Se salvează...';
                    
                    const updateRes = await fetch(`http://localhost:5000/api/matches/${matchId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'token': TEMP_TOKEN
                        },
                        body: JSON.stringify({
                            rating: currentRating,
                            review: reviewText
                        })
                    });

                    if (updateRes.ok) {
                        saveReviewBtn.textContent = '✓ Salvat!';
                        saveReviewBtn.style.backgroundColor = '#28a745';
                        setTimeout(() => {
                            saveReviewBtn.textContent = 'Salvează Părerea';
                            saveReviewBtn.style.backgroundColor = '#007bff';
                        }, 2000); // Resetăm butonul după 2 secunde
                    } else {
                        alert('Eroare la salvarea recenziei.');
                        saveReviewBtn.textContent = 'Salvează Părerea';
                    }
                } catch (error) {
                    console.error(error);
                    alert('Eroare de conexiune.');
                }
            });
        });

    } catch (error) {
        console.error('Eroare:', error);
        savedMatchesContainer.innerHTML = '<p style="text-align: center; color: red;">Eroare la conectarea cu serverul.</p>';
    }
}

loadSavedMatches();