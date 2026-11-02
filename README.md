# Match Journal App
Aplicație de Urmărire a Meciurilor de Fotbal

„Match Journal” este o aplicație web full-stack dezvoltată pentru pasionații de fotbal. Platforma permite utilizatorilor să caute meciuri reale, să le adauge într-un jurnal personalizat, să lase recenzii și să vizualizeze locația stadioanelor pe o hartă interactivă. Aplicația dispune de un sistem robust de autentificare și un Panou de Administrare complet (Role-Based Access Control).

Funcționalități Principale

Pentru Utilizatori (User)

Autentificare Securizată: Sistem de Înregistrare și Logare protejat prin token-uri (JWT) și parole criptate (bcrypt).

Căutare Meciuri Reale: Integrare cu API-Football pentru a prelua date exacte despre echipe, scoruri și stadioane.

Jurnal Personalizat (Dashboard): Posibilitatea de a salva meciuri, de a le acorda o notă (rating), de a scrie păreri personale și de a atașa imagini proprii.

Hărți Interactive: Vizualizarea automată a locației stadionului unde s-a jucat meciul (integrat prin Nominatim și Leaflet.js).

Pentru Administratori (Admin)

Panou de Control Dedicat: O interfață ascunsă utilizatorilor normali.

Gestionarea Utilizatorilor: Vizualizarea tuturor conturilor înregistrate, alături de meciurile salvate de fiecare.

Promovare Roluri: Posibilitatea de a promova un utilizator normal la gradul de Administrator.

Moderare (Ștergere): Ștergerea meciurilor specifice din jurnalele altor utilizatori sau ștergerea definitivă a conturilor.

Tehnologii Utilizate

Frontend: HTML5, CSS3, JavaScript.

Backend: Node.js, Express.js.

Bază de Date: PostgreSQL.

Securitate: JSON Web Tokens (JWT), bcrypt, Middleware personalizat pentru verificarea rolurilor (isAdmin, authorize).

API-uri Externe:

API-Football (Date sportive).

Nominatim OpenStreetMap (Geocoding pentru stadioane).

Alte biblioteci: Multer (pentru upload de imagini), Axios / Fetch API.
