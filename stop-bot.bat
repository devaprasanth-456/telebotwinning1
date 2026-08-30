@echo off
title Stop Lucky Jet Autonomous System
cd /d "%~dp0"

echo Stopping all background automation processes...
powershell -NoProfile -Command "Get-Process -Name node,python -ErrorAction SilentlyContinue | Where-Object { try { $_.Path -like '*python*' -or $_.CommandLine -like '*telegram*' -or $_.CommandLine -like '*start_automation*' } catch {} } | Stop-Process -Force -ErrorAction SilentlyContinue"

echo.
echo [OK] All Lucky Jet autonomous background services stopped.
echo.
pause
