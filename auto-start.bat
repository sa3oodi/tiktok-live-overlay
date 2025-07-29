@echo off
:: TikTok Live Analytics Auto-Start Script
:: This will start the server automatically and minimize to system tray

echo Starting TikTok Live Analytics Server on Boot...
cd /d "c:\Users\sa3oo\Desktop\projects\TikTok Live"

:: Start the server in a minimized window
start /min "TikTok Live Server" node server.js

:: Wait a moment for server to start
timeout /t 3 /nobreak >nul

echo Server started successfully!
echo Available at: http://localhost:8081
echo.
echo You can now add this URL to OBS as a Browser Source:
echo http://localhost:8081
echo.
exit
