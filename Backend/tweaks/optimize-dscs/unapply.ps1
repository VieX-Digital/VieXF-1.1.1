# Unapply Discord Optimization
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Brand = 'VieXF'
$TrimmerName = "VieXF_DiscordRAMTrimmer"
$LogFile = Join-Path $env:SystemDrive "$Brand-OptimizeDiscord.log"

function Write-Log {
    param(
        [Parameter(Mandatory)] [string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR', 'OK')] [string]$Level = 'INFO'
    )
    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    switch ($Level) {
        'INFO' { Write-Host $line -ForegroundColor Cyan }
        'WARN' { Write-Host $line -ForegroundColor Yellow }
        'ERROR' { Write-Host $line -ForegroundColor Red }
        'OK' { Write-Host $line -ForegroundColor Green }
    }
}

function Assert-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Hãy chạy PowerShell bằng quyền Administrator.'
    }
}

try {
    Assert-Admin
    Write-Log "Đang gỡ bỏ Scheduled Task giảm RAM Discord..." 'INFO'
    
    $null = & schtasks /delete /tn $TrimmerName /f 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Đã gỡ bỏ: $TrimmerName" 'OK'
    } else {
        Write-Log "Không tìm thấy hoặc không thể xóa Scheduled Task: $TrimmerName" 'WARN'
    }
    
    Write-Log "Hoàn tất hoàn tác cấu hình tối ưu Discord!" 'OK'
} catch {
    Write-Log $_.Exception.Message 'ERROR'
    exit 1
}
