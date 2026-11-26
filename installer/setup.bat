@echo off
setlocal
cd /d "%~dp0"
echo.
echo mc-anime installer
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
if errorlevel 1 pause
endlocal
