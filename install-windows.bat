@echo off
chcp 65001 >nul 2>nul
echo.
echo  Voice Clip - Windows Installer
echo  ===============================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Please install from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Show Node version
for /f "tokens=*" %%v in ('node -v') do echo  Node.js %%v detected

:: Create directory
if not exist "%USERPROFILE%\.voice-clip" mkdir "%USERPROFILE%\.voice-clip"

:: Download clipboard-server.js
echo.
echo  Downloading clipboard-server.js ...
curl -fsSL https://raw.githubusercontent.com/Tiny-cyber/voice-clip/main/clipboard-server.js -o "%USERPROFILE%\.voice-clip\clipboard-server.js"
if %errorlevel% neq 0 (
    echo  [ERROR] Download failed. Check your network connection.
    pause
    exit /b 1
)

:: Create start script
echo @echo off > "%USERPROFILE%\.voice-clip\start.bat"
echo title Voice Clip >> "%USERPROFILE%\.voice-clip\start.bat"
echo node "%USERPROFILE%\.voice-clip\clipboard-server.js" >> "%USERPROFILE%\.voice-clip\start.bat"

echo.
echo  ==============================
echo  Installation complete!
echo  ==============================
echo.
echo  To start:  double-click %USERPROFILE%\.voice-clip\start.bat
echo.
echo  To auto-start on login:
echo    1. Press Win+R, type: shell:startup
echo    2. Copy start.bat shortcut into that folder
echo.
echo  Opening setup page...
start "" "http://localhost:5678/setup"

:: Start the server
echo.
echo  Starting voice-clip server...
node "%USERPROFILE%\.voice-clip\clipboard-server.js"
