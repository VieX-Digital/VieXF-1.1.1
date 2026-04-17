try {
    bcdedit /set disabledynamictick no
    Write-Host "Dynamic Ticking settings restored"
  } catch {
    Write-Host "Failed to revert Dynamic Ticking tweak"
  }