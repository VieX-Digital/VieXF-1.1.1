$balancedGUID = "381b4222-f694-41f0-9685-ff5bb260df2e"
  
  # check if the Balanced plan exists
  $balancedExists = powercfg -l | Select-String $balancedGUID
  
  if ($balancedExists) {
      powercfg -setactive $balancedGUID
      Write-Host "Balanced power plan is now active." 
  } else {
      Write-Host "Balanced power plan not found. Creating a new Balanced plan..." 
      powercfg -duplicatescheme $balancedGUID
      powercfg -setactive $balancedGUID
      Write-Host "Balanced power plan created and activated." 
  }