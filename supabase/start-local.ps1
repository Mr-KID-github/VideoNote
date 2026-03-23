$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    throw 'Supabase CLI was not found. Install it first: https://supabase.com/docs/guides/cli'
}

Push-Location $repoRoot
try {
    Write-Host 'Starting local Supabase stack...'
    supabase start

    Write-Host 'Applying local migrations...'
    supabase db push

    Write-Host 'Current local status:'
    supabase status
} finally {
    Pop-Location
}
