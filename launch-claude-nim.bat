@echo off
REM Claude Code CLI with NVIDIA NIM Backend
REM No subscription needed - uses NVIDIA NIM models
REM
REM Usage: Run this file (or: launch-claude-nim.bat)
REM
REM Make sure: npm run dev is running in another terminal (from d:\Claude-ai-proxy)

setlocal enabledelayedexpansion

echo.
echo ========================================================
echo Claude Code CLI + NVIDIA NIM (No Subscription)
echo ========================================================
echo.

REM Check if proxy is running
echo Checking proxy status...
timeout /t 1 /nobreak >nul
curl -s http://localhost:3000/health >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Proxy is not running!
    echo.
    echo Start the proxy in another terminal:
    echo   cd d:\Claude-ai-proxy
    echo   npm run dev
    echo.
    pause
    exit /b 1
)
echo OK - Proxy is running
echo.

REM Set environment variables
set "ANTHROPIC_BASE_URL=http://localhost:3000"
set "ANTHROPIC_API_KEY=proxy-key"

REM Default model (can be changed)
set "MODEL=moonshotai/kimi-k2.6"

echo Launching Claude Code CLI...
echo   Model: !MODEL!
echo   Backend: NVIDIA NIM
echo   Login: Not required
echo.

REM Launch Claude code CLI with NVIDIA NIM
claude --bare --model !MODEL! --append-system-prompt "You are powered by NVIDIA NIM via a local proxy."

echo.
echo Claude Code CLI closed.
pause
