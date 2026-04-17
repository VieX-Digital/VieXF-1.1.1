Write-Host "Applying NVIDIA optimization settings..."

$ErrorActionPreference = 'SilentlyContinue'

# Function to check for NVIDIA GPU presence
function Test-NvidiaGpuPresence {
    $nvidiaGpu = Get-PnpDevice -Class Display -Status OK | Where-Object { $_.FriendlyName -like "*NVIDIA*" }
    if ($nvidiaGpu) {
        return $true
    } else {
        return $false
    }
}

if (-not (Test-NvidiaGpuPresence)) {
    Write-Host "Bạn không có card đồ họa Nvidia"
    exit 1
}

# Function to set NVIDIA registry keys
function Set-NvidiaRegistryKey {
    param (
        [string]$Path,
        [string]$Name,
        [string]$Value,
        [string]$Type = "DWord"
    )
    $fullPath = 'HKLM:\SYSTEM\CurrentControlSet\Control\Video\'
    Get-ChildItem -Path $fullPath -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.PSIsContainer -and $_.Name -match "0000$" } | ForEach-Object {
        $driverPath = Join-Path $_.PSPath "0000"
        if (-not (Test-Path $driverPath)) {
            New-Item -Path $driverPath -Force | Out-Null
        }
        Set-ItemProperty -Path $driverPath -Name $Name -Value $Value -Type $Type -ErrorAction SilentlyContinue
        Write-Host "  Set $($Name) to $($Value) in $($driverPath)"
    }
}

# 1. Power Management Mode: Prefer Maximum Performance (Value: 1)
Set-NvidiaRegistryKey -Name "PowerMizerEnable" -Value "1"
Set-NvidiaRegistryKey -Name "PowerMizerDefault" -Value "1"
Set-NvidiaRegistryKey -Name "PowerMizerLevel" -Value "1"
Set-NvidiaRegistryKey -Name "PowerMizerLevelAC" -Value "1"
Set-NvidiaRegistryKey -Name "PowerMizerLevelDC" -Value "1"

# 2. Texture Filtering Quality: High Performance (Value: 20)
Set-NvidiaRegistryKey -Name "TextureFilterQuality" -Value "20"

# 3. Low Latency Mode: Ultra (Value: 3)
Set-NvidiaRegistryKey -Name "LowLatencyMode" -Value "3"

# 4. Shader Cache: On (Value: 1)
Set-NvidiaRegistryKey -Name "ShaderCache" -Value "1"

# 5. Threaded Optimization: On (Value: 1)
Set-NvidiaRegistryKey -Name "ThreadedOptimization" -Value "1"

# 6. Vertical Sync (V-Sync): Off (Value: 0)
Set-NvidiaRegistryKey -Name "VSync" -Value "0"

Write-Host "NVIDIA optimization settings applied successfully."