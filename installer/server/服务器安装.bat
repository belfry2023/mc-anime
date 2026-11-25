@echo off
setlocal
cd /d "%~dp0"
echo.
echo mc-anime 服务器一键安装
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server-install.ps1"
if errorlevel 1 pause
endlocal
