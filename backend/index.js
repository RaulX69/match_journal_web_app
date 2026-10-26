const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authorize = require('./middleware/authorize');
const axios = require('axios');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));


const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, req.params.id + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Ruta pentru creare cont (Register)
app.post('/api/register', async (req, res) => {
    try {
        
        const { name, email, password } = req.body;

        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Acest email este deja folosit!' });
        }

        const salt = await bcrypt.genSalt(10);
        const bcryptPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
            [name, email, bcryptPassword]
        );

        res.json({ message: 'Cont creat cu succes!', user: newUser.rows[0] });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Eroare internă de server' });
    }
});

// Ruta pentru autentificare (Login)
app.post('/api/login', async (req, res) => {
    try {

        const { email, password } = req.body;

        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Email sau parolă incorectă!' });
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Email sau parolă incorectă!' });
        }

        const token = jwt.sign(
            { user_id: user.rows[0].id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ message: 'Autentificare reușită!', token: token });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Eroare internă de server' });
    }
});

// Ruta pentru obținerea datelor profilului utilizatorului curent
app.get('/auth/me', authorize, async (req, res) => {
    try {
        const user = await pool.query(
            'SELECT id, name, email FROM users WHERE id = $1', 
            [req.user]
        );

        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Utilizatorul nu a fost găsit.' });
        }

        res.json(user.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Eroare de server la încărcarea profilului.' });
    }
});

