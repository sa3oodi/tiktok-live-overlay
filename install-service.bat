@echo off
echo Installing TikTok Live Overlay as Windows Service...
echo.
echo This will require NSSM (Non-Sucking Service Manager)
echo Download from: https://nssm.cc/download
echo.
echo After downloading NSSM:
echo 1. Extract nssm.exe to this folder
echo 2. Run this script as Administrator
echo.

if not exist "nssm.exe" (
    echo ERROR: nssm.exe not found in current directory
    echo Please download NSSM and place nssm.exe in this folder
    echo Download: https://nssm.cc/download
    pause
    exit /b 1
)

echo Installing service...
nssm install "TikTokLiveOverlay" "%~dp0\node.exe" "%~dp0\server.js"
nssm set "TikTokLiveOverlay" AppDirectory "%~dp0"
nssm set "TikTokLiveOverlay" DisplayName "TikTok Live Overlay Server"
nssm set "TikTokLiveOverlay" Description "Real-time TikTok Live analytics overlay for OBS Studio"
nssm set "TikTokLiveOverlay" Start SERVICE_AUTO_START
nssm set "TikTokLiveOverlay" ObjectName LocalSystem
nssm set "TikTokLiveOverlay" Type SERVICE_WIN32_OWN_PROCESS

echo Starting service...
nssm start "TikTokLiveOverlay"

echo.
echo ✅ Service installed successfully!
echo The server will now start automatically with Windows
echo.
echo Service Management:
echo - Start: nssm start TikTokLiveOverlay
echo - Stop: nssm stop TikTokLiveOverlay  
echo - Remove: nssm remove TikTokLiveOverlay confirm
echo.
pause
