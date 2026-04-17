$ultimatePlan = powercfg -l | Select-String "Ultimate Performance"
  
  if (-not $ultimatePlan) {
      Write-Host "Ultimate Performance plan not found. Creating..." 
      powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61
  } else {
      Write-Host "Ultimate Performance plan already exists." 
  }
  
  # Get the GUID of the Ultimate Performance plan
  $ultimatePlanGUID = (powercfg -l | Select-String "Ultimate Performance").ToString().Split()[3]
  
  # Set it as the active plan
  powercfg -setactive $ultimatePlanGUID
  
  Write-Host "Ultimate Performance power plan is now active." 