// Ruta pentru adăugarea unui meci nou în jurnal
app.post('/api/matches', authorize, async (req, res) => {
    try {
        const { home_team, away_team, api_match_id, home_score, away_score, match_date, rating, review, stadium_id, stadium_name, city, home_logo, away_logo } = req.body;
        
        let finalStadiumId = stadium_id;

        if (!finalStadiumId && stadium_name) {
            const existingStadium = await pool.query('SELECT id FROM stadiums WHERE name = $1', [stadium_name]);
            
            if (existingStadium.rows.length > 0) {
                finalStadiumId = existingStadium.rows[0].id;
            } else {
                finalStadiumId = Math.floor(Math.random() * 100000) + 900000;
            }
        }

        let lat = null;
        let lng = null;

        if (finalStadiumId && city) {
            try {
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`, {
                    headers: { 'User-Agent': 'FootballJournalApp/1.0', 'Accept-Language': 'en' }
                });
                let geoData = await geoRes.json();
                
                if ((!geoData || geoData.length === 0) && stadium_name) {
                    const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(stadium_name)}`, {
                        headers: { 'User-Agent': 'FootballJournalApp/1.0', 'Accept-Language': 'en' }
                    });
                    geoData = await fallbackRes.json();
                }

                if (geoData && geoData.length > 0) {
                    lat = geoData[0].lat;
                    lng = geoData[0].lon;
                }
            } catch (geoErr) {
                console.error('Eroare la găsirea coordonatelor:', geoErr.message);
            }
            await pool.query(
                `INSERT INTO stadiums (id, name, city, lat, lng) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (id) DO NOTHING`,
                [finalStadiumId, stadium_name, city, lat, lng]
            );
        }

        const newMatch = await pool.query(
            `INSERT INTO matches 
            (user_id, home_team, away_team, api_match_id, home_score, away_score, match_date, rating, review, stadium_id, home_logo, away_logo) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [req.user, home_team, away_team, api_match_id, home_score, away_score, match_date, rating, review, finalStadiumId, home_logo, away_logo]
        );

        res.json({ message: 'Meci salvat cu succes!', match: newMatch.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Eroare internă la salvarea meciului' });
    }
});

// Ruta pentru obținerea tuturor meciurilor pentru utilizatorul logat
app.get('/api/matches', authorize, async (req, res) => {
    try {

        const matches = await pool.query(
            'SELECT m.*, s.name AS stadium_name, s.city, s.lat, s.lng FROM matches m LEFT JOIN stadiums s ON m.stadium_id = s.id WHERE m.user_id = $1 ORDER BY m.match_date DESC',
            [req.user]
        );

        res.json(matches.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Eroare internă la citirea meciurilor' });
    }
});

// Ruta pentru editarea unui meci existent
app.put('/api/matches/:id', authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body;

        const updateMatch = await pool.query(
            'UPDATE matches SET rating = $1, review = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
            [rating, review, id, req.user]
        );

        if (updateMatch.rows.length === 0) {
            return res.status(404).json({ error: 'Meciul nu a fost găsit sau nu îți aparține.' });
        }

        res.json({ message: 'Meci actualizat cu succes!', match: updateMatch.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Eroare la actualizarea meciului' });
    }
});

// Ruta pentru ștergerea unui meci din jurnal
app.delete('/api/matches/:id', authorize, async (req, res) => {
    try {
        const { id } = req.params;

        const deleteMatch = await pool.query(
            'DELETE FROM matches WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user]
        );

        if (deleteMatch.rows.length === 0) {
            return res.status(404).json({ error: 'Meciul nu a fost găsit sau nu îți aparține.' });
        }

        res.json({ message: 'Meci șters definitiv din jurnal!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Eroare la ștergerea meciului' });
    }
});

app.get('/api/search-matches', async (req, res) => {
    // Extragem termenul căutat pentru a-l afișa în consolă (opțional)
    const { team } = req.query; 
    console.log(`Căutare simulată pentru: ${team}`);

    // DATE SIMULATE COMPLETE PENTRU PREZENTARE
    const mockMatches = [
        {
            fixture: { 
                id: 9991,
                date: "2024-05-15T19:00:00+00:00",
                venue: { id: 556, name: "Santiago Bernabéu", city: "Madrid" }
            },
            teams: {
                home: { name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" },
                away: { name: "Barcelona", logo: "https://media.api-sports.io/football/teams/529.png" }
            },
            goals: { home: 3, away: 2 }
        },
        {
            fixture: { 
                id: 9992,
                date: "2024-06-01T20:00:00+00:00",
                venue: { id: 489, name: "Wembley Stadium", city: "London" }
            },
            teams: {
                home: { name: "Borussia Dortmund", logo: "https://media.api-sports.io/football/teams/165.png" },
                away: { name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" }
            },
            goals: { home: 0, away: 2 }
        },
        {
            fixture: { 
                id: 9993,
                date: "2024-04-17T19:00:00+00:00",
                venue: { id: 151, name: "Etihad Stadium", city: "Manchester" }
            },
            teams: {
                home: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
                away: { name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" }
            },
            goals: { home: 1, away: 1 }
        }
    ];

    // Simulăm un mic delay pentru a părea că se încarcă de pe internet
    setTimeout(() => {
        // Returnăm datele în formatul pe care îl așteaptă frontend-ul tău
        res.json(mockMatches); 
    }, 500);
});

// Ruta pentru căutarea meciurilor după numele echipei folosind API-Football
app.get('/api/search-matches', authorize, async (req, res) => {
    try {
        const { team } = req.query; 

        if (!team) {
            return res.status(400).json({ error: 'Te rog să introduci numele unei echipe!' });
        }

        const teamResponse = await axios.get(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(team)}`, {
            headers: {
                'x-apisports-key': process.env.FOOTBALL_API_KEY
            }
        });
        
        if (!teamResponse.data.response || teamResponse.data.response.length === 0) {
            return res.json({ message: "Nu am găsit nicio echipă cu acest nume.", matches: [] });
        }

        const teamId = teamResponse.data.response[0].team.id;

        const currentYear = 2024;

        const matchesResponse = await axios.get(`https://v3.football.api-sports.io/fixtures?team=${teamId}&season=${currentYear}`, {
            headers: {
                'x-apisports-key': process.env.FOOTBALL_API_KEY
            }
        });

        res.json(matchesResponse.data.response);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Eroare la preluarea datelor externe' });
    }
});

// Ruta pentru încărcarea unei imagini la un meci
app.post('/api/matches/:id/image', authorize, upload.single('match_image'), async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Nicio imagine selectată.' });
        }

        const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;

        const updateMatch = await pool.query(
            'UPDATE matches SET image_url = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [imageUrl, id, req.user]
        );

        res.json({ message: 'Imagine încărcată!', imageUrl: imageUrl });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Eroare la încărcarea imaginii' });
    }
});

app.get('/', (req, res) => {
    res.send('Serverul funcționează perfect!');
});


app.listen(port, () => {
    console.log(`Serverul rulează pe portul ${port}`);
});