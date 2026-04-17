$Path = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize"
Set-ItemProperty -Path $Path -Name AppsUseLightTheme -Value 0
Set-ItemProperty -Path $Path -Name SystemUsesLightTheme -Value 0
Stop-Process -Name explorer -Force
Start-Process explorer.exe
