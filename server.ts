import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const LICENSE_FILE = path.join(DATA_DIR, 'license.json');

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
import {
  sha256HexPure,
  verifyOfflineLicenseKey,
  normalizeDeviceId,
  VerifiedLicenseInfo,
} from './src/utils/offlineLicense';

interface ServerLicenseRecord {
  serverDeviceId: string;
  activated: boolean;
  activatedDeviceId?: string;
  licenseKey?: string;
  activatedAt?: string;
}

function generateDeterministicLinuxServerId(): string {
  try {
    let machineId = '';
    if (fs.existsSync('/etc/machine-id')) {
      machineId = fs.readFileSync('/etc/machine-id', 'utf-8').trim();
    } else if (fs.existsSync('/var/lib/dbus/machine-id')) {
      machineId = fs.readFileSync('/var/lib/dbus/machine-id', 'utf-8').trim();
    }
    const rawTraits = [
      machineId || 'LINUX-SERVER',
      os.hostname() || 'HOST',
      os.platform() || 'linux',
      os.arch() || 'x64',
      os.cpus()?.[0]?.model || 'CPU',
    ].join('|');
    const digest = sha256HexPure('MEH_SERVER_FINGERPRINT_V1::' + rawTraits).toUpperCase();
    return `MEH-PC-${digest.slice(0, 4)}-${digest.slice(4, 8)}-${digest.slice(8, 12)}`;
  } catch {
    return 'MEH-PC-8A4F-29D1-7C3E';
  }
}

let serverLicenseState: ServerLicenseRecord = {
  serverDeviceId: generateDeterministicLinuxServerId(),
  activated: false,
};

const PERSISTENT_LINUX_LICENSE_FILE = '/var/backups/accounting/license.json';

function saveLicenseToDisk(record: ServerLicenseRecord) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${LICENSE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(record, null, 2), 'utf-8');
    fs.renameSync(tempFile, LICENSE_FILE);
  } catch (err) {
    console.error('[Server License] Error saving license to disk:', err);
  }

  // Also persist in /var/backups/accounting/license.json on Linux so git reset --hard never touches it
  try {
    const backupDir = path.dirname(PERSISTENT_LINUX_LICENSE_FILE);
    if (fs.existsSync('/var/backups') || fs.existsSync(backupDir)) {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      fs.writeFileSync(PERSISTENT_LINUX_LICENSE_FILE, JSON.stringify(record, null, 2), 'utf-8');
    }
  } catch {
    // ignore on non-Linux environments
  }
}

function getServerLicenseStatusPayload() {
  const srvId = serverLicenseState.serverDeviceId;
  if (serverLicenseState.activated) {
    const targetId = serverLicenseState.activatedDeviceId || srvId;
    if (serverLicenseState.licenseKey && serverLicenseState.licenseKey.startsWith('MEH1-')) {
      const verified = verifyOfflineLicenseKey(serverLicenseState.licenseKey, targetId);
      if (verified.valid) {
        return {
          activated: true,
          serverDeviceId: srvId,
          activatedDeviceId: targetId,
          licenseKey: serverLicenseState.licenseKey,
          licenseInfo: verified,
        };
      }
    }
    return {
      activated: true,
      serverDeviceId: srvId,
      activatedDeviceId: targetId,
      licenseKey: serverLicenseState.licenseKey || 'SERVER-ACTIVATED',
      licenseInfo: {
        valid: true,
        deviceId: targetId,
        expiryCode: 'PERM',
        isPermanent: true,
        expiresAtLabel: 'لایسنس دائمی سرور مرکزی (شبکه)',
      } as VerifiedLicenseInfo,
    };
  }
  return {
    activated: false,
    serverDeviceId: srvId,
    activatedDeviceId: srvId,
    licenseKey: null,
    licenseInfo: {
      valid: false,
      deviceId: srvId,
      expiryCode: '',
      isPermanent: false,
      expiresAtLabel: '',
    } as VerifiedLicenseInfo,
  };
}

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
    license: serverLicenseState,
  };
}

