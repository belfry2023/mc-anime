@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动 Minecraft 1.20.1 Forge（第一次冷启动大约要 40~60 秒）...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch-game.ps1"
echo.
echo 启动命令已发出。如果游戏窗口没出来，看 logs\latest.log 的最后几行。
pause
