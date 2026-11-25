@echo off
setlocal
cd /d "%~dp0"
echo.
echo mc-anime 客户端安装程序
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
if errorlevel 1 pause
endlocal
