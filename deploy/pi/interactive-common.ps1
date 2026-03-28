# deploy/pi/interactive-common.ps1
# Shared utility functions for interactive deployment scripts

# Enable ANSI escape sequence support on Windows
if ($Host.UI.RawUI) {
    $Host.UI.RawUI.BackgroundColor = $Host.UI.RawUI.BackgroundColor
    try {
        $Host.UI.RawUI.SupportsInteractiveEvents = $true
    } catch {}
}

# Use VT escape sequences (supported in PowerShell 7+ and Windows 10 1607+)
$script:ESC_RESET = "`e[0m"
$script:ESC_GREEN = "`e[32m"
$script:ESC_RED = "`e[31m"
$script:ESC_YELLOW = "`e[33m"
$script:ESC_CYAN = "`e[36m"

# Detect system language
$script:IsChinese = [System.Globalization.CultureInfo]::CurrentCulture.TwoLetterISOLanguageName -eq 'zh'

# Localized strings
$script:LOC = @{
    zh = @{
        OK = "[OK]"
        FAIL = "[失败]"
        WARN = "[警告]"
        INFO = "[信息]"
        Step = "步骤"
        ValueCannotBeEmpty = "值不能为空，请输入值"
        PleaseEnterYorN = "请输入 y 或 n"
        ConfigSaved = "配置已保存到 local.env"
        FoundExistingConfig = "发现已有配置"
        WorkingTreeClean = "工作区干净"
        WorkingTreeHasChanges = "工作区有未提交的更改"
        ChangesCommitted = "已提交更改"
        ChangesStashed = "已暂存更改"
        SkipGitPush = "将跳过 git push"
        ConnectedSuccessfully = "连接成功"
        ConnectionFailed = "连接失败"
        DockerEnvOK = "Docker 环境正常"
        DockerDaemonNotRunning = "Docker daemon 未运行"
        DockerComposeNotInstalled = "Docker Compose 未安装"
        EnvFileUploaded = "Env 文件已上传"
        SourceArchiveUploaded = "源码包已上传"
        DeploymentComplete = "部署完成"
        BranchPushed = "分支已推送"
        FailedToPush = "推送失败"
        Cancelled = "部署已取消"
        BackendOnly = "仅后端"
        FullStack = "前端 + 后端"
        YesSkipPush = "否（跳过）"
        NoPush = "是"
    }
    en = @{
        OK = "[OK]"
        FAIL = "[FAIL]"
        WARN = "[WARN]"
        INFO = "[INFO]"
        Step = "Step"
        ValueCannotBeEmpty = "Value cannot be empty. Please enter a value."
        PleaseEnterYorN = "Please enter y or n."
        ConfigSaved = "Configuration saved to local.env"
        FoundExistingConfig = "Found existing configuration"
        WorkingTreeClean = "Working tree clean"
        WorkingTreeHasChanges = "Working tree has uncommitted changes"
        ChangesCommitted = "Changes committed"
        ChangesStashed = "Changes stashed"
        SkipGitPush = "Will skip git push"
        ConnectedSuccessfully = "Connected successfully"
        ConnectionFailed = "Connection failed"
        DockerEnvOK = "Docker environment OK"
        DockerDaemonNotRunning = "Docker daemon is not running"
        DockerComposeNotInstalled = "Docker Compose is not installed"
        EnvFileUploaded = "Env file uploaded"
        SourceArchiveUploaded = "Source archive uploaded"
        DeploymentComplete = "Deployment complete"
        BranchPushed = "Branch pushed"
        FailedToPush = "Failed to push"
        Cancelled = "Deployment cancelled"
        BackendOnly = "Backend only"
        FullStack = "Frontend + Backend"
        YesSkipPush = "Yes (skip)"
        NoPush = "No"
    }
}

function Get-Loc($key) {
    if ($IsChinese) {
        return $LOC.zh[$key]
    } else {
        return $LOC.en[$key]
    }
}

function Write-Success($message) {
    Write-Host "$ESC_GREEN$(Get-Loc 'OK')$ESC_RESET $message"
}

function Write-Fail($message) {
    $Host.UI.WriteErrorLine("$ESC_RED$(Get-Loc 'FAIL')$ESC_RESET $message")
}

function Write-Warn($message) {
    Write-Host "$ESC_YELLOW$(Get-Loc 'WARN')$ESC_RESET $message"
}

function Write-Info($message) {
    Write-Host "$ESC_CYAN$(Get-Loc 'INFO')$ESC_RESET $message"
}

function Write-Step($current, $total, $message) {
    Write-Host ""
    $stepLabel = Get-Loc "Step"
    Write-Host "$ESC_CYAN--- $stepLabel $current/$total`: $message ---$ESC_RESET"
}

function Test-SshConnection($piHost, $piUser, $piPort, $timeout = 5) {
    $remote = "$piUser@$piHost"
    $output = ssh -o "ConnectTimeout=$timeout" -o "BatchMode=yes" -p $piPort $remote "echo ok" 2>&1
    return $LASTEXITCODE -eq 0
}

function Read-NonEmpty($prompt, $default = "") {
    while ($true) {
        $promptText = if ($IsChinese) { "请输入" } else { "Enter" }
        $value = Read-Host "$promptText $prompt"
        if ([string]::IsNullOrWhiteSpace($value)) {
            if ($default) {
                return $default
            }
            Write-Warn (Get-Loc "ValueCannotBeEmpty")
        } else {
            return $value
        }
    }
}

function Confirm-Choice($prompt, $yesDefault = $false) {
    if ($yesDefault) {
        $suffix = "[Y/n]"
    } else {
        $suffix = "[y/N]"
    }
    while ($true) {
        $response = Read-Host "$prompt $suffix"
        if ([string]::IsNullOrWhiteSpace($response)) {
            return $yesDefault
        }
        if ($response -match "^[Yy]$") { return $true }
        if ($response -match "^[Nn]$") { return $false }
        Write-Warn (Get-Loc "PleaseEnterYorN")
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

    # Check Docker daemon
    $dockerCmd = "docker info 2>&1 | head -1 && echo DOCKER_OK=1 || echo DOCKER_OK=0"
    $dockerOutput = ssh -o ConnectTimeout=5 -o BatchMode=yes -p $piPort $remote $dockerCmd 2>&1
    $dockerOk = $dockerOutput -match "DOCKER_OK=1"

    # Check Docker Compose
    $composeCmd = "docker compose version 2>&1 && echo COMPOSE_OK=1 || echo COMPOSE_OK=0"
    $composeOutput = ssh -o ConnectTimeout=5 -o BatchMode=yes -p $piPort $remote $composeCmd 2>&1
    $composeOk = $composeOutput -match "COMPOSE_OK=1"

    $result = @{
        DockerOk = $dockerOk
        ComposeOk = $composeOk
        DockerOutput = $dockerOutput
        ComposeOutput = $composeOutput
    }
    return $result
}
