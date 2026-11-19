@echo off
chcp 65001 >nul
setlocal
set SRC=%~dp0game\.minecraft\saves\NICE
set DST=%~dp0saves-backup
if not exist "%SRC%" (echo [x] NICE save not found: %SRC% & pause & exit /b 1)
if not exist "%DST%" mkdir "%DST%"
for /f "tokens=2 delims==" %%i in ('wmic os get localdatetime /value') do set DT=%%i
set STAMP=%DT:~0,8%-%DT:~8,6%
echo [i] Close the game first (Esc - Save and Quit), then press any key to back up.
pause >nul
xcopy "%SRC%" "%DST%\NICE-%STAMP%\" /E /I /H /Y >nul
if errorlevel 1 (echo [x] Backup failed.) else (echo [ok] Saved to %DST%\NICE-%STAMP%)
pause