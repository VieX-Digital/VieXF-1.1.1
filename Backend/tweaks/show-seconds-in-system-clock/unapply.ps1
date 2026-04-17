Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ShowSecondsInSystemClock" -Type DWord -Value 0

# Restart Explorer to apply changes
Stop-Process -Name explorer -Force
Start-Process explorer
