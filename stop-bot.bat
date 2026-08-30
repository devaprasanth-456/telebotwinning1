@echo off
title Stop Darkworld Telegram Bot
cd /d "%~dp0"

echo Stopping any running Telegram Bot background processes...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq DarkworldBot*" >nul 2>&1
wmic process where "commandline like '%%telegram-bot.cjs%%'" delete >nul 2>&1

echo.
echo [OK] Darkworld Telegram Bot has been stopped.
echo.
pause
