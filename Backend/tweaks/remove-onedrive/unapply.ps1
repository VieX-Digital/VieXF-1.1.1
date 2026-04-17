Write-Host "Install OneDrive"
Start-Process -FilePath winget -ArgumentList "install -e --accept-source-agreements --accept-package-agreements --silent Microsoft.OneDrive " -NoNewWindow -Wait