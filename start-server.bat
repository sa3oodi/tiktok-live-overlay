@echo off
echo Starting TikTok Live Overlay Server...
echo.
echo Server will be available at: http://localhost:8081
echo Overlay Generator: http://localhost:8081
echo Direct Overlay URL: http://localhost:8081/overlay?username=USERNAME
echo.
echo For OBS Studio:
echo 1. Add Browser Source
echo 2. URL: http://localhost:8081/overlay?username=TIKTOK_USERNAME
echo 3. Width: 380px, Height: 480px
echo 4. Enable transparent background
echo.
cd /d "%~dp0"
node server.js
pause
