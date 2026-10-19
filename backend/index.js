const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authorize = require('./middleware/authorize');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

// Ruta pentru creare cont (Register)
app.post('/api/register', async (req, res) => {
    try {
        
        const { email, password } = req.body;

        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Acest email este deja folosit!' });
        }

        const salt = await bcrypt.genSalt(10);
        const bcryptPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
            [email, bcryptPassword]
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

// Ruta pentru adăugarea unui meci nou în jurnal
app.post('/api/matches', authorize, async (req, res) => {
    try {

        const { home_team, away_team, home_score, away_score, match_date, rating, review } = req.body;
        
        const newMatch = await pool.query(
            `INSERT INTO matches 
            (user_id, home_team, away_team, home_score, away_score, match_date, rating, review) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [req.user, home_team, away_team, home_score, away_score, match_date, rating, review]
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
            'SELECT * FROM matches WHERE user_id = $1 ORDER BY match_date DESC',
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

app.get('/', (req, res) => {
    res.send('Serverul funcționează perfect!');
});


app.listen(port, () => {
    console.log(`Serverul rulează pe portul ${port}`);
});