#!/usr/bin/env pwsh
# deploy/pi/deploy-pi-interactive.ps1
# Interactive guided deployment for VINote to Raspberry Pi

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# Load shared utilities
. (Join-Path $PSScriptRoot "interactive-common.ps1")

# ─────────────────────────────────────────────────────────────
# Step 1: Configure Connection
# ─────────────────────────────────────────────────────────────
Write-Step 1 9 "Configure Connection"

$config = Load-LocalConfig

if ($config) {
    Write-Info "Found existing configuration in local.env"
    $defaultHost = $config["PI_HOST"]
    $defaultUser = $config["PI_USER"]
    $defaultPort = if ($config["PI_PORT"]) { $config["PI_PORT"] } else { "22" }
} else {
    $defaultHost = ""
    $defaultUser = "pi"
    $defaultPort = "22"
}

Write-Host "Enter Raspberry Pi connection details:" -ForegroundColor White
$piHost = Read-NonEmpty "  IP Address or Hostname" $defaultHost
$piUser = Read-NonEmpty "  SSH Username" $defaultUser
$piPort = Read-Host "  SSH Port (default: 22)"
if ([string]::IsNullOrWhiteSpace($piPort)) { $piPort = "22" }

Save-LocalConfig $piHost $piUser $piPort
Write-Success "Configuration saved to local.env"

# ─────────────────────────────────────────────────────────────
# Step 2: Test SSH Connection
# ─────────────────────────────────────────────────────────────
Write-Step 2 9 "Test SSH Connection"

Write-Host "Testing connection to $piUser@$piHost`:$piPort..."

