$regPath = "HKLM:\System\CurrentControlSet\Control\GraphicsDrivers"
$keyName = "HwSchMode"
$value = 1

If (Test-Path $regPath) {
    Set-ItemProperty -Path $regPath -Name $keyName -Value $value -Type DWord
    Write-Host "Hardware-Accelerated GPU Scheduling disabled. A restart may be required."
}
else {
    Write-Host "Registry path not found."
}
