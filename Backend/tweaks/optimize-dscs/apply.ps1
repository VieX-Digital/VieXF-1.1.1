# [CmdletBinding(SupportsShouldProcess = $true)]
param(
    [switch]$ForceKillDiscord = $false
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Brand = 'VieXF'
$LogFile = Join-Path $env:SystemDrive "$Brand-OptimizeDiscord.log"
$TrimmerName = "VieXF_DiscordRAMTrimmer"
$TrimmerPath = Join-Path $PSScriptRoot "VieXF-DiscordTrimmer.ps1"

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

function Clean-DiscordData {
    Write-Log "Đang dọn dẹp Cache và Log của Discord..." 'INFO'
    
    $discordPath = Join-Path $env:APPDATA "Discord"
    $localDiscordPath = Join-Path $env:LOCALAPPDATA "Discord"
    
    $cacheFolders = @("Cache", "Code Cache", "GPUCache")
    
    # Check if Discord is running
    $procs = Get-Process -Name "Discord" -ErrorAction SilentlyContinue
    if ($procs) {
        if ($ForceKillDiscord) {
            Write-Log "Đang đóng Discord để dọn dẹp..." 'WARN'
            $procs | Stop-Process -Force
            Start-Sleep -Seconds 2
        } else {
            Write-Log "Discord đang chạy, bỏ qua bước dọn dẹp Cache để tránh lỗi file-in-use. Hãy đóng Discord và chạy lại với -ForceKillDiscord nếu muốn dọn dẹp sâu." 'WARN'
            return
        }
    }

    foreach ($folder in $cacheFolders) {
        $path = Join-Path $discordPath $folder
        if (Test-Path $path) {
            try {
                Remove-Item -Path "$path\*" -Recurse -Force -ErrorAction SilentlyContinue
                Write-Log "Đã dọn dẹp: $folder" 'OK'
            } catch {
                Write-Log "Không thể dọn hoàn toàn: $folder" 'WARN'
            }
        }
    }

    # Clean crashpad and logs in LocalAppData
    if (Test-Path $localDiscordPath) {
        Get-ChildItem -Path $localDiscordPath -Filter "*.log" -Recurse | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Log "Đã dọn dẹp log Discord." 'OK'
    }
}

function Install-TrimmerTask {
    Write-Log "Đang cấu hình Scheduled Task để giảm RAM Discord định kỳ..." 'INFO'
    
    # Remove old task if exists
    $null = & schtasks /delete /tn $TrimmerName /f 2>$null
    
    # Define task: Run every 5 minutes
    # Argument: -WindowStyle Hidden -ExecutionPolicy Bypass -File "..."
    $actionScript = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$TrimmerPath`""
    
    # Create Task
    # /SC MINUTE /MO 5 -> Sc=Minute, Mo=5 (every 5 mins)
    $null = & schtasks /create /tn $TrimmerName /tr "$actionScript" /sc minute /mo 5 /rl highest /f 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Đã cài đặt Scheduled Task: $TrimmerName (Chạy mỗi 5 phút)" 'OK'
    } else {
        Write-Log "Lỗi khi cài đặt Scheduled Task." 'ERROR'
    }
}

try {
    Assert-Admin
    Clean-DiscordData
    Install-TrimmerTask
    
    # Run once immediately
    Write-Log "Đang thực hiện giảm RAM ngay lập tức..." 'INFO'
    & "$TrimmerPath"
    
    Write-Log "Hoàn tất tối ưu Discord!" 'OK'
} catch {
    Write-Log $_.Exception.Message 'ERROR'
    exit 1
}
