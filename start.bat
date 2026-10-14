@echo off
chcp 65001 > nul
setlocal EnableDelayedExpansion

:: Navigate to script directory
cd /d "%~dp0"

echo ======================================================================
echo    ____      _            ____                  
echo   / ___^|___ ^| ^| ___  _ __/ ___^| _ __   __ _ _ __  
echo  ^| ^|   / _ \^| ^|/ _ \^| '__\___ \^| '_ \ / _` ^| '_ \ 
echo  ^| ^|__^| (_) ^| ^| (_) ^| ^|   ___) ^| ^| ^| ^| (_^| ^| ^|_) ^|
echo   \____\___/^|_^|\___/^|_^|  ^|____/^|_^| ^|_^|\__,_^| .__/ 
echo                                              ^|_^|    
echo   ColorSnap - Image to Color Palette Extractor
echo ======================================================================
echo.

:: 1. Check if Node.js is available
echo [*] Checking for Node.js runtime...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Node.js was not found in your system PATH.
    echo.
    echo ColorSnap is built as a zero-dependency web application.
    echo You can install Node.js from https://nodejs.org for the local dev server.
    echo.
    echo [*] Opening index.html directly in your default browser...
    start "" "index.html"
    echo.
    echo Press any key to exit.
    pause >nul
    exit /b 0
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo [OK] Detected Node.js !NODE_VERSION!
echo.

:: 2. Launch browser in background after 1.5 seconds
echo [*] Preparing to launch ColorSnap in your default browser...
start /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: 3. Start local server
echo [*] Starting ColorSnap local development server on http://localhost:3000
echo [*] Press Ctrl+C at any time in this window to stop the server.
echo.
node server.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] The server exited with an error code: %ERRORLEVEL%
    echo Keeping window open for troubleshooting.
    pause
)
