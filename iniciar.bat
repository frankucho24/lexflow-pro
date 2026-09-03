@echo off
cd /d "%~dp0"
echo Iniciando LexFlow Pro (Sistema de Expedientes)...
echo Abre tu navegador en: http://localhost:5000
echo Para acceder desde celular/otros equipos usa la IP local de esta PC.
echo.
python server.py
pause
