@echo off
cd /d "%~dp0lexflow"
echo Iniciando LexFlow Pro (modo desarrollo)...
echo Abre tu navegador en: http://localhost:5173
echo Para detener: Ctrl + C
echo.
npm.cmd run dev
pause