if (Test-SshConnection $piHost $piUser $piPort) {
    Write-Success "Connected successfully"
} else {
    Write-Fail "Connection failed"

    Write-Host ""
    Write-Warn "Possible reasons:"
    Write-Host "  1. Wrong IP address or hostname"
    Write-Host "  2. SSH service not running on Pi"
    Write-Host "  3. SSH key not configured"
    Write-Host ""

    $choice = Read-Host @"
Have you configured SSH key authentication?
  [1] Yes, continue anyway
  [2] No, show me how to set it up
  [3] Cancel deployment

Select [1]:
"@
    if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

    if ($choice -eq "2") {
        Write-Host @"

=== SSH Key Setup Guide ===

1. On your local machine, generate a key pair:
   ssh-keygen -t ed25519 -C `"your_email@example.com`"

2. Copy the public key to your Pi:
   ssh-copy-id -p $piPort $piUser@$piHost

3. Test connection:
   ssh -p $piPort $piUser@$piHost

For more details, visit:
https://www.raspberrypi.com/documentation/computers/remote-access.html

"@
    }

    if ($choice -ne "1") {
        Write-Host "Deployment cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# ─────────────────────────────────────────────────────────────
# Step 3: Select Deployment Scope
# ─────────────────────────────────────────────────────────────
Write-Step 3 9 "Select Deployment Scope"

Write-Host "Select deployment scope:" -ForegroundColor White
Write-Host "  [1] Backend only (API + services)"
Write-Host "  [2] Frontend + Backend (full stack, default)"

$scopeChoice = Read-Host "Select [2]"
if ([string]::IsNullOrWhiteSpace($scopeChoice)) { $scopeChoice = "2" }

if ($scopeChoice -eq "1") {
    $deployScope = "backend"
    Write-Host "Selected: Backend only"
} else {
    $deployScope = "full"
    Write-Host "Selected: Frontend + Backend"
}

# ─────────────────────────────────────────────────────────────
# Step 4: Git Status Check
# ─────────────────────────────────────────────────────────────
Write-Step 4 9 "Git Status Check"

$gitStatus = git -C $repoRoot status --short

if ($gitStatus) {
    Write-Warn "Working tree has uncommitted changes:"
    git -C $repoRoot status --short | ForEach-Object { Write-Host "  $_" }
    Write-Host ""

    Write-Host "  [1] Commit changes"
    Write-Host "  [2] Stash changes"
    Write-Host "  [3] Skip pushing (continue with local state)"
    Write-Host "  [4] Cancel deployment"

    $gitChoice = Read-Host "Select [4]"
    if ([string]::IsNullOrWhiteSpace($gitChoice)) { $gitChoice = "4" }

    switch ($gitChoice) {
        "1" {
            Write-Host "Enter commit message:" -ForegroundColor White
            $msg = Read-Host
            if ([string]::IsNullOrWhiteSpace($msg)) {
                $msg = "WIP: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
            }
            git -C $repoRoot add -A
            git -C $repoRoot commit -m $msg
            Write-Success "Changes committed"
            $skipPush = $false
        }
        "2" {
            git -C $repoRoot stash push -m "Auto-stash before deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
            Write-Success "Changes stashed"
            $skipPush = $false
        }
        "3" {
            $skipPush = $true
            Write-Host "Will skip git push" -ForegroundColor Cyan
        }
        default {
            Write-Host "Deployment cancelled." -ForegroundColor Yellow
            exit 0
        }
    }
} else {
    Write-Success "Working tree clean"
    $skipPush = $false
}

# ─────────────────────────────────────────────────────────────
# Step 5: Preview & Confirm
# ─────────────────────────────────────────────────────────────
Write-Step 5 9 "Preview & Confirm"

$envPath = Join-Path $repoRoot ".env"
$branch = git -C $repoRoot rev-parse --abbrev-ref HEAD

Write-Host @"

=== Deployment Summary ===

Target:         $piUser@$piHost`:$piPort
Branch:         $branch
Scope:          $(if ($deployScope -eq "backend") { "Backend only" } else { "Frontend + Backend" })
Remote Dir:     /home/$piUser/vinote
Local Env:      .env
Git Push:       $(if ($skipPush) { "No (skipped)" } else { "Yes" })

"@ -ForegroundColor White

$confirmed = Confirm-Choice "Ready to deploy?" $false

if (-not $confirmed) {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

# ─────────────────────────────────────────────────────────────
# Step 6: Remote Environment Check
# ─────────────────────────────────────────────────────────────
Write-Step 6 9 "Remote Environment Check"

Write-Host "Checking Docker environment on Pi..."

$dockerStatus = Get-DockerRemoteStatus $piHost $piUser $piPort

if (-not $dockerStatus.DockerOk) {
    Write-Fail "Docker daemon is not running on the Pi"
    Write-Host @"

Please start Docker on your Raspberry Pi:
  sudo systemctl start docker
  sudo systemctl enable docker

Then restart this deployment.
  [1] Retry checks
  [2] Continue anyway (may fail)
  [3] Cancel

Select [3]:
"@ -ForegroundColor Yellow

    $retryChoice = Read-Host
    if ([string]::IsNullOrWhiteSpace($retryChoice) -or $retryChoice -eq "3") {
        exit 0
    }
    if ($retryChoice -eq "1") {
        & $MyInvocation.MyCommand.Path
        exit $LASTEXITCODE
    }
}

if (-not $dockerStatus.ComposeOk) {
    Write-Fail "Docker Compose is not installed on the Pi"
    Write-Host @"

Please install Docker Compose:
  sudo apt-get update && sudo apt-get install -y docker-compose

Or use the Docker Compose plugin:
  sudo apt-get install -y docker-compose-plugin

Select [3] to cancel, or [2] to continue anyway.

Select [3]:
"@ -ForegroundColor Yellow

    $retryChoice = Read-Host
    if ([string]::IsNullOrWhiteSpace($retryChoice) -or $retryChoice -eq "3") {
        exit 0
    }
}

Write-Success "Docker environment OK"

# ─────────────────────────────────────────────────────────────
# Step 7: Push Code (if not skipped)
# ─────────────────────────────────────────────────────────────
Write-Step 7 9 "Push Code"

if ($skipPush) {
    Write-Host "Skipping git push" -ForegroundColor Cyan
} else {
    Write-Host "Pushing branch $branch to origin..."
    git -C $repoRoot push origin $branch

    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Failed to push to origin"
        Write-Host "  [1] Retry"
        Write-Host "  [2] Skip pushing, continue with local files"
        Write-Host "  [3] Cancel"

        $pushRetry = Read-Host "Select [3]"
        if ([string]::IsNullOrWhiteSpace($pushRetry) -or $pushRetry -eq "3") {
            exit 0
        }
        if ($pushRetry -eq "2") {
            $skipPush = $true
        } else {
            git -C $repoRoot push origin $branch
        }
    } else {
        Write-Success "Branch pushed"
    }
}

# ─────────────────────────────────────────────────────────────
# Step 8: Upload Files
# ─────────────────────────────────────────────────────────────
Write-Step 8 9 "Upload Files"

$remoteDir = "/home/$piUser/vinote"
$remoteEnv = "/tmp/vinote.env"
$remoteArchive = "/tmp/vinote-source.tar.gz"

Write-Host "Uploading .env file..."
scp -P $piPort $envPath "${piUser}@${piHost}:${remoteEnv}" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Failed to upload env file" }
Write-Success "Env file uploaded"

Write-Host "Creating source archive..."
$tempArchive = Join-Path ([System.IO.Path]::GetTempPath()) "vinote-source-$PID.tar.gz"
$tempList = Join-Path ([System.IO.Path]::GetTempPath()) "vinote-source-$PID.txt"

$files = git -C $repoRoot ls-files --cached --modified --others --exclude-standard
if (-not $files) { throw "No files to deploy" }
[System.IO.File]::WriteAllLines($tempList, $files, [System.Text.UTF8Encoding]::new($false))
tar -czf $tempArchive -C $repoRoot -T $tempList

Write-Host "Uploading source archive..."
scp -P $piPort $tempArchive "${piUser}@${piHost}:${remoteArchive}" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Failed to upload source archive" }
Write-Success "Source archive uploaded"

Remove-Item $tempArchive, $tempList -Force

# ─────────────────────────────────────────────────────────────
# Step 9: Execute Deployment
# ─────────────────────────────────────────────────────────────
Write-Step 9 9 "Execute Deployment"

$buildArg = if ($deployScope -eq "backend") { "--no-deps backend" } else { "" }

$deployScript = @"
set -eu
mkdir -p `"$remoteDir`"
find `"$remoteDir`" -mindepth 1 -maxdepth 1 \
  ! -name data \
  ! -name output \
  ! -name .env \
  -exec rm -rf {} +
tar -xzf `"$remoteArchive`" -C `"$remoteDir`"
cp `"$remoteEnv`" `"$remoteDir`/.env"
rm -f `"$remoteArchive`"
rm -f `"$remoteEnv`"
cd `"$remoteDir`"
export COMPOSE_PROJECT_NAME=vinote
export DOCKER_DEFAULT_PLATFORM=linux/arm/v7
mkdir -p data output
docker compose up -d --build $buildArg
docker compose ps
"@

$tempScript = Join-Path ([System.IO.Path]::GetTempPath()) "vinote-deploy-$PID.sh"
$deployScriptLf = $deployScript -replace "`r`n", "`n"
[System.IO.File]::WriteText($tempScript, $deployScriptLf, [System.Text.UTF8Encoding]::new($false))

$scriptPath = "/tmp/vinote-deploy.sh"

try {
    Write-Host "Uploading deploy script..."
    scp -P $piPort $tempScript "${piUser}@${piHost}:${scriptPath}" 2>&1 | Out-Null

    Write-Host "Deploying VINote to Raspberry Pi..."
    ssh -p $piPort $piUser@$piHost "bash '$scriptPath'; rm -f '$scriptPath'"

    Write-Success "Deployment complete!"

    # Get ports from env
    $frontendPort = "3100"
    $backendPort = "8900"
    if (Test-Path $envPath) {
        $fp = Get-Content $envPath | Where-Object { $_ -match '^FRONTEND_PORT=' } | Select-Object -First 1
        if ($fp) { $frontendPort = ($fp -split '=', 2)[1].Trim() }
        $bp = Get-Content $envPath | Where-Object { $_ -match '^BACKEND_PORT=' } | Select-Object -First 1
        if ($bp) { $backendPort = ($bp -split '=', 2)[1].Trim() }
    }

    Write-Host @"

Access VINote:
  - Frontend: http://$piHost`:$frontendPort
  - Backend:  http://$piHost`:$backendPort
  - MCP:      http://$piHost`:$backendPort/mcp

To check status on Pi:
  ssh $piUser@$piHost
  cd ~/vinote && docker compose ps
"@
}
finally {
    if (Test-Path $tempScript) { Remove-Item $tempScript -Force }
}
