[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Chay PowerShell / VieXF bang quyen Administrator.'
}

$ultraScript = Join-Path (Split-Path -LiteralPath $PSScriptRoot -Parent) 'ultra-debloat\apply.ps1'
if (-not (Test-Path -LiteralPath $ultraScript)) {
    throw "Khong tim thay Ultra Debloat: $ultraScript"
}

Write-Host '[vie-amx] Buoc 1/2: chay toan bo Ultra Debloat...' -ForegroundColor Cyan
& $ultraScript
if (-not $?) {
    Write-Host '[vie-amx] Ultra Debloat that bai.' -ForegroundColor Red
    exit 1
}

if ($env:VIEXF_LICENSE_PRO -eq '1') {
    Write-Host '[vie-amx] Buoc 2/2: Pro — aggressive services + backup C:\VieXF...' -ForegroundColor Yellow
    $proFile = Join-Path $PSScriptRoot 'pro-stack.ps1'
    if (-not (Test-Path -LiteralPath $proFile)) {
        throw "Thieu pro-stack.ps1 tai $proFile"
    }
    . $proFile
    Invoke-VieAmxProStack
}

Write-Host '[vie-amx] Hoan tat.' -ForegroundColor Green
exit 0
