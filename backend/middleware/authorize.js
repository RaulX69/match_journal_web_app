const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = async (req, res, next) => {
  try {
    // 1. Căutăm token-ul în header-ul cererii
    const jwtToken = req.header("token");

    // 2. Dacă nu există niciun token, respingem accesul
    if (!jwtToken) {
      return res.status(403).json("Acces respins! Nu ești autentificat.");
    }

    // 3. Verificăm dacă token-ul este valid (neschimbat și neexpirat)
    const payload = jwt.verify(jwtToken, process.env.JWT_SECRET);

    // 4. Extragem ID-ul utilizatorului și îl lipim de cerere pentru a fi folosit mai departe
    req.user = payload.user_id;
    
    // Totul e în regulă, dăm voie cererii să treacă mai departe spre rută
    next();
    
  } catch (err) {
    console.error(err.message);
    return res.status(403).json("Token invalid sau expirat.");
  }
};