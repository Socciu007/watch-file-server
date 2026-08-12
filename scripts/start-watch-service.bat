@echo off
REM ============================================================================
REM Watch-file-server service wrapper.
REM
REM This is the Windows-native alternative to PM2 + pm2-windows-startup.
REM Why we ship it: PM2 7.x's stdio handling on Windows is unreliable — the
REM child process gets spurious SIGINT shortly after start and stdout is not
REM captured to the configured log files. This batch file is dead-simple:
REM run the node app, and on any exit code, sleep 5s and try again. Forever.
REM
REM Pair this with Task Scheduler so the wrapper itself starts at boot:
REM
REM   npm run task:install     # one-shot, registers "At startup" task
REM   npm run task:uninstall   # removes the task
REM   npm run task:status      # shows whether it's installed + last run
REM
REM Or do it by hand:
REM   schtasks /create /tn "WatchFileServer" ^
REM       /tr "E:\projectVN\watch-file-server\scripts\start-watch-service.bat" ^
REM       /sc onstart /ru SYSTEM /rl HIGHEST /f
REM
REM Logs:
REM   * All output goes to the terminal where this .bat is running. When run
REM     directly, you'll see the watcher's logs stream in real time.
REM   * When run as a Task Scheduler service (no terminal), output has nowhere
REM     to go — pipe to a file if you want persistence:
REM         schtasks ... /tr "cmd /c ...start-watch-service.bat > logs\svc.log 2>&1"
REM ============================================================================

setlocal
cd /d "%~dp0\.."

:loop
echo [%DATE% %TIME%] Starting watch-file-server...
call :run_node
set "EXIT_CODE=%errorlevel%"
echo [%DATE% %TIME%] Exited with code %EXIT_CODE%, restarting in 5s...
timeout /t 5 /nobreak >nul
goto loop

REM ---------------------------------------------------------------------------
REM Actual node invocation. Kept in a subroutine so the calling `call` returns
REM the exit code (via errorlevel) without inheriting `goto` flow control.
REM ---------------------------------------------------------------------------
:run_node
node dist\index.js
exit /b %errorlevel%