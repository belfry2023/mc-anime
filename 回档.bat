@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
set SRC=%~dp0saves-backup
set DST=%~dp0game\.minecraft\saves\NICE
if not exist "%SRC%" (echo [x] No backups: %SRC% & pause & exit /b 1)
echo Available backups:
set N=0
for /d %%d in ("%SRC%\NICE-*") do (
  set /a N+=1
  echo   !N!. %%~nxd
  set "B!N!=%%d"
)
if %N%==0 (echo [x] No backup folders. & pause & exit /b 1)
set /p PICK=Pick a number: 
if not defined B%PICK% (echo [x] Bad choice. & pause & exit /b 1)
echo [i] Close the game first. Press any key to restore.
pause >nul
if exist "%DST%.bak" rd /s /q "%DST%.bak"
if exist "%DST%" move "%DST%" "%DST%.bak" >nul
xcopy "!B%PICK%!" "%DST%\" /E /I /H /Y >nul
if errorlevel 1 (echo [x] Restore failed, previous save at %DST%.bak) else (echo [ok] Restored.)
pause