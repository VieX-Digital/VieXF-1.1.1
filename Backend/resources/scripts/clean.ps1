param (
    [switch]$Temp,
    [switch]$Prefetch,
    [switch]$Update,
    [switch]$Recycle,
    [switch]$Logs,
    [switch]$Shader,
    [switch]$Browser
)

# Helper for Safe Deletion (Skips locked files silently instead of throwing red text)
function Remove-Safe {
    param([string]$Path)
    if (Test-Path $Path) {
        $items = Get-ChildItem -Path $Path -Recurse -Force -ErrorAction SilentlyContinue
        foreach ($item in $items) {
            try { Remove-Item -LiteralPath $item.FullName -Force -Recurse -ErrorAction Stop }
            catch { }
        }
    }
}

if ($Temp) {
    Write-Host "Cleaning Deep Temp..."
    Remove-Safe "$env:TEMP"
    Remove-Safe "$env:windir\Temp"
    Remove-Safe "$env:APPDATA\Microsoft\Windows\Recent"
    Remove-Safe "$env:LOCALAPPDATA\CrashDumps"
    Remove-Safe "$env:LOCALAPPDATA\Microsoft\Windows\WER\ReportArchive"
    Remove-Safe "$env:LOCALAPPDATA\Microsoft\Windows\WER\ReportQueue"
}

if ($Prefetch) {
    Write-Host "Cleaning Prefetch..."
    Remove-Safe "$env:windir\Prefetch"
}

if ($Update) {
    Write-Host "Cleaning Windows Update DataStore & Downloads..."
    Stop-Service -Name wuauserv, bits, cryptsvc -Force -ErrorAction SilentlyContinue
    Remove-Safe "$env:windir\SoftwareDistribution\Download"
    Remove-Safe "$env:windir\SoftwareDistribution\DataStore"
    Start-Service -Name wuauserv, bits, cryptsvc -ErrorAction SilentlyContinue
}

if ($Recycle) {
    Write-Host "Emptying Recycle Bin..."
    Clear-RecycleBin -Force -ErrorAction SilentlyContinue
}

if ($Logs) {
    Write-Host "Clearing Event & CBS Logs..."
    Get-EventLog -LogName * -ErrorAction SilentlyContinue | ForEach-Object { Clear-EventLog -LogName $_.Log -ErrorAction SilentlyContinue }
    wevtutil el 2>$null | ForEach-Object { wevtutil cl "$_" 2>$null }
    Remove-Safe "$env:windir\Logs\CBS"
    Remove-Safe "$env:windir\inf\*.log" 
}

if ($Shader) {
    Write-Host "Cleaning shader cache..."
    Remove-Safe "$env:LOCALAPPDATA\D3DSCache"
    Remove-Safe "$env:LOCALAPPDATA\NVIDIA\DXCache"
    Remove-Safe "$env:LOCALAPPDATA\NVIDIA\GLCache"
    Remove-Safe "$env:LOCALAPPDATA\AMD\DxCache"
    Remove-Safe "$env:LOCALAPPDATA\AMD\GLCache"
}

if ($UpdateBackup) {
    Write-Host "Cleaning Component Store (WinSxS)..."
    dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase
}

if ($Browser) {
    Write-Host "Cleaning Browser, Thumbnails & Icon Cache..."
    # Edge
    Remove-Safe "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"
    Remove-Safe "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Code Cache"
    # Chrome
    Remove-Safe "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
    Remove-Safe "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Code Cache"
    # Brave
    Remove-Safe "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\Default\Cache"
    Remove-Safe "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\Default\Code Cache"
    
    # Explorer Cache (Thumbnails & Icons)
    try {
        Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
        Remove-Safe "$env:LOCALAPPDATA\Microsoft\Windows\Explorer"
        Start-Process explorer.exe
    } catch { }
}

Write-Host "Cleanup Complete."
