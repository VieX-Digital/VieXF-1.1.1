$targetTerminalName = "Windows PowerShell"

if (-not (Get-Command "wt" -ErrorAction SilentlyContinue)) {
    Write-Host "Windows Terminal not installed. Exiting..."
    exit
}

$settingsPath = "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json"
if (-not (Test-Path -Path $settingsPath)) {
    Write-Host "Windows Terminal settings.json not found."
    exit
}

$settingsContent = Get-Content -Path $settingsPath | ConvertFrom-Json
$ps5Profile = $settingsContent.profiles.list | Where-Object { $_.name -eq $targetTerminalName }

if ($ps5Profile) {
    $settingsContent.defaultProfile = $ps5Profile.guid
    $settingsContent | ConvertTo-Json -Depth 100 | Set-Content -Path $settingsPath
    Write-Host "Default profile reverted to PowerShell 5"
} else {
    Write-Host "No Windows PowerShell profile found."
}
