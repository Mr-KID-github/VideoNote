# deploy/pi/interactive-common.ps1
# Shared utility functions for interactive deployment scripts

$script:ESC_RESET = "`e[0m"
$script:ESC_GREEN = "`e[32m"
$script:ESC_RED = "`e[31m"
$script:ESC_YELLOW = "`e[33m"
$script:ESC_CYAN = "`e[36m"

function Write-Success($message) {
    Write-Host "$ESC_GREEN[OK]$ESC_RESET $message"
}

function Write-Fail($message) {
    $Host.UI.WriteErrorLine("$ESC_RED[FAIL]$ESC_RESET $message")
}

function Write-Warn($message) {
    Write-Host "$ESC_YELLOW[WARN]$ESC_RESET $message"
}

function Write-Info($message) {
    Write-Host "$ESC_CYAN[INFO]$ESC_RESET $message"
}

function Write-Step($current, $total, $message) {
    Write-Host ""
    Write-Host "$ESC_CYAN--- Step $current/$total`: $message ---$ESC_RESET"
}

function Test-SshConnection($piHost, $piUser, $piPort, $timeout = 5) {
    $remote = "$piUser@$piHost"
    $output = ssh -o "ConnectTimeout=$timeout" -o "BatchMode=yes" -p $piPort $remote "echo ok" 2>&1
    return $LASTEXITCODE -eq 0
}

function Read-NonEmpty($prompt, $default = "") {
    while ($true) {
        $value = Read-Host $prompt
        if ([string]::IsNullOrWhiteSpace($value)) {
            if ($default) {
                return $default
            }
            Write-Warn "Value cannot be empty. Please enter a value."
        } else {
            return $value
        }
    }
}

function Confirm-Choice($prompt, $yesDefault = $false) {
    $suffix = if ($yesDefault) { "[Y/n]" } else { "[y/N]" }
    while ($true) {
        $response = Read-Host "$prompt $suffix"
        if ([string]::IsNullOrWhiteSpace($response)) {
            return $yesDefault
        }
        if ($response -match "^[Yy]$") { return $true }
        if ($response -match "^[Nn]$") { return $false }
        Write-Warn "Please enter y or n."
    }
}

function Save-LocalConfig($piHost, $piUser, $piPort) {
    $configPath = Join-Path $PSScriptRoot "local.env"
    $content = @"
PI_HOST=$piHost
PI_USER=$piUser
PI_PORT=$piPort
"@
    Set-Content -Path $configPath -Value $content -Encoding UTF8
}

function Load-LocalConfig() {
    $configPath = Join-Path $PSScriptRoot "local.env"
    if (-not (Test-Path $configPath)) { return $null }

    $config = @{}
    Get-Content $configPath | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $config[$matches[1].Trim()] = $matches[2].Trim()
        }
    }
    return $config
}

function Get-DockerRemoteStatus($piHost, $piUser, $piPort) {
    $remote = "$piUser@$piHost"
    $script = @'
docker info >/dev/null 2>&1 && echo "DOCKER_OK=1" || echo "DOCKER_OK=0"
docker compose version >/dev/null 2>&1 && echo "COMPOSE_OK=1" || echo "COMPOSE_OK=0"
'@
    $output = ssh -p $piPort $remote $script 2>&1
    $result = @{
        DockerOk = $output -match "DOCKER_OK=1"
        ComposeOk = $output -match "COMPOSE_OK=1"
    }
    return $result
}