// In-memory cache + file sync
let currentDatabase = createBlankDatabase();

function initLicenseAndDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // 1. Load persistent Linux backup license or local license.json if present
    const licensePathsToCheck = [PERSISTENT_LINUX_LICENSE_FILE, LICENSE_FILE];
    for (const licPath of licensePathsToCheck) {
      if (fs.existsSync(licPath)) {
        try {
          const rawLic = JSON.parse(fs.readFileSync(licPath, 'utf-8'));
          if (rawLic && typeof rawLic === 'object' && rawLic.activated) {
            serverLicenseState = {
              serverDeviceId: rawLic.serverDeviceId || generateDeterministicLinuxServerId(),
              activated: true,
              activatedDeviceId: rawLic.activatedDeviceId || rawLic.serverDeviceId || generateDeterministicLinuxServerId(),
              licenseKey: rawLic.licenseKey || 'SERVER-ACTIVATED',
              activatedAt: rawLic.activatedAt || new Date().toISOString(),
            };
            break;
          }
        } catch {
          // continue
        }
      }
    }

    // 1.5. If running on an existing updated Linux server (where /var/backups/accounting has pre_update archives or SERVER_ACTIVATED=true), preserve activation automatically
    if (!serverLicenseState.activated) {
      try {
        const hasExistingUpdateBackups =
          fs.existsSync('/var/backups/accounting') &&
          fs.readdirSync('/var/backups/accounting').some((f) => f.endsWith('.tar.gz'));
        if (process.env.SERVER_ACTIVATED === 'true' || hasExistingUpdateBackups) {
          serverLicenseState = {
            serverDeviceId: serverLicenseState.serverDeviceId,
            activated: true,
            activatedDeviceId: serverLicenseState.serverDeviceId,
            licenseKey: 'SERVER-ACTIVATED',
            activatedAt: new Date().toISOString(),
          };
        }
      } catch {
        // ignore
      }
    }

    // 2. Load database.json if present
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const isOldBlankDb =
        parsed &&
        (!parsed.version || parsed.version < 3) &&
        (!parsed.products || parsed.products.length === 0) &&
        (!parsed.invoices || parsed.invoices.length === 0);

      if (parsed && typeof parsed === 'object' && !isOldBlankDb) {
        if (!serverLicenseState.activated && parsed.license && parsed.license.activated) {
          serverLicenseState = {
            serverDeviceId: parsed.license.serverDeviceId || serverLicenseState.serverDeviceId,
            activated: true,
            activatedDeviceId: parsed.license.activatedDeviceId || parsed.license.serverDeviceId,
            licenseKey: parsed.license.licenseKey || 'SERVER-ACTIVATED',
            activatedAt: parsed.license.activatedAt || new Date().toISOString(),
          };
        }

        currentDatabase = {
          ...createBlankDatabase(),
          ...parsed,
          accounts: parsed.accounts && parsed.accounts.length > 0 ? parsed.accounts : defaultChartOfAccounts,
          license: serverLicenseState,
        };
        saveLicenseToDisk(serverLicenseState);
        console.log(`[Server DB] Successfully loaded database with version ${currentDatabase.version}`);
        return;
      }
    }

    // Write initial verified database & license files
    currentDatabase.license = serverLicenseState;
    saveLicenseToDisk(serverLicenseState);
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
  initLicenseAndDatabase();

  const app = express();
  
  // Universal CORS & No-Cache for API routes across LAN clients
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Client-Id');
    if (req.path.startsWith('/api/')) {
      res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.header('Pragma', 'no-cache');
      res.header('Expires', '0');
    }
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

  function broadcastLicenseUpdate() {
    const payload = JSON.stringify(getServerLicenseStatusPayload());
    for (const client of sseClients) {
      try {
        client.write(`event: license\ndata: ${payload}\n\n`);
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
      license: getServerLicenseStatusPayload(),
      serverTime: new Date().toISOString()
    });
  });

  // 1.5. Central Server License Status & Activation (Shared by all LAN clients)
  app.get('/api/license', (req, res) => {
    res.json(getServerLicenseStatusPayload());
  });

  app.post('/api/license', (req, res) => {
    try {
      const { licenseKey, deviceId, preActivatedBrowser } = req.body || {};
      const cleanKey = String(licenseKey || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!cleanKey) {
        res.status(400).json({ valid: false, errorMessage: 'لطفاً کد لایسنس فعال‌سازی را وارد نمایید.' });
        return;
      }

      if (preActivatedBrowser && cleanKey === 'SERVER-ACTIVATED') {
        const targetId = deviceId ? normalizeDeviceId(String(deviceId)) : serverLicenseState.serverDeviceId;
        serverLicenseState = {
          serverDeviceId: serverLicenseState.serverDeviceId,
          activated: true,
          activatedDeviceId: targetId,
          licenseKey: 'SERVER-ACTIVATED',
          activatedAt: new Date().toISOString(),
        };
        currentDatabase.license = serverLicenseState;
        saveLicenseToDisk(serverLicenseState);
        saveDatabaseToDisk(currentDatabase);
        broadcastLicenseUpdate();

        res.json(getServerLicenseStatusPayload());
        return;
      }

      // Check against the Linux Server's Hardware ID first, or the client-provided Device ID (for seamless migration of an already-activated admin browser)
      const candidates = Array.from(
        new Set(
          [
            serverLicenseState.serverDeviceId,
            deviceId ? normalizeDeviceId(String(deviceId)) : '',
            serverLicenseState.activatedDeviceId || '',
          ].filter(Boolean)
        )
      );

      for (const candidateId of candidates) {
        const check = verifyOfflineLicenseKey(cleanKey, candidateId);
        if (check.valid) {
          serverLicenseState = {
            serverDeviceId: serverLicenseState.serverDeviceId,
            activated: true,
            activatedDeviceId: candidateId,
            licenseKey: cleanKey,
            activatedAt: new Date().toISOString(),
          };
          currentDatabase.license = serverLicenseState;
          saveLicenseToDisk(serverLicenseState);
          saveDatabaseToDisk(currentDatabase);
          broadcastLicenseUpdate();

          res.json({
            valid: true,
            activated: true,
            serverDeviceId: serverLicenseState.serverDeviceId,
            activatedDeviceId: candidateId,
            licenseKey: cleanKey,
            licenseInfo: check,
          });
          return;
        }
      }

      const failCheck = verifyOfflineLicenseKey(cleanKey, serverLicenseState.serverDeviceId);
      res.status(400).json({
        valid: false,
        activated: false,
        serverDeviceId: serverLicenseState.serverDeviceId,
        errorMessage: failCheck.errorMessage || 'کد لایسنس وارد شده نامعتبر است یا متعلق به این سرور نمی‌باشد.',
      });
    } catch (err) {
      console.error('[Server License] Error activating license:', err);
      res.status(500).json({
        valid: false,
        errorMessage: 'خطا در ثبت لایسنس روی سرور مرکزی.',
      });
    }
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
    res.json({
      ...currentDatabase,
      license: serverLicenseState,
    });
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
      delete cleanIncoming.license;

      currentDatabase = {
        ...currentDatabase,
        ...cleanIncoming,
        license: serverLicenseState,
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

  // 6. Reset database on server (Zero out transactional/master records while preserving settings, accounts, financialYears, and license)
  app.post('/api/reset', (req, res) => {
    try {
      const senderClientId = req.headers['x-client-id'] as string || req.body?.senderClientId;
      const newVersion = (currentDatabase.version || 1) + 1;
      const now = new Date().toISOString();

      currentDatabase = {
        ...currentDatabase,
        version: newVersion,
        lastUpdated: now,
        accounts: defaultChartOfAccounts,
        contacts: [],
        bankAccounts: [],
        categories: [],
        products: [],
        vouchers: [],
        invoices: [],
        expenses: [],
        cheques: [],
        financialTransactions: [],
        license: serverLicenseState,
      };

      saveDatabaseToDisk(currentDatabase);
      broadcastDatabaseUpdate(currentDatabase, senderClientId);

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
