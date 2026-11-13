-- 1. Tabela pentru Utilizatori
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela pentru Stadioane
CREATE TABLE IF NOT EXISTS stadiums (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255),
    lat DECIMAL(9,6),
    lng DECIMAL(9,6)
);

-- 3. Tabela pentru Meciurile salvate în Jurnal
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    api_match_id INTEGER,
    home_team VARCHAR(255) NOT NULL,
    away_team VARCHAR(255) NOT NULL,
    home_logo VARCHAR(255),
    away_logo VARCHAR(255),
    home_score INTEGER,
    away_score INTEGER,
    match_date TIMESTAMP,
    rating INTEGER,
    review TEXT,
    stadium_id INTEGER,
    image_url VARCHAR(255),
    
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_stadium FOREIGN KEY (stadium_id) REFERENCES stadiums(id) ON DELETE SET NULL
);