$regPath = "HKLM:\System\CurrentControlSet\Control\GraphicsDrivers"
$keyName = "HwSchMode"
$value = 2

If (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}

Set-ItemProperty -Path $regPath -Name $keyName -Value $value -Type DWord

Write-Host "Hardware-Accelerated GPU Scheduling enabled. A restart may be required."
