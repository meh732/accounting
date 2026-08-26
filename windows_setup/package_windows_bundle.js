import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { generateWindowsExeWithUrl } from './exe_patcher.js';

function addDirectoryToZip(zip, folderPath, zipBasePath = '') {
  if (!fs.existsSync(folderPath)) return;
  const items = fs.readdirSync(folderPath);

  for (const item of items) {
    if (item === 'node_modules' || item === '.git' || item === 'target' || item.endsWith('.tmp')) continue;
    const fullPath = path.join(folderPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const folderZip = zip.folder(item);
      if (folderZip) addDirectoryToZip(folderZip, fullPath, '');
    } else {
      zip.file(item, fs.readFileSync(fullPath));
    }
  }
}

/**
 * 1. Build Standalone Client Package (EXE + ZIP)
 * Only connects to Server, 0 configuration, 0 source code needed.
 */
export async function createClientBundle(serverUrl = 'http://localhost:3000') {
  const targetDir = path.join(process.cwd(), 'public', 'downloads');
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const standaloneExePath = path.join(targetDir, 'Hesabdari-Meh-Client.exe');
  const finalZipPath = path.join(targetDir, 'Hesabdari-Meh-Client.zip');

  // Generate patched client .exe
  generateWindowsExeWithUrl(serverUrl, standaloneExePath);

  const zip = new JSZip();
  if (fs.existsSync(standaloneExePath)) {
    const exeBuf = fs.readFileSync(standaloneExePath);
    zip.file('Hesabdari-Meh-Client.exe', exeBuf);
    zip.file('حسابداری_مَه_کلاینت.exe', exeBuf);
  }

  // Quick batch launcher
  const launcherScript = `@echo off
chcp 65001 >nul
title حسابداری مَه - نسخه کلاینت ویندوز
set "SERVER_TARGET_URL=${serverUrl}"
if not "%~1"=="" set "SERVER_TARGET_URL=%~1"

if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%SERVER_TARGET_URL%" --window-size=1366,768 --user-data-dir="%LOCALAPPDATA%\\HesabdariMehClient"
    exit /b 0
)
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%SERVER_TARGET_URL%" --window-size=1366,768 --user-data-dir="%LOCALAPPDATA%\\HesabdariMehClient"
    exit /b 0
)
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app="%SERVER_TARGET_URL%" --window-size=1366,768 --user-data-dir="%LOCALAPPDATA%\\HesabdariMehClient"
    exit /b 0
)
start "" "%SERVER_TARGET_URL%"
exit /b 0
`;
  zip.file('اجرای_کلاینت.cmd', launcherScript);

  // Desktop Shortcut Script (VBS)
  const shortcutCreator = `Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\\حسابداری مَه (کلاینت).lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
sCurrentDir = oWS.CurrentDirectory

If oWS.FileExists(sCurrentDir & "\\Hesabdari-Meh-Client.exe") Then
    oLink.TargetPath = sCurrentDir & "\\Hesabdari-Meh-Client.exe"
Else
    oLink.TargetPath = sCurrentDir & "\\اجرای_کلاینت.cmd"
End If

oLink.WorkingDirectory = sCurrentDir
oLink.Description = "حسابداری مَه - کلاینت ویندوز"
oLink.Save
WScript.Echo "میانبر کلاینت حسابداری مَه با موفقیت روی دسکتاپ ایجاد شد."
`;
  zip.file('ایجاد_میانبر_کلاینت_روی_دسکتاپ.vbs', shortcutCreator);

  const guide = `===================================================================
   بسته کلاینت ویندوز (مخصوص کامپیوتر دوم/حسابدار/صندوقدار)
===================================================================
این بسته بدون هیچ سورس‌کدی و بدون نیاز به نصب هیچ ابزار اضافی کار می‌کند.

نحوه اجرا:
۱. فایل «Hesabdari-Meh-Client.exe» را دوبار کلیک کنید.
یا
۲. روی «ایجاد_میانبر_کلاینت_روی_دسکتاپ.vbs» کلیک کنید تا آیکون روی دسکتاپ قرار گیرد.

آدرس اتصال سرور تنظیم شده:
${serverUrl}
===================================================================`;
  zip.file('راهنمای_کلاینت.txt', guide);

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  fs.writeFileSync(finalZipPath, buffer);
  // Also copy to legacy path
  fs.writeFileSync(path.join(targetDir, 'Hesabdari-Meh-Windows-Client.zip'), buffer);

  console.log(`[Client Builder] Client ZIP created: ${finalZipPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  return { exePath: standaloneExePath, zipPath: finalZipPath };
}

/**
 * 2. Build Standalone Server Package (Standalone Portable Server ZIP & EXE)
 * Runs the complete backend database + frontend on Windows with 1-click! No node.js installation or source code needed.
 */
export async function createServerBundle() {
  const targetDir = path.join(process.cwd(), 'public', 'downloads');
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const finalZipPath = path.join(targetDir, 'Hesabdari-Meh-Standalone-Server.zip');
  const zip = new JSZip();

  // 1. Root Server Launcher Executables
  const serverExePath = path.join(process.cwd(), 'windows_setup', 'Hesabdari-Meh-Server.exe');
  if (fs.existsSync(serverExePath)) {
    const srvExeBuf = fs.readFileSync(serverExePath);
    zip.file('Hesabdari-Meh-Server.exe', srvExeBuf);
    zip.file('اجرای_سرور_حسابداری_مه.exe', srvExeBuf);
  }

  // 2. CMD Launchers
  const startCmd = `@echo off
chcp 65001 >nul
title سرور مرکزی حسابداری مَه
cd /d "%~dp0"
cls
echo ===================================================================
echo             سرور مرکزی و پایگاه داده حسابداری مَه
echo ===================================================================
echo  در حال اجرای سرور داخلی پرتابل روی پورت 3000...
echo  (این پنجره را نبندید تا سایر کامپیوترها بتوانند وصل شوند)
echo ===================================================================

if exist "bin\\node.exe" (
    start "" "bin\\node.exe" "app\\server.bundle.js"
) else (
    node "app\\server.bundle.js"
)

timeout /t 2 >nul

:: Open browser
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app="http://localhost:3000" --window-size=1366,768
    exit /b 0
)
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app="http://localhost:3000" --window-size=1366,768
    exit /b 0
)
start "" "http://localhost:3000"
`;
  zip.file('شروع_سرور.cmd', startCmd);

  // 3. Stop Server CMD
  const stopCmd = `@echo off
