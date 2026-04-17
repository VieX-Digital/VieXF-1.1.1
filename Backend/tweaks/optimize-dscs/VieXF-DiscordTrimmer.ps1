# VieXF Discord RAM Trimmer Daemon
# This script is designed to run periodically via Task Scheduler.

$Code = @"
using System;
using System.Runtime.InteropServices;

public class RAMTrimmer {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetProcessWorkingSetSize(IntPtr hProcess, IntPtr dwMinimumWorkingSetSize, IntPtr dwMaximumWorkingSetSize);
}
"@

if (-not ([RAMTrimmer] -as [type])) {
    try {
        Add-Type -TypeDefinition $Code -ErrorAction Stop
    } catch {
        # If still fails, maybe it's already there but the check missed it
        if (-not ([RAMTrimmer] -as [type])) {
             Write-Error "Failed to load RAMTrimmer type: $($_.Exception.Message)"
        }
    }
}

function Trim-Discord {
    $procs = Get-Process -Name "Discord" -ErrorAction SilentlyContinue
    foreach ($p in $procs) {
        try {
            # Pass -1, -1 to empty the working set
            [RAMTrimmer]::SetProcessWorkingSetSize($p.Handle, -1, -1) | Out-Null
        } catch {
            # Silently ignore errors (likely access denied or process exited)
        }
    }
}

# Run the trim
Trim-Discord
