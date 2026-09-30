# Carte des bouées en mer

Site local qui affiche les bouées du monde (données NOAA NDBC) sur une carte : position, hauteur des vagues et température de l'eau, avec des courbes sur 48 h.

## Lancer le site
1. Installe Node.js 18 ou plus : https://nodejs.org
2. Dans ce dossier, lance `node server.js` (ou double-clique sur `demarrer.bat` sous Windows).
3. Ouvre http://localhost:3000

Aucune installation de paquets n'est nécessaire. Une connexion internet est requise.

## Organisation
- `server.js` : récupère les données de la NOAA, les met en cache 10 minutes et sert le site
- `public/extras.js` : thèmes, plein écran, phares, poissons par zone, liens vers les sources
- `public/fish3d.js` : modèle 3D des poissons (three.js chargé depuis internet)
- `public/index.html`, `style.css`, `app.js` : la page, le style et la carte

## Options
- Autre port : `PORT=8080 node server.js`
- Ouvrir le site aux autres appareils du réseau : `HOST=0.0.0.0 node server.js`

## Mettre le site en ligne
Sur Render, Railway ou Fly.io : envoie ce dossier sur GitHub, crée un service web Node, commande de démarrage `node server.js`. Le port et l'hôte sont détectés automatiquement (variable PORT). Tu obtiens un lien public `https://...`.
