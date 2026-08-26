import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

function addDirectoryToZip(zip, folderPath, zipBasePath = '') {
  if (!fs.existsSync(folderPath)) return;
  const items = fs.readdirSync(folderPath);

  for (const item of items) {
    if (item === 'node_modules' || item === '.git' || item === 'target' || item === 'dist') continue;
    const fullPath = path.join(folderPath, item);
    const zipPath = zipBasePath ? `${zipBasePath}/${item}` : item;
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const folderZip = zip.folder(item);
      addDirectoryToZip(folderZip, fullPath, '');
    } else {
      zip.file(item, fs.readFileSync(fullPath));
    }
  }
}

export async function createWindowsClientZip(serverUrl = 'http://localhost:3000', outputPath = null) {
  const targetDir = path.join(process.cwd(), 'public', 'downloads');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const finalZipPath = outputPath || path.join(targetDir, 'Hesabdari-Meh-Windows-Client.zip');
  const zip = new JSZip();

  // 1. Hesabdari-Meh.cmd / .bat Launcher
  const launcherScript = `@echo off
chcp 65001 >nul
title حسابداری مَه - نسخه کلاینت ویندوز
cls
echo ===================================================================
echo             سامانه جامع حسابداری و مالی مَه
echo ===================================================================
echo در حال اجرای نسخه اختصاصی و سبک ویندوز...
echo آدرس سرور: ${serverUrl}
echo ===================================================================

set "SERVER_TARGET_URL=${serverUrl}"
if not "%~1"=="" set "SERVER_TARGET_URL=%~1"

:: 1. Microsoft Edge (Native WebView2 App Mode on Windows 10/11)
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%SERVER_TARGET_URL%" --window-size=1366,768 --user-data-dir="%LOCALAPPDATA%\\HesabdariMehClient"
    exit /b 0
)

if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%SERVER_TARGET_URL%" --window-size=1366,768 --user-data-dir="%LOCALAPPDATA%\\HesabdariMehClient"
    exit /b 0
)

:: 2. Google Chrome App Mode
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app="%SERVER_TARGET_URL%" --window-size=1366,768 --user-data-dir="%LOCALAPPDATA%\\HesabdariMehClient"
    exit /b 0
)

if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --app="%SERVER_TARGET_URL%" --window-size=1366,768 --user-data-dir="%LOCALAPPDATA%\\HesabdariMehClient"
    exit /b 0
)

:: 3. Default Browser Fallback
start "" "%SERVER_TARGET_URL%"
exit /b 0
`;
  zip.file('اجرای_حسابداری_مه.cmd', launcherScript);
  zip.file('Hesabdari-Meh-Launcher.bat', launcherScript);

  // 2. Desktop Shortcut Creator (VBS)
  const shortcutCreator = `Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\\حسابداری مَه.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
sCurrentDir = oWS.CurrentDirectory
oLink.TargetPath = sCurrentDir & "\\اجرای_حسابداری_مه.cmd"
oLink.WorkingDirectory = sCurrentDir
oLink.Description = "نرم افزار حسابداری مَه - کلاینت ویندوز"
oLink.WindowStyle = 7
oLink.Save
WScript.Echo "میانبر حسابداری مَه با موفقیت روی دسکتاپ ویندوز ایجاد شد."
`;
  zip.file('ایجاد_میانبر_روی_دسکتاپ.vbs', shortcutCreator);

  // 3. User Guide
  const instructions = `===================================================================
      راهنمای اجرای سریع کلاینت ویندوز - سامانه حسابداری مَه
===================================================================

این بسته شامل کلاینت آماده و فوق‌العاده سبک ویندوز می‌باشد.
شما نیاز به نصب هیچ نرم‌افزار اضافی یا کامپایلر ندارید!

نحوه استفاده در کامپیوترهای ویندوزی:
۱. فایل ZIP را از حالت فشرده خارج (Extract) کنید.
۲. روی فایل «اجرای_حسابداری_مه.cmd» دوبار کلیک کنید.
۳. برنامه در قالب یک نرم‌افزار مستقل، روان و بدون کادر مرورگر باز می‌شود.

ایجاد میانبر روی دسکتاپ:
- کافی است روی فایل «ایجاد_میانبر_روی_دسکتاپ.vbs» دوبار کلیک کنید تا آیکون میانبر مستقیماً روی صفحه دسکتاپ شما قرار گیرد.

آدرس اتصال متمرکز سرور:
${serverUrl}

همچنین فایل‌های اسکریپت و سورس پروژه در پوشه windows_setup ضمیمه شده است.
===================================================================
`;
  zip.file('راهنمای_استفاده_کلاینت.txt', instructions);

  // 4. Windows Setup Scripts folder
  const winSetupDir = path.join(process.cwd(), 'windows_setup');
  if (fs.existsSync(winSetupDir)) {
    const folder = zip.folder('windows_setup');
    addDirectoryToZip(folder, winSetupDir);
  }

  // Generate buffer and write to file
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  fs.writeFileSync(finalZipPath, buffer);
  console.log(`[Windows Builder] Bundle created successfully: ${finalZipPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
  return finalZipPath;
}

// Direct execution from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argUrl = process.argv[2] || 'http://localhost:3000';
  createWindowsClientZip(argUrl)
    .then((filePath) => console.log(`Finished: ${filePath}`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
