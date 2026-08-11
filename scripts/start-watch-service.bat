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
REM   * This wrapper writes to logs\service-stdout.log (relative to project).
REM   * The watcher itself writes to logs\out.log via its PM2 config (when
REM     started via PM2) OR to stdout when started directly — both paths
REM     land here because we redirect.
REM ============================================================================

setlocal
cd /d "%~dp0\.."

set "LOG_DIR=%cd%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
set "LOG_FILE=%LOG_DIR%\service-stdout.log"

:loop
echo [%DATE% %TIME%] Starting watch-file-server... >> "%LOG_FILE%"
call :run_node >> "%LOG_FILE%" 2>&1
set "EXIT_CODE=%errorlevel%"
echo [%DATE% %TIME%] Exited with code %EXIT_CODE%, restarting in 5s... >> "%LOG_FILE%"
timeout /t 5 /nobreak >nul
goto loop

REM ---------------------------------------------------------------------------
REM Actual node invocation. Kept in a subroutine so the redirect in `:loop`
REM captures both stdout and stderr of node itself.
REM ---------------------------------------------------------------------------
:run_node
node dist\index.js
exit /b %errorlevel%