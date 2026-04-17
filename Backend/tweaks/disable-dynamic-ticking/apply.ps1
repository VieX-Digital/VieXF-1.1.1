try {
    bcdedit /set disabledynamictick yes
    Write-Host "Dynamic Ticking disabled successfully"
  } catch {
    Write-Host "Failed to apply Dynamic Ticking tweak"
  }