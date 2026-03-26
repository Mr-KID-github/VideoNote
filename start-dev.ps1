$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendRoot = Join-Path $projectRoot 'frontend'
$envFile = Join-Path $projectRoot '.env'
$venvPython = Join-Path $projectRoot '.venv\Scripts\python.exe'

function Test-CommandExists {
    param([string]$CommandName)

    return $null -ne (Get-Command $CommandName -ErrorAction SilentlyContinue)
}

if (-not (Test-Path $frontendRoot)) {
    throw "Missing frontend directory: $frontendRoot"
}

if (-not (Test-Path $envFile)) {
    Write-Warning 'Missing .env file. Create it from .env.example before starting the app.'
}

if (Test-Path $venvPython) {
    $pythonExe = $venvPython
} elseif (Test-CommandExists 'python') {
    $pythonExe = 'python'
} elseif (Test-CommandExists 'py') {
    $pythonExe = 'py'
} else {
    throw 'Python was not found. Install Python or create .venv in the project root.'
}

if (-not (Test-CommandExists 'npm')) {
    throw 'npm was not found. Install Node.js first.'
}

Write-Host 'Starting VINote...'
Write-Host 'Backend:  http://127.0.0.1:8900/docs'
Write-Host 'Frontend: http://localhost:3100'
Write-Host ''
Write-Host 'If this is the first run, install dependencies first:'
Write-Host '  pip install -r requirements.txt'
Write-Host '  cd frontend'
Write-Host '  npm install'

$backendArgs = @(
    '-NoExit',
    '-Command',
    "& `"$pythonExe`" -m uvicorn main:app --host 0.0.0.0 --port 8900 --reload"
)

$frontendArgs = @(
    '-NoExit',
    '-Command',
    'npm run dev -- --host 0.0.0.0 --port 3100'
)

Start-Process -FilePath 'powershell' -WorkingDirectory $projectRoot -ArgumentList $backendArgs

Start-Sleep -Seconds 2

Start-Process -FilePath 'powershell' -WorkingDirectory $frontendRoot -ArgumentList $frontendArgs
