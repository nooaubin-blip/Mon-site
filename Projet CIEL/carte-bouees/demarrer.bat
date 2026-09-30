@echo off
cd /d "%~dp0"
rem Ouvre le site en plein écran dans Edge (F11 pour quitter), puis lance le serveur
start "" msedge --start-fullscreen --user-data-dir="%TEMP%\carte-bouees-edge" http://localhost:3000
node server.js
pause
