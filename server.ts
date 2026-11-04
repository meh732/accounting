import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

import {
  defaultChartOfAccounts,
  defaultContacts,
  defaultBankAccounts,
  defaultProductCategories,
  defaultProducts,
  defaultJournalVouchers,
  defaultInvoices,
  defaultExpenses,
  defaultCheques,
  defaultFinancialTransactions,
  defaultCompanySettings,
  defaultFinancialYears,
} from './src/utils/defaultData';

function createBlankDatabase() {
  return {
    version: 3,
    lastUpdated: new Date().toISOString(),
    settings: defaultCompanySettings,
    financialYears: defaultFinancialYears,
    accounts: defaultChartOfAccounts,
    contacts: defaultContacts,
    bankAccounts: defaultBankAccounts,
    categories: defaultProductCategories,
    products: defaultProducts,
    vouchers: defaultJournalVouchers,
    invoices: defaultInvoices,
    expenses: defaultExpenses,
    cheques: defaultCheques,
    financialTransactions: defaultFinancialTransactions,
    backups: [],
  };
}

// In-memory cache + file sync
let currentDatabase = createBlankDatabase();

// Ensure data directory exists and load DB
function initDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const isOldBlankDb =
        parsed &&
        (!parsed.version || parsed.version < 3) &&
        (!parsed.products || parsed.products.length === 0) &&
        (!parsed.invoices || parsed.invoices.length === 0);

      if (parsed && typeof parsed === 'object' && !isOldBlankDb) {
        currentDatabase = {
          ...createBlankDatabase(),
          ...parsed,
          accounts: parsed.accounts && parsed.accounts.length > 0 ? parsed.accounts : defaultChartOfAccounts,
        };
        console.log(`[Server DB] Successfully loaded database with version ${currentDatabase.version}`);
        return;
      }
    }

    // Write initial verified database file
    saveDatabaseToDisk(currentDatabase);
    console.log(`[Server DB] Created initial verified accounting cycle database on server.`);
  } catch (err) {
    console.error(`[Server DB] Error loading database file:`, err);
    currentDatabase = createBlankDatabase();
  }
}

function saveDatabaseToDisk(data: typeof currentDatabase) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error(`[Server DB] Failed to save database to disk:`, err);
  }
}

