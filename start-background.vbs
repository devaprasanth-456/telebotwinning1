Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = strPath
pythonExe = "C:\Users\Deva Prasanth\AppData\Local\Programs\Python\Python314\python.exe"
If Not fso.FileExists(pythonExe) Then
    pythonExe = "python.exe"
End If

cmdLine = "cmd.exe /c """ & pythonExe & """ """ & strPath & "\start_automation.py"" >> """ & strPath & "\bot_background.log"" 2>&1"
WshShell.Run cmdLine, 0, False
