@echo off
echo ========================================================
echo   Persian Accounting System - Windows Server Installer
echo ========================================================
echo.

echo Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/ (LTS Version)
    pause
    exit /b
)

echo Node.js is installed. Version:
node -v

echo.
echo Installing global dependencies (Vite, TSX)...
call npm install -g vite tsx
if %errorlevel% neq 0 (
    echo [WARNING] Global dependencies installation failed. Trying with Iranian mirror...
    call npm config set registry https://registry.npmmirror.com
    call npm install -g vite tsx
)

echo.
echo Installing project dependencies...
call npm config set registry https://registry.npmmirror.com
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install project dependencies.
    pause
    exit /b
)

echo.
echo Building the application...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed.
    pause
    exit /b
)

echo.
echo ========================================================
echo [SUCCESS] Installation Completed Successfully!
echo You can now run "start_server.bat" to start the system.
echo ========================================================
pause
