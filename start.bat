@echo off
title Cyepro Solutions - Dev Servers

echo Starting Backend and Frontend dev servers...
echo.

:: Start Backend in a new terminal window
start "Backend - Node/Express" cmd /k "cd /d "D:\Cyepro Solutions\engine-next-supabase\backend" && npm run dev"

:: Small delay before starting frontend
timeout /t 2 /nobreak >nul

:: Start Frontend in a new terminal window
start "Frontend - Next.js" cmd /k "cd /d "D:\Cyepro Solutions\engine-next-supabase\frontend" && npm run dev"

echo Both servers are starting in separate windows.
echo   Backend  -> http://localhost:3000 (or configured port)
echo   Frontend -> http://localhost:3001 (or configured port)
echo.
pause
