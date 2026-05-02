#!/usr/bin/env pwsh
<#
  Launch Claude Code CLI with NVIDIA NIM models (no subscription needed)
  
  Features:
  - No Claude subscription required
  - Uses NVIDIA NIM models (cheap, fast)
  - Works with full Claude code features
  - Proxy auto-translates requests
  
  Usage:
    .\launch-claude-nim.ps1
    .\launch-claude-nim.ps1 -Model "meta/llama-3.1-8b-instruct"
    .\launch-claude-nim.ps1 -Model "mistralai/mistral-7b-instruct"
#>

param(
    [string]$Model = "moonshotai/kimi-k2.6",  # Default to Kimi K2.6 with extended thinking
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Claude Code CLI Launcher with NVIDIA NIM Backend

USAGE:
  .\launch-claude-nim.ps1 [-Model <model>]

OPTIONS:
  -Model <model>    Specify which NIM model to use
  -Help             Show this help message

AVAILABLE MODELS:
  moonshotai/kimi-k2.6            (Advanced reasoning, extended thinking) - DEFAULT
  meta/llama-3.1-70b-instruct     (Powerful, no thinking)
  meta/llama-3.1-8b-instruct      (Fast, small)
  mistralai/mistral-7b-instruct   (Fast alternative)
  google/gemma-7b                 (Light weight)

EXAMPLES:
  .\launch-claude-nim.ps1
  .\launch-claude-nim.ps1 -Model "meta/llama-3.1-70b-instruct"
  .\launch-claude-nim.ps1 -Model "meta/llama-3.1-8b-instruct"

REQUIREMENTS:
  1. Proxy must be running: npm run dev (in d:\Claude-ai-proxy)
  2. NVIDIA_NIM_API_KEY environment variable set (from .env)
  3. Claude Code CLI installed
"@
    exit 0
}

# Color codes for output
$Green = @{ ForegroundColor = "Green" }
$Yellow = @{ ForegroundColor = "Yellow" }
$Red = @{ ForegroundColor = "Red" }
$Cyan = @{ ForegroundColor = "Cyan" }

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" @Green
Write-Host "║ Claude Code CLI + NVIDIA NIM (No Subscription Needed)      ║" @Green
Write-Host "╚════════════════════════════════════════════════════════════╝" @Green
Write-Host ""

# Check if proxy is running
Write-Host "Step 1: Checking proxy status..." @Yellow
try {
    $proxyCheck = curl -s -m 2 http://localhost:3000/health
    if ($proxyCheck) {
        Write-Host "✅ Proxy is running on http://localhost:3000" @Green
    } else {
        throw "No response"
    }
} catch {
    Write-Host "❌ Proxy is not running!" @Red
    Write-Host ""
    Write-Host "To start the proxy, run in a separate terminal:" @Yellow
    Write-Host "  cd d:\Claude-ai-proxy" @Cyan
    Write-Host "  npm run dev" @Cyan
    Write-Host ""
    exit 1
}

Write-Host ""

# Verify NVIDIA NIM API key is available
Write-Host "Step 2: Checking NVIDIA NIM API key..." @Yellow
$nimKeyFile = "d:\Claude-ai-proxy\.env"
if (Test-Path $nimKeyFile) {
    $content = Get-Content $nimKeyFile
    if ($content -match "NVIDIA_NIM_API_KEY=nvapi") {
        Write-Host "✅ NVIDIA NIM API key is configured" @Green
    } else {
        Write-Host "⚠️  NVIDIA_NIM_API_KEY not found in .env" @Yellow
        Write-Host "   Add your API key to: $nimKeyFile" @Cyan
    }
} else {
    Write-Host "⚠️  .env file not found at $nimKeyFile" @Yellow
}

Write-Host ""

# Set up environment variables
Write-Host "Step 3: Configuring environment..." @Yellow
$env:ANTHROPIC_BASE_URL = "http://localhost:3000"
$env:ANTHROPIC_API_KEY = "proxy-key"
Write-Host "✅ Environment configured" @Green
Write-Host "   - API Base URL: http://localhost:3000" @Cyan
Write-Host "   - Model: $Model" @Cyan

Write-Host ""

# Launch Claude Code CLI
Write-Host "Step 4: Launching Claude Code CLI..." @Green
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" @Green
Write-Host "  Claude Code CLI is starting..." @Green
Write-Host "  Model: $Model" @Cyan
Write-Host "  No login required (--bare mode)" @Cyan
Write-Host "  Press Ctrl+C to exit" @Yellow
Write-Host "╚════════════════════════════════════════════════════════════╝" @Green
Write-Host ""

# Launch Claude code with the specified model
& claude `
  --bare `
  --model $Model `
  --append-system-prompt "You are powered by NVIDIA NIM models via a local proxy. You are helpful, harmless, and honest."

# Cleanup
Write-Host ""
Write-Host "Claude Code CLI closed." @Cyan
