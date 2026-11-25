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
                    Console.WriteLine("找不到 setup.ps1，安装包不完整。");
                    Console.ReadKey();
                    return 1;
                }

                Console.Title = "mc-anime 安装程序";
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
                        Console.WriteLine("无法启动 PowerShell。");
                        Console.ReadKey();
                        return 1;
                    }
                    p.WaitForExit();
                    if (p.ExitCode != 0)
                    {
                        Console.WriteLine();
                        Console.WriteLine("安装过程返回错误码 " + p.ExitCode + "。");
                        Console.ReadKey();
                        return p.ExitCode;
                    }
                }
                return 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine("安装程序出错：" + ex.Message);
                Console.ReadKey();
                return 1;
            }
        }
    }
}
