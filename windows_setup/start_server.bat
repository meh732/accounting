@echo off
echo ========================================================
echo   Persian Accounting System - Starting Server...
echo ========================================================
echo.

set PORT=3000
set HOST=0.0.0.0

echo Finding your Local IP Address...
for /f "tokens=14" %%a in ('ipconfig ^| findstr IPv4') do set _IP=%%a
echo Your Server IP is: %_IP%
echo Client systems can access the software via: http://%_IP%:%PORT%
echo.

node server.js
pause
