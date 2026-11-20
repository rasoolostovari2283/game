using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;

class Program
{
    static void Main()
    {
        string currentDir = AppDomain.CurrentDomain.BaseDirectory;

        // 1. Priority: If standalone native Electron app exists, launch it directly!
        string electronExe = Path.Combine(currentDir, @"dist\NeonHighway-win32-x64\NeonHighway.exe");
        if (File.Exists(electronExe))
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = electronExe;
                psi.WorkingDirectory = Path.GetDirectoryName(electronExe);
                Process.Start(psi);
                return;
            }
            catch (Exception)
            {
                // Fallback to web browser app mode if permission error
            }
        }

        // 2. Fallback: Launch via local web server and Edge/Chrome app mode
        int port = 3000;
        if (!IsPortOpen("127.0.0.1", port))
        {
            try
            {
                ProcessStartInfo serverInfo = new ProcessStartInfo();
                serverInfo.FileName = "node.exe";
                serverInfo.Arguments = "server.js";
                serverInfo.WorkingDirectory = currentDir;
                serverInfo.WindowStyle = ProcessWindowStyle.Hidden;
                serverInfo.CreateNoWindow = true;
                serverInfo.UseShellExecute = false;
                Process.Start(serverInfo);

                Thread.Sleep(600);
            }
            catch (Exception)
            {
            }
        }

        // Add timestamp to bypass any browser cache
        string gameUrl = "http://localhost:3000/?v=" + Environment.TickCount;
        string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
        if (!File.Exists(edgePath))
        {
            edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
        }

        string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
        if (!File.Exists(chromePath))
        {
            chromePath = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
        }

        string browserArgs = "--app=" + gameUrl + " --disable-http-cache --disable-cache --window-size=1280,820 --window-position=center";

        if (File.Exists(edgePath))
        {
            Process.Start(edgePath, browserArgs);
        }
        else if (File.Exists(chromePath))
        {
            Process.Start(chromePath, browserArgs);
        }
        else
        {
            Process.Start(gameUrl);
        }
    }

    static bool IsPortOpen(string host, int port)
    {
        try
        {
            using (TcpClient client = new TcpClient())
            {
                IAsyncResult result = client.BeginConnect(host, port, null, null);
                bool success = result.AsyncWaitHandle.WaitOne(300);
                if (!success) return false;
                client.EndConnect(result);
                return true;
            }
        }
        catch
        {
            return false;
        }
    }
}
