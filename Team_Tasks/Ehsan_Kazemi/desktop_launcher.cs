using System;
using System.IO;
using System.Windows.Forms;
using System.Drawing;

namespace NeonHighwayLauncher
{
    /// <summary>
    /// لانچر نیتیو ویندوز برای بازی Neon Highway
    /// مسئول: احسان کاظمی
    /// ددلاین تحویل: ۵شنبه ۷ آبان ۱۴۰۳
    /// </summary>
    public class LauncherForm : Form
    {
        private WebBrowser browser;

        public LauncherForm()
        {
            this.Text = "Neon Highway - Desktop Edition";
            this.Size = new Size(1280, 800);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.Black;
            this.Icon = SystemIcons.Application;

            // ساخت کنترل وب بروزر برای اجرای بازی در صورت عدم استفاده از الکترون
            browser = new WebBrowser();
            browser.Dock = DockStyle.Fill;
            browser.ScrollBarsEnabled = false;
            browser.IsWebBrowserContextMenuEnabled = false;

            string htmlPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "index.html");
            if (File.Exists(htmlPath))
            {
                browser.Navigate(new Uri(htmlPath));
            }
            else
            {
                MessageBox.Show("فایل index.html در کنار لانچر یافت نشد!", "خطا", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }

            this.Controls.Add(browser);
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new LauncherForm());
        }
    }
}
