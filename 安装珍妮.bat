@echo off
setlocal
chcp 65001 >nul
where py >nul 2>nul
if errorlevel 1 goto python
py -3 "%~dp0tools\install_jennysp.py" %*
goto done
:python
where python >nul 2>nul
if errorlevel 1 goto missing
python "%~dp0tools\install_jennysp.py" %*
goto done
:missing
echo 请安装 Python 3.8 或更高版本，然后重新运行。
set "result=1"
goto finish
:done
set "result=%errorlevel%"
:finish
pause
exit /b %result%
