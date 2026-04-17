$Code = @"
using System;
using System.Runtime.InteropServices;

public class RAMTrimmer {
    [DllImport("kernel32.dll")]
    public static extern bool SetProcessWorkingSetSize(IntPtr hProcess, IntPtr dwMinimumWorkingSetSize, IntPtr dwMaximumWorkingSetSize);
}
"@
Add-Type -TypeDefinition $Code

function Trim-Process {
    param([string]$Name)
    $procs = Get-Process -Name $Name -ErrorAction SilentlyContinue
    foreach ($p in $procs) {
        try {
            [RAMTrimmer]::SetProcessWorkingSetSize($p.Handle, -1, -1) | Out-Null
            Write-Host "Trimmed $($p.ProcessName) ($($p.Id))" -ForegroundColor Green
        } catch {
            Write-Host "Failed to trim $($p.ProcessName) ($($p.Id)): $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

Trim-Process -Name "discord"
