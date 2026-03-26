param(
    [Parameter(Mandatory = $true)]
    [string]$Host,
    [string]$User = "pi",
    [int]$Port = 22,
    [string]$Branch = "main",
    [string]$RepoUrl = "https://github.com/Mr-KID-github/VideoNote.git",
    [string]$RemoteDir = "/home/pi/vinote",
    [string]$EnvFile = ".env",
    [switch]$SkipPush
)

$ErrorActionPreference = "Stop"

function Require-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $Name"
    }
}

Require-Command "git"
Require-Command "ssh"
Require-Command "scp"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envPath = Join-Path $repoRoot $EnvFile
$frontendPort = "3100"

if (-not (Test-Path $envPath)) {
    throw "Env file not found: $envPath"
}

$frontendPortLine = Get-Content $envPath | Where-Object { $_ -match '^FRONTEND_PORT=' } | Select-Object -First 1
if ($frontendPortLine) {
    $frontendPort = ($frontendPortLine -split '=', 2)[1].Trim()
}

$status = git -C $repoRoot status --short
if ($status -and -not $SkipPush) {
    throw "Working tree is not clean. Commit or stash local changes, or rerun with -SkipPush if you know what you are doing."
}

if (-not $SkipPush) {
    Write-Host "Pushing branch $Branch to origin..."
    git -C $repoRoot push origin $Branch
}

$remote = "$User@$Host"
$remoteEnv = "/tmp/vinote.env"

Write-Host "Uploading env file to $remote..."
scp -P $Port $envPath "${remote}:${remoteEnv}" | Out-Null

$remoteScript = @"
set -eu

for cmd in git docker; do
  if ! command -v "\$cmd" >/dev/null 2>&1; then
    echo "Missing required command on Raspberry Pi: \$cmd" >&2
    exit 1
  fi
done

docker compose version >/dev/null 2>&1 || {
  echo "Missing required command on Raspberry Pi: docker compose" >&2
  exit 1
}

mkdir -p "$RemoteDir"

if [ ! -d "$RemoteDir/.git" ]; then
  git clone --branch "$Branch" "$RepoUrl" "$RemoteDir"
fi

cd "$RemoteDir"
git fetch origin "$Branch"
git checkout "$Branch"
git reset --hard "origin/$Branch"
cp "$remoteEnv" .env
rm -f "$remoteEnv"

mkdir -p data output

docker compose up -d --build --remove-orphans
docker compose ps
"@

Write-Host "Deploying VINote to Raspberry Pi..."
ssh -p $Port $remote $remoteScript

Write-Host ""
Write-Host "Deployment finished."
if ($frontendPort -eq "80") {
    Write-Host "Open in LAN: http://${Host}"
} else {
    Write-Host "Open in LAN: http://${Host}:${frontendPort}"
}