chcp 65001 >nul
title توقف سرور حسابداری مَه
taskkill /f /im node.exe 2>nul
echo سرور با موفقیت متوقف شد.
pause
`;
  zip.file('توقف_سرور.cmd', stopCmd);

  // 4. Desktop Shortcut Creator for Server
  const serverShortcut = `Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\\سرور حسابداری مَه.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
sCurrentDir = oWS.CurrentDirectory

If oWS.FileExists(sCurrentDir & "\\Hesabdari-Meh-Server.exe") Then
    oLink.TargetPath = sCurrentDir & "\\Hesabdari-Meh-Server.exe"
Else
    oLink.TargetPath = sCurrentDir & "\\شروع_سرور.cmd"
End If

oLink.WorkingDirectory = sCurrentDir
oLink.Description = "سرور مرکزی حسابداری مَه"
oLink.Save
WScript.Echo "میانبر سرور حسابداری مَه با موفقیت روی دسکتاپ ایجاد شد."
`;
  zip.file('ایجاد_میانبر_سرور_روی_دسکتاپ.vbs', serverShortcut);

  // 5. Embedded Binaries (Node.exe portable engine)
  const nodeExePath = path.join(process.cwd(), 'windows_setup', 'bin', 'node.exe');
  if (fs.existsSync(nodeExePath)) {
    zip.file('bin/node.exe', fs.readFileSync(nodeExePath));
  }

  // 6. Embedded Compiled App Bundle (Single bundled server + frontend)
  const bundlePath = path.join(process.cwd(), 'windows_setup', 'server.bundle.js');
  if (fs.existsSync(bundlePath)) {
    zip.file('app/server.bundle.js', fs.readFileSync(bundlePath));
  }

  // 7. Dist Web UI assets
  const distDir = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    const distFolder = zip.folder('dist');
    if (distFolder) addDirectoryToZip(distFolder, distDir);
  }

  // 8. Server Readme & Guide
  const serverGuide = `===================================================================
       بسته سرور مستقل و پرتابل ویندوز - حسابداری مَه
===================================================================
این بسته به صورت کامپایل شده، سبک و کاملاً مستقل بدون نیاز به اینترنت و بدون
نیاز به نصب Node.js، پایتون یا هر ابزار دیگری روی ویندوز کار می‌کند.

نحوه راه‌اندازی سرور روی کامپیوتر اصلی (سرور):
۱. کافیست فایل «Hesabdari-Meh-Server.exe» یا «شروع_سرور.cmd» را اجرا کنید.
۲. برنامه باز شده و روی پورت 3000 شروع به کار می‌کند.
۳. برای اتصال کامپیوترهای دیگر (کلاینت):
   - در کامپیوتر کلاینت مرورگر را باز کرده و آدرس آی‌پی سرور را وارد کنید:
     مثال: http://192.168.1.50:3000
   - یا فایل کلاینت را از آدرس http://192.168.1.50:3000/download/client دانلود کنید.
===================================================================`;
  zip.file('راهنمای_سرور.txt', serverGuide);

  console.log('[Server Builder] Compressing Standalone Server Package...');
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  fs.writeFileSync(finalZipPath, buffer);
  console.log(`[Server Builder] Standalone Server ZIP created: ${finalZipPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
  return { zipPath: finalZipPath };
}

// Generate all packages
export async function buildAllPackages(serverUrl = 'http://localhost:3000') {
  console.log('--- Building Standalone Windows Packages ---');
  const clientResult = await createClientBundle(serverUrl);
  const serverResult = await createServerBundle();
  return { client: clientResult, server: serverResult };
}

// Direct execution
if (process.argv[1] && process.argv[1].endsWith('package_windows_bundle.js')) {
  const argUrl = process.argv[2] || 'http://localhost:3000';
  buildAllPackages(argUrl)
    .then(() => console.log('✓ All standalone Windows bundles generated successfully!'))
    .catch((err) => {
      console.error('Error generating bundles:', err);
      process.exit(1);
    });
}
