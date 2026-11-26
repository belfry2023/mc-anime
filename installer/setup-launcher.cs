using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;

namespace McAnimeSetup
{
    internal static class Program
    {
        [STAThread]
        private static int Main(string[] args)
        {
            try
            {
                string dir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
                string script = Path.Combine(dir, "setup.ps1");
                if (!File.Exists(script))
                {
                    Console.WriteLine("[mc-anime] setup.ps1 not found next to setup.exe.");
                    Console.WriteLine("[mc-anime] Please keep setup.exe and setup.ps1 in the same folder.");
                    Pause();
                    return 1;
                }

                Console.Title = "mc-anime setup";
                Console.WriteLine("[mc-anime] starting installer...");
                Console.WriteLine();

                var psi = new ProcessStartInfo
                {
                    FileName = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell", "v1.0", "powershell.exe"),
                    Arguments = "-NoProfile -ExecutionPolicy Bypass -File \"" + script + "\"",
                    WorkingDirectory = dir,
                    UseShellExecute = false
                };

                using (var p = Process.Start(psi))
                {
                    if (p == null)
                    {
                        Console.WriteLine("[mc-anime] cannot start powershell.exe.");
                        Pause();
                        return 1;
                    }
                    p.WaitForExit();
                    if (p.ExitCode != 0)
                    {
                        Console.WriteLine();
                        Console.WriteLine("[mc-anime] installer exited with code " + p.ExitCode + ".");
                        Console.WriteLine("[mc-anime] If the game still does not start, run the launcher .bat in the install folder and send the window text back.");
                        Pause();
                        return p.ExitCode;
                    }
                }
                return 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine("[mc-anime] setup error: " + ex.Message);
                Pause();
                return 1;
            }
        }

        private static void Pause()
        {
            Console.WriteLine();
            Console.WriteLine("Press any key to close...");
            try { Console.ReadKey(true); } catch { }
        }
    }
}
