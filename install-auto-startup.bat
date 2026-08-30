@echo off
title Install Darkworld Telegram Bot Auto-Startup
cd /d "%~dp0"

echo =============================================================
echo   INSTALLING DARKWORLD TELEGRAM BOT AUTO-STARTUP (24/7)
echo =============================================================
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_VBS=%TEMP%\CreateShortcut.vbs"

echo Creating Auto-Startup shortcut in Windows Startup folder...
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SHORTCUT_VBS%"
echo sLinkFile = "%STARTUP_FOLDER%\DarkworldTelegramBot.lnk" >> "%SHORTCUT_VBS%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%SHORTCUT_VBS%"
echo oLink.TargetPath = "wscript.exe" >> "%SHORTCUT_VBS%"
echo oLink.Arguments = """%~dp0start-background.vbs""" >> "%SHORTCUT_VBS%"
echo oLink.WorkingDirectory = "%~dp0" >> "%SHORTCUT_VBS%"
echo oLink.WindowStyle = 0 >> "%SHORTCUT_VBS%"
echo oLink.Description = "Darkworld Aviator Telegram Signal Bot Auto-Startup" >> "%SHORTCUT_VBS%"
echo oLink.Save >> "%SHORTCUT_VBS%"

cscript //nologo "%SHORTCUT_VBS%"
del "%SHORTCUT_VBS%"

echo.
echo [OK] Auto-Startup installed successfully!
echo The bot will now run AUTOMATICALLY in the background every time Windows boots up.
echo.
echo Starting the bot right now in the background...
wscript.exe "%~dp0start-background.vbs"
echo.
echo [SUCCESS] Bot is now active in the background!
echo You do NOT need to keep any terminal open.
echo Log output is saved to: bot_background.log
echo.
pause