async function startServer() {
  initDatabase();

  const app = express();
  
  // Universal CORS for all clients and proxies
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Client-Id');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Active SSE Clients for instant real-time broadcast across all computers
  const sseClients = new Set<express.Response>();

  function broadcastDatabaseUpdate(updatedDb: typeof currentDatabase, senderClientId?: string) {
    const payload = JSON.stringify({
      type: 'sync',
      version: updatedDb.version,
      lastUpdated: updatedDb.lastUpdated,
      senderClientId: senderClientId || null,
      data: updatedDb
    });

    for (const client of sseClients) {
      try {
        client.write(`event: sync\ndata: ${payload}\n\n`);
      } catch (err) {
        sseClients.delete(client);
      }
    }
  }

  // API Endpoints
  // 1. Health check & Server Status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      version: currentDatabase.version,
      lastUpdated: currentDatabase.lastUpdated,
      connectedClients: sseClients.size,
      financialYear: currentDatabase.settings.financialYear || null,
      serverTime: new Date().toISOString()
    });
  });

  // 2. Real-time Server-Sent Events (SSE) stream for instant synchronization
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders?.();

    // Send initial connection packet
    res.write(`event: connected\ndata: ${JSON.stringify({
      version: currentDatabase.version,
      lastUpdated: currentDatabase.lastUpdated
    })}\n\n`);

    sseClients.add(res);

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 10000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // 3. Get current version for polling fallback
  app.get('/api/version', (req, res) => {
    res.json({
      version: currentDatabase.version || 1,
      lastUpdated: currentDatabase.lastUpdated
    });
  });

  // 4. Get entire unified server database
  app.get('/api/data', (req, res) => {
    res.json(currentDatabase);
  });

  // 5. Update entire or partial database
  app.post('/api/data', (req, res) => {
    try {
      const incoming = req.body;
      if (!incoming || typeof incoming !== 'object') {
        res.status(400).json({ error: 'Invalid payload' });
        return;
      }

      const senderClientId = req.headers['x-client-id'] as string || incoming.senderClientId;
      const newVersion = (currentDatabase.version || 1) + 1;
      const now = new Date().toISOString();

      const cleanIncoming = { ...incoming };
      delete cleanIncoming.senderClientId;

      currentDatabase = {
        ...currentDatabase,
        ...cleanIncoming,
        version: newVersion,
        lastUpdated: now
      };

      saveDatabaseToDisk(currentDatabase);

      // Instant push to all connected computers & browser tabs!
      broadcastDatabaseUpdate(currentDatabase, senderClientId);

      res.json({
        success: true,
        version: newVersion,
        lastUpdated: now,
        message: 'Database saved and broadcasted successfully.'
      });
    } catch (err) {
      console.error('[Server DB] Error updating database:', err);
      res.status(500).json({ error: 'Failed to update server database' });
    }
  });

  // 6. Reset database on server
  app.post('/api/reset', (req, res) => {
    try {
      const blank = createBlankDatabase();
      blank.version = (currentDatabase.version || 1) + 1;
      blank.lastUpdated = new Date().toISOString();

      currentDatabase = blank;
      saveDatabaseToDisk(currentDatabase);

      broadcastDatabaseUpdate(currentDatabase);

      res.json({
        success: true,
        version: currentDatabase.version,
        data: currentDatabase
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to reset server database' });
    }
  });

  // 6.5. Server-side Bot Backup Proxy (Telegram & Bale) to bypass browser CORS
  app.post('/api/bot-backup', async (req, res) => {
    try {
      const { platform, botToken, chatId, backupJSONString, companyName } = req.body || {};
      if (!platform || !botToken || !chatId || !backupJSONString) {
        res.status(400).json({ ok: false, description: 'پارامترهای ارسالی ناقص است.' });
        return;
      }

      const cleanToken = String(botToken).trim();
      const cleanChatId = String(chatId).trim();
      const safeCompany = String(companyName || 'Hesabdari_Meh').replace(/\s+/g, '_');
      const fileName = `backup_${safeCompany}_${new Date().toISOString().slice(0, 10)}.json`;
      const caption =
        platform === 'telegram'
          ? `🛡️ پشتیبان کامل خودکار سیستم حسابداری مه\n🏢 فروشگاه/شرکت: ${companyName || 'حسابداری مه'}\n📅 تاریخ: ${new Date().toLocaleDateString('fa-IR')}\n⏰ ساعت: ${new Date().toLocaleTimeString('fa-IR')}\n💾 حجم فایل: ${(String(backupJSONString).length / 1024).toFixed(1)} KB`
          : `🛡️ پشتیبان کامل خودکار سیستم حسابداری مه\n🏢 فروشگاه/شرکت: ${companyName || 'حسابداری مه'}\n📅 تاریخ: ${new Date().toLocaleDateString('fa-IR')}\n⏰ ساعت: ${new Date().toLocaleTimeString('fa-IR')}\n💾 حجم فایل: ${(String(backupJSONString).length / 1024).toFixed(1)} KB`;

      const apiUrl =
        platform === 'bale'
          ? `https://tapi.bale.ai/bot${cleanToken}/sendDocument`
          : `https://api.telegram.org/bot${cleanToken}/sendDocument`;

      const formData = new FormData();
      formData.append('chat_id', cleanChatId);
      formData.append('caption', caption);
      const blob = new Blob([String(backupJSONString)], { type: 'application/json' });
      formData.append('document', blob, fileName);

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error('[Server Bot Backup] Error:', err);
      res.status(500).json({
        ok: false,
        description: err?.message || 'خطا در ارتباط سرور با پیام‌رسان',
      });
    }
  });

  // Helper function to add folders to zip
  function addFolderToZip(zip: JSZip, folderPath: string) {
    if (!fs.existsSync(folderPath)) return;
    const items = fs.readdirSync(folderPath);
    for (const item of items) {
      if (item === 'node_modules' || item === '.git' || item === 'target' || item === 'dist') continue;
      const fullPath = path.join(folderPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const folderZip = zip.folder(item);
        if (folderZip) addFolderToZip(folderZip, fullPath);
      } else {
        zip.file(item, fs.readFileSync(fullPath));
      }
    }
  }

  // 7. Direct Windows Client Download (.zip bundle generated directly on server)
  const handleWindowsDownload = async (req: express.Request, res: express.Response) => {
    try {
      const host = req.get('host') || `localhost:${PORT}`;
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const serverUrl = `${protocol}://${host}`;

      const zip = new JSZip();

      // Launcher script
      const launcherContent = `@echo off
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
      zip.file('اجرای_حسابداری_مه.cmd', launcherContent);
      zip.file('Hesabdari-Meh-Launcher.bat', launcherContent);

      // Shortcut creator
      const shortcutContent = `Set oWS = WScript.CreateObject("WScript.Shell")
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
      zip.file('ایجاد_میانبر_روی_دسکتاپ.vbs', shortcutContent);

      // Instructions
      const instructions = `===================================================================
      راهنمای اجرای سریع کلاینت ویندوز - سامانه حسابداری مَه
===================================================================

این بسته شامل کلاینت آماده و فوق‌العاده سبک ویندوز می‌باشد.
شما نیاز به نصب هیچ نرم‌افزار اضافی یا کامپایلر ندارید!

نحوه استفاده در کامپیوترهای ویندوزی:
۱. این فایل ZIP را از حالت فشرده خارج (Extract) کنید.
۲. روی فایل «اجرای_حسابداری_مه.cmd» دوبار کلیک کنید.
۳. برنامه در قالب یک نرم‌افزار مستقل، روان و بدون کادر مرورگر باز می‌شود.

ایجاد میانبر روی دسکتاپ:
- کافی است روی فایل «ایجاد_میانبر_روی_دسکتاپ.vbs» دوبار کلیک کنید تا آیکون میانبر مستقیماً روی صفحه دسکتاپ شما قرار گیرد.

آدرس اتصال متمرکز سرور:
${serverUrl}

===================================================================
`;
      // Add standalone compiled Windows .EXE binary into ZIP
      const baseExePath = path.join(process.cwd(), 'windows_setup', 'Hesabdari-Meh-Client-Base.exe');
      if (fs.existsSync(baseExePath)) {
        try {
          const rawExe = fs.readFileSync(baseExePath);
          const startMarker = '###HESABDARI_MEH_SERVER_URL_START###';
          const endMarker = '###HESABDARI_MEH_SERVER_URL_END###';
          const markerIndex = rawExe.indexOf(Buffer.from(startMarker, 'utf-8'));
          let finalExe = rawExe;
          if (markerIndex !== -1) {
            const newPayload = `${startMarker}${serverUrl}${endMarker}`;
            finalExe = Buffer.from(rawExe);
            finalExe.fill(0, markerIndex, markerIndex + 2048);
            finalExe.write(newPayload, markerIndex, 'utf-8');
          }
          zip.file('Hesabdari-Meh-Client.exe', finalExe);
          zip.file('حسابداری_مَه.exe', finalExe);
        } catch (e) {
          console.error('[Server Download] Error patching exe for zip:', e);
        }
      }

      zip.file('راهنمای_استفاده_کلاینت.txt', instructions);

      const winSetupDir = path.join(process.cwd(), 'windows_setup');
      if (fs.existsSync(winSetupDir)) {
        const folder = zip.folder('windows_setup');
        if (folder) addFolderToZip(folder, winSetupDir);
      }

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="Hesabdari-Meh-Windows-Client.zip"');
      res.setHeader('Content-Length', zipBuffer.length);
      res.send(zipBuffer);
    } catch (err) {
      console.error('[Server Download] Error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create windows download bundle' });
      }
    }
  };

  // Direct .EXE executable download handler
  const handleExeDownload = (req: express.Request, res: express.Response) => {
    try {
      const host = req.get('host') || `localhost:${PORT}`;
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const serverUrl = `${protocol}://${host}`;

      const baseExePath = path.join(process.cwd(), 'windows_setup', 'Hesabdari-Meh-Client-Base.exe');
      if (!fs.existsSync(baseExePath)) {
        return res.status(404).send('Base executable template not found.');
      }

      const rawExe = fs.readFileSync(baseExePath);
      const startMarker = '###HESABDARI_MEH_SERVER_URL_START###';
      const endMarker = '###HESABDARI_MEH_SERVER_URL_END###';
      const markerIndex = rawExe.indexOf(Buffer.from(startMarker, 'utf-8'));
      let finalExe = rawExe;
      if (markerIndex !== -1) {
        const newPayload = `${startMarker}${serverUrl}${endMarker}`;
        finalExe = Buffer.from(rawExe);
        finalExe.fill(0, markerIndex, markerIndex + 2048);
        finalExe.write(newPayload, markerIndex, 'utf-8');
      }

      res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
      res.setHeader('Content-Disposition', 'attachment; filename="Hesabdari-Meh-Client.exe"');
      res.setHeader('Content-Length', finalExe.length);
      res.send(finalExe);
    } catch (err) {
      console.error('[Server EXE Download] Error:', err);
      res.status(500).send('Failed to serve exe');
    }
  };

  // Standalone Server package download handler
  const handleServerBundleDownload = (req: express.Request, res: express.Response) => {
    try {
      const serverZipPath = path.join(process.cwd(), 'public', 'downloads', 'Hesabdari-Meh-Standalone-Server.zip');
      if (fs.existsSync(serverZipPath)) {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="Hesabdari-Meh-Standalone-Server.zip"');
        return res.sendFile(serverZipPath);
      }
      res.status(404).send('Standalone server package not found. Run package script first.');
    } catch (err) {
      console.error('[Server Bundle Download] Error:', err);
      res.status(500).send('Failed to serve server bundle');
    }
  };

  app.get('/download/windows', handleWindowsDownload);
  app.get('/download/client', handleWindowsDownload);
  app.get('/api/download/windows-client', handleWindowsDownload);
  app.get('/api/download/windows', handleWindowsDownload);
  app.get('/download/exe', handleExeDownload);
  app.get('/download/client.exe', handleExeDownload);
  app.get('/api/download/exe', handleExeDownload);
  app.get('/download/server', handleServerBundleDownload);
  app.get('/download/server.zip', handleServerBundleDownload);
  app.get('/api/download/server', handleServerBundleDownload);

  // Serve Frontend via Vite in development, or Static Files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(` Persian Accounting Central Server is Running!     `);
    console.log(` Port: ${PORT}, Host: ${HOST}                      `);
    console.log(` Server DB: ${DB_FILE}                             `);
    console.log(`====================================================`);
  });
}

startServer();
