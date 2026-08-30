@echo off
title Uninstall Darkworld Telegram Bot Auto-Startup
cd /d "%~dp0"

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

if exist "%STARTUP_FOLDER%\DarkworldTelegramBot.lnk" (
    del "%STARTUP_FOLDER%\DarkworldTelegramBot.lnk"
    echo [OK] Removed auto-startup shortcut from Windows Startup folder.
) else (
    echo [INFO] No auto-startup shortcut found in Windows Startup folder.
)

call "%~dp0stop-bot.bat"
