const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authorize = require('./middleware/authorize');

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
        // Extragem email-ul și parola trimise de utilizator
        const { email, password } = req.body;

        // 1. Verificăm dacă email-ul există deja în baza de date
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Acest email este deja folosit!' });
        }

        // 2. Criptăm parola (hashing)
        const salt = await bcrypt.genSalt(10);
        const bcryptPassword = await bcrypt.hash(password, salt);

        // 3. Inserăm noul utilizator în baza de date
        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
            [email, bcryptPassword]
        );

        // Răspundem cu datele utilizatorului (fără parolă!)
        res.json({ message: 'Cont creat cu succes!', user: newUser.rows[0] });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Eroare internă de server' });
    }
});

// Ruta pentru autentificare (Login)
app.post('/api/login', async (req, res) => {
    try {
        // 1. Extragem datele trimise de utilizator
        const { email, password } = req.body;

        // 2. Căutăm utilizatorul în baza de date
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Email sau parolă incorectă!' });
        }

        // 3. Verificăm dacă parola introdusă se potrivește cu cea criptată din DB
        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Email sau parolă incorectă!' });
        }

        // 4. Generăm token-ul JWT (brățara de acces)
        const token = jwt.sign(
            { user_id: user.rows[0].id }, // Ascundem ID-ul utilizatorului în token
            process.env.JWT_SECRET,       // Semnăm cu cheia noastră secretă
            { expiresIn: '1h' }           // Setăm o valabilitate de o oră
        );

        // Răspundem cu token-ul generat
        res.json({ message: 'Autentificare reușită!', token: token });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Eroare internă de server' });
    }
});

// 1. CREATE: Adăugarea unui meci nou în jurnal
app.post('/api/matches', authorize, async (req, res) => {
    try {
        // Extragem datele trimise din interfață/Thunder Client
        const { home_team, away_team, home_score, away_score, match_date, rating, review } = req.body;
        
        // req.user vine direct din middleware-ul 'authorize' (este ID-ul extras din token)
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

// 2. READ: Obținerea tuturor meciurilor pentru utilizatorul logat
app.get('/api/matches', authorize, async (req, res) => {
    try {
        // Selectăm meciurile din DB și le ordonăm descrescător după dată (cele mai noi primele)
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

// 3. UPDATE: Editarea unui meci existent
app.put('/api/matches/:id', authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body; // Vom permite modificarea doar a rating-ului și recenziei

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

// 4. DELETE: Ștergerea unui meci din jurnal
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

app.get('/', (req, res) => {
    res.send('Serverul funcționează perfect!');
});


app.listen(port, () => {
    console.log(`Serverul rulează pe portul ${port}`);
});