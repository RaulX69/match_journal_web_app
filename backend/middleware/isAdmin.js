const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

module.exports = async function (req, res, next) {
    try {
        const userQuery = await pool.query('SELECT role FROM users WHERE id = $1', [req.user]);
        
        if (userQuery.rows.length > 0 && userQuery.rows[0].role === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Acces interzis! Doar administratorii pot efectua această acțiune.' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Eroare la verificarea permisiunilor de administrator.' });
    }
};