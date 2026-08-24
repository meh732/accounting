# Persian Accounting Web Application

A modern, fast, and comprehensive Persian accounting and financial management web system built with React, Vite, Tailwind CSS, and Node.js.

## 🪟 راهنمای ساخت فایل نصبی و خروجی EXE برای ویندوز (Client & Server)

برای ساخت فایل‌های نصبی و اجرایی تحت ویندوز، ابزارهای **Electron Builder** و **PKG** با دستورات استاندارد نود جی‌اس در پروژه پیکربندی شده‌اند.

### دستورات سریع ساخت (NPM Commands):

1. **ساخت فایل نصبی کلاینت ویندوز (Windows Setup .exe Installer):**
   ```bash
   npm run dist:client
   ```
   > 📁 خروجی: در پوشه `release/` یک فایل نصبی کامل با نام `Hesabdari-Meh Setup 1.0.0.exe` (و همچنین نسخه بدون نیاز به نصب Portable) ایجاد می‌شود که آیکون دسکتاپ و منوی استارت را برای کلاینت می‌سازد.

2. **ساخت فایل اجرایی سرور ویندوز (Standalone Server .exe):**
   ```bash
   npm run dist:server
   ```
   > 📁 خروجی: در پوشه `dist-server/` فایل `Hesabdari-Meh-Server.exe` ایجاد می‌شود. این فایل کاملاً مستقل است و روی سیستم‌های مقصد **حتی نیازی به نصب بودن Node.js ندارد!** با دوبار کلیک، سرور روی پورت ۳۰۰۰ اجرا می‌شود.

3. **ساخت همزمان هر دو خروجی (کلاینت و سرور):**
   ```bash
   npm run dist:all
   ```

4. **تست و اجرای سریع کلاینت تحت ویندوز در محیط توسعه:**
   ```bash
   npm run start:electron
   ```

---

## 🚀 One-Line Installation on Linux (Ubuntu / Debian / CentOS / AlmaLinux)

Run the following command in your server terminal as `root` (or with `sudo`):

```bash
bash <(curl -Ls https://raw.githubusercontent.com/meh732/accounting/main/install.sh)
```

or via `wget`:

```bash
bash <(wget -qO- https://raw.githubusercontent.com/meh732/accounting/main/install.sh)
```

---

## 🛠 Management Panel (CLI)

After installation, simply type `accounting` anywhere in your terminal to open the interactive Sanaei-style management menu:

```bash
accounting
```

### Interactive Menu Overview:

```text
====================================================================
           Persian Accounting System - Linux CLI Manager            
====================================================================
  Repository:  https://github.com/meh732/accounting.git
  App Path:    /var/www/accounting
  Backup Path: /var/backups/accounting
  Status:      ● Running (Active) on port 3000
====================================================================
  1.  Install Accounting App
  2.  Update App (Auto-Backup First)
  3.  Uninstall App (Auto-Backup First)
--------------------------------------------------------------------
  4.  Start Service
  5.  Stop Service
  6.  Restart Service
  7.  View Service Status
  8.  View Live Logs (journalctl)
--------------------------------------------------------------------
  9.  Change Web Port
 10.  Create Full System Backup
 11.  Restore from Backup
 12.  Toggle Auto-Start on Boot
--------------------------------------------------------------------
  0.  Exit
====================================================================
```

---

## ⚡ Direct CLI Commands

You can also run commands non-interactively:

- **Start Service:** `accounting start`
- **Stop Service:** `accounting stop`
- **Restart Service:** `accounting restart`
- **View Status:** `accounting status`
- **View Real-Time Logs:** `accounting logs`
- **Update System:** `accounting update` *(Automatically creates full backup first)*
- **Create Backup:** `accounting backup`
- **Restore Backup:** `accounting restore`
- **Uninstall:** `accounting uninstall` *(Automatically creates safety backup first)*

---

## 🛡️ Automatic Backup Safety
- Before **ANY update**, a full archive is automatically saved to `/var/backups/accounting/accounting_backup_pre_update_<TIMESTAMP>.tar.gz`.
- Before **ANY uninstallation**, a full archive is saved to `/var/backups/accounting/accounting_backup_pre_uninstall_<TIMESTAMP>.tar.gz`.

---

## 🌐 Nginx Reverse Proxy & SSL (Optional)

If you want to bind a domain with HTTPS on port 80/443:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
