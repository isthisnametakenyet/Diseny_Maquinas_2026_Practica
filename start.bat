@echo off
rem Serves this folder on http://localhost:8150 and opens it in the browser.
rem The page uses JavaScript modules, which browsers refuse to load from a file opened by double-click.
rem Needs Python (https://www.python.org). Close this window, or press Ctrl + C, to stop the server.
cd /d "%~dp0"
set PORT=8150

where python >nul 2>nul
if %errorlevel%==0 (
  set PY=python
) else (
  where py >nul 2>nul
  if errorlevel 1 (
    echo Python was not found. Install it from https://www.python.org and run this file again.
    pause
    exit /b 1
  )
  set PY=py
)

start "" "http://localhost:%PORT%/"
%PY% -m http.server %PORT%
pause
