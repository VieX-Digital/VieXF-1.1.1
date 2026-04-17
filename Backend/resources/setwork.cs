using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.IO;

namespace SetWork
{
    class Program
    {
        [DllImport("kernel32.dll")]
        static extern bool SetProcessWorkingSetSize(IntPtr hProcess, IntPtr dwMinimumWorkingSetSize, IntPtr dwMaximumWorkingSetSize);

        [DllImport("psapi.dll")]
        static extern int EmptyWorkingSet(IntPtr hProcess);

        static void Main(string[] args)
        {
            string startLog = Path.Combine(Path.GetTempPath(), "viexf_daemon_start.log");
            string activityLog = Path.Combine(Path.GetTempPath(), "viexf_daemon_activity.log");
            
            try { File.WriteAllText(startLog, "VieXF Daemon Started: " + DateTime.Now.ToString()); } catch {}

            while (true)
            {
                try
                {
                    Process[] processes = Process.GetProcesses();
                    var currentProcess = Process.GetCurrentProcess();
                    bool hit = false;
                    
                    foreach (Process proc in processes)
                    {
                        try 
                        {
                            if (proc.Id == currentProcess.Id) continue;
                            
                            string name = proc.ProcessName.ToLower();
                            // Targeted matching for BOTH dev and prod names: "VieXF", "vie-xf", "electron"
                            if (name.Contains("vie") || name.Contains("electron") || name.Contains("msedgewebview2"))
                            {
                                SetProcessWorkingSetSize(proc.Handle, (IntPtr)(-1), (IntPtr)(-1));
                                EmptyWorkingSet(proc.Handle);
                                hit = true;
                            }
                        } 
                        catch {}
                    }
                    
                    if (hit) {
                        try { File.WriteAllText(activityLog, "Last Squeeze: " + DateTime.Now.ToString()); } catch {}
                    }
                }
                catch {}
                
                // 800ms for extremely fast RAM clearing without killing CPU
                Thread.Sleep(800);
            }
        }
    }
}
