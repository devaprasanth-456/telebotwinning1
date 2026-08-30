Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = strPath
cmdLine = "cmd.exe /c node """ & strPath & "\telegram-bot.cjs"" >> """ & strPath & "\bot_background.log"" 2>&1"
WshShell.Run cmdLine, 0, False
