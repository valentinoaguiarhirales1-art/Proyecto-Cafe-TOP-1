@echo off
title Cafe Exquisito - Launcher
chcp 65001 >nul
cls
echo ==============================================================
echo   ☕ INICIANDO CAFÉ EXQUISITO FULL STACK v2.5.0 ☕
echo   Entorno local para pruebas
echo ==============================================================
echo.
echo [1/2] Iniciando Servidor Backend (Puerto 5000)...
start "Backend - Cafe API (Puerto 5000)" cmd /k "cd /d %~dp0backend && npm run dev"

echo [2/2] Iniciando Frontend Vite (Puerto 3000)...
start "Frontend - Cafe Web PWA (Puerto 3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ==============================================================
echo   ✨ Servidores lanzados exitosamente!
echo.
echo   👉 Sitio web: http://localhost:3000
echo   Antes de probar el panel, crea una cuenta de prueba.
echo ==============================================================
echo.
echo Abriendo tu navegador en http://localhost:3000 ...
timeout /t 3 /nobreak >nul
start http://localhost:3000
echo Listo!
pause
