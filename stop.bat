@echo off
echo Stopping Vite development server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173"') do (
    echo Killing process with PID: %%a
    taskkill /F /PID %%a 2>nul
)
echo Done.
pause
