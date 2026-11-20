using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;

namespace NeonHighwayLauncher
{
    /// <summary>
    /// لانچر نیتیو ویندوز برای بازی Neon Highway
    /// توسعه‌دهنده: احسان کاظمی (مهندس فیزیک و استقرار دسکتاپ)
    /// نگارش: نسخه ۲.۵ نهایی (اسپرینت ۲)
    /// </summary>
    public class LauncherForm : Form
    {
        private Panel headerPanel;
        private Label titleLabel;
        private Label subLabel;
        private Button btnLaunchElectron;
        private Button btnLaunchBrowser;
        private Button btnQuit;
        private Label statusLabel;

        public LauncherForm()
        {
            this.Text = "Neon Highway - Cyberpunk Desktop Launcher";
            this.Size = new Size(620, 420);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(10, 15, 29); // Cyberpunk Dark Slate
            this.ForeColor = Color.White;
            this.Font = new Font("Tahoma", 10F, FontStyle.Regular);

            InitializeUI();
        }

        private void InitializeUI()
        {
            // ۱. هدر فرم با تم نئونی
            headerPanel = new Panel();
            headerPanel.Dock = DockStyle.Top;
            headerPanel.Height = 110;
            headerPanel.BackColor = Color.FromArgb(15, 23, 42);
            headerPanel.Paint += (s, e) =>
            {
                using (Pen cyanPen = new Pen(Color.FromArgb(0, 242, 255), 3))
                {
                    e.Graphics.DrawLine(cyanPen, 0, headerPanel.Height - 1, headerPanel.Width, headerPanel.Height - 1);
                }
            };

            titleLabel = new Label();
            titleLabel.Text = "NEON HIGHWAY";
            titleLabel.Font = new Font("Impact", 24F, FontStyle.Italic);
            titleLabel.ForeColor = Color.FromArgb(0, 242, 255);
            titleLabel.AutoSize = true;
            titleLabel.Location = new Point(24, 20);

            subLabel = new Label();
            subLabel.Text = "لانچر رسمی دسکتاپ ویندوز | پروژه مبانی بازی‌سازی (مهندس احسان کاظمی)";
            subLabel.Font = new Font("Tahoma", 9F, FontStyle.Regular);
            subLabel.ForeColor = Color.FromArgb(148, 163, 184);
            subLabel.AutoSize = true;
            subLabel.Location = new Point(26, 68);

            headerPanel.Controls.Add(titleLabel);
            headerPanel.Controls.Add(subLabel);
            this.Controls.Add(headerPanel);

            // ۲. دکمه اجرای نسخه ۶۴ بیتی مستقل (Electron Standalone)
            btnLaunchElectron = new Button();
            btnLaunchElectron.Text = "🚀 اجرای مستقیم بازی (نسخه ویندوز ۶۴ بیتی - ۶۰ FPS)";
            btnLaunchElectron.Location = new Point(40, 140);
            btnLaunchElectron.Size = new Size(530, 55);
            btnLaunchElectron.BackColor = Color.FromArgb(0, 242, 255);
            btnLaunchElectron.ForeColor = Color.Black;
            btnLaunchElectron.FlatStyle = FlatStyle.Flat;
            btnLaunchElectron.FlatAppearance.BorderSize = 0;
            btnLaunchElectron.Font = new Font("Tahoma", 11F, FontStyle.Bold);
            btnLaunchElectron.Cursor = Cursors.Hand;
            btnLaunchElectron.Click += (s, e) => LaunchGameExecutable();
            this.Controls.Add(btnLaunchElectron);

            // ۳. دکمه اجرای رزرو در مرورگر مدرن (Microsoft Edge / Chrome)
            btnLaunchBrowser = new Button();
            btnLaunchBrowser.Text = "🌐 اجرای وب‌ویو رزرو (Microsoft Edge / Chrome)";
            btnLaunchBrowser.Location = new Point(40, 210);
            btnLaunchBrowser.Size = new Size(530, 48);
            btnLaunchBrowser.BackColor = Color.FromArgb(30, 41, 59);
            btnLaunchBrowser.ForeColor = Color.White;
            btnLaunchBrowser.FlatStyle = FlatStyle.Flat;
            btnLaunchBrowser.FlatAppearance.BorderColor = Color.FromArgb(51, 65, 85);
            btnLaunchBrowser.Font = new Font("Tahoma", 10F, FontStyle.Bold);
            btnLaunchBrowser.Cursor = Cursors.Hand;
            btnLaunchBrowser.Click += (s, e) => LaunchInDefaultBrowser();
            this.Controls.Add(btnLaunchBrowser);

            // ۴. دکمه خروج
            btnQuit = new Button();
            btnQuit.Text = "خروج از لانچر";
            btnQuit.Location = new Point(40, 275);
            btnQuit.Size = new Size(530, 42);
            btnQuit.BackColor = Color.FromArgb(15, 23, 42);
            btnQuit.ForeColor = Color.FromArgb(203, 213, 225);
            btnQuit.FlatStyle = FlatStyle.Flat;
            btnQuit.FlatAppearance.BorderColor = Color.FromArgb(51, 65, 85);
            btnQuit.Cursor = Cursors.Hand;
            btnQuit.Click += (s, e) => Application.Exit();
            this.Controls.Add(btnQuit);

            // ۵. نوار وضعیت
            statusLabel = new Label();
            statusLabel.Text = "وضعیت: آماده اجرا | رزولوشن بهینه: 1920x1080 | سازگار با ویندوز 10 و 11";
            statusLabel.Dock = DockStyle.Bottom;
            statusLabel.TextAlign = ContentAlignment.MiddleCenter;
            statusLabel.ForeColor = Color.FromArgb(100, 116, 139);
            statusLabel.Font = new Font("Tahoma", 8F);
            statusLabel.Height = 35;
            this.Controls.Add(statusLabel);
        }

        private void LaunchGameExecutable()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            // بررسی مسیر فایل اجرایی مستقل در پوشه dist
            string exePath1 = Path.Combine(baseDir, "NeonHighway.exe");
            string exePath2 = Path.Combine(baseDir, @"dist\NeonHighway-win32-x64\NeonHighway.exe");
            string exePath3 = Path.Combine(baseDir, @"..\dist\NeonHighway-win32-x64\NeonHighway.exe");

            string targetExe = null;
            if (File.Exists(exePath1)) targetExe = exePath1;
            else if (File.Exists(exePath2)) targetExe = exePath2;
            else if (File.Exists(exePath3)) targetExe = exePath3;

            if (targetExe != null)
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = targetExe,
                    WorkingDirectory = Path.GetDirectoryName(targetExe)
                });
                Application.Exit();
            }
            else
            {
                // در صورت عدم یافتن فایل exe، در مرورگر مدرن اجرا می‌شود
                LaunchInDefaultBrowser();
            }
        }

        private void LaunchInDefaultBrowser()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string htmlPath = Path.Combine(baseDir, "index.html");
            if (!File.Exists(htmlPath))
            {
                htmlPath = Path.Combine(baseDir, @"..\index.html");
            }

            if (File.Exists(htmlPath))
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = htmlPath,
                    UseShellExecute = true
                });
                Application.Exit();
            }
            else
            {
                MessageBox.Show("فایل index.html در کنار لانچر یافت نشد!", "خطای لانچر", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
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
