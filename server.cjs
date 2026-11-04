const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Universal CORS & No-Cache for API routes across LAN/Mobile clients
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

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const LICENSE_FILE = path.join(DATA_DIR, 'license.json');
const PERSISTENT_LINUX_LICENSE_FILE = '/var/backups/accounting/license.json';

const P = BigInt('0xe147e4d0a7c0b9ce2ea9eb836247d8c25814009762e2501e2f27b4566ccb876f');
const Q = BigInt('0x70a3f26853e05ce71754f5c1b123ec612c0a004bb171280f1793da2b3665c3b7');
const G = 4n;
const Y = BigInt('0x2910df692ffd5dcd33b2ee9fe8cb3c2de4681db71803595241cd1e3ed6d1c962');

function sha256HexNode(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function modPow(base, exp, mod) {
  let res = 1n;
  let b = ((base % mod) + mod) % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) res = (res * b) % mod;
    e >>= 1n;
    b = (b * b) % mod;
  }
  return res;
}

function normalizeDeviceId(deviceId) {
  return String(deviceId || '').trim().toUpperCase().replace(/\s+/g, '');
}

function generateDeterministicServerId() {
  try {
    let machineId = '';
    if (fs.existsSync('/etc/machine-id')) {
      machineId = fs.readFileSync('/etc/machine-id', 'utf-8').trim();
    } else if (fs.existsSync('/var/lib/dbus/machine-id')) {
      machineId = fs.readFileSync('/var/lib/dbus/machine-id', 'utf-8').trim();
    }
    const rawTraits = [
      machineId || 'SERVER',
      os.hostname() || 'HOST',
      os.platform() || 'linux',
      os.arch() || 'x64',
      (os.cpus() && os.cpus()[0] && os.cpus()[0].model) || 'CPU',
    ].join('|');
    const digest = sha256HexNode('MEH_SERVER_FINGERPRINT_V1::' + rawTraits).toUpperCase();
    return `MEH-PC-${digest.slice(0, 4)}-${digest.slice(4, 8)}-${digest.slice(8, 12)}`;
  } catch {
    return 'MEH-PC-8A4F-29D1-7C3E';
  }
}

function verifyOfflineLicenseKeyServer(rawLicenseKey, currentDeviceId) {
  const deviceId = normalizeDeviceId(currentDeviceId || generateDeterministicServerId());
  const cleanKey = String(rawLicenseKey || '').trim().toUpperCase().replace(/\s+/g, '');

  if (!cleanKey.startsWith('MEH1-')) {
    return {
      valid: false,
      deviceId,
      expiryCode: '',
      isPermanent: false,
      expiresAtLabel: '',
      errorMessage: 'فرمت کد فعال‌سازی نامعتبر است (باید با MEH1- شروع شود).',
    };
  }

  const parts = cleanKey.split('-');
  if (parts.length !== 4) {
    return {
      valid: false,
      deviceId,
      expiryCode: '',
      isPermanent: false,
      expiresAtLabel: '',
      errorMessage: 'ساختار کد لایسنس ناقص است.',
    };
  }

  const [, expiryCode, eHexLower, sHexLower] = parts;
  const eHex = eHexLower.toLowerCase();
  const sHex = sHexLower.toLowerCase();

  if (!/^[0-9a-f]{24}$/.test(eHex) || !/^[0-9a-f]{1,64}$/.test(sHex)) {
    return {
      valid: false,
      deviceId,
      expiryCode,
      isPermanent: false,
      expiresAtLabel: '',
      errorMessage: 'امضای دیجیتال کد لایسنس معتبر نیست.',
    };
  }

  try {
    const e = BigInt('0x' + eHex);
    const s = BigInt('0x' + sHex);
    if (e <= 0n || e >= Q || s <= 0n || s >= Q) {
      return {
        valid: false,
        deviceId,
        expiryCode,
        isPermanent: false,
        expiresAtLabel: '',
        errorMessage: 'مقادیر امضای رمزنگاری خارج از دامنه مجاز است.',
      };
    }

    const msg = `${deviceId}|${expiryCode}`;
    const gs = modPow(G, s, P);
    const ye = modPow(Y, e, P);
    const Rv = (gs * ye) % P;
    const evHex = sha256HexNode(`${Rv.toString(16)}|${Y.toString(16)}|${msg}`).slice(0, 24);

    if (evHex.toLowerCase() !== eHex.toLowerCase()) {
      return {
        valid: false,
        deviceId,
        expiryCode,
        isPermanent: false,
        expiresAtLabel: '',
        errorMessage: 'کد فعال‌سازی نامعتبر است یا متعلق به سرور دیگری می‌باشد.',
      };
    }

    if (expiryCode !== 'PERM') {
      if (!/^\d{8}$/.test(expiryCode)) {
        return {
          valid: false,
          deviceId,
          expiryCode,
          isPermanent: false,
          expiresAtLabel: '',
          errorMessage: 'کد تاریخ انقضای لایسنس نامعتبر است.',
        };
      }
      const year = parseInt(expiryCode.slice(0, 4), 10);
      const month = parseInt(expiryCode.slice(4, 6), 10);
      const day = parseInt(expiryCode.slice(6, 8), 10);
      const expDate = new Date(year, month - 1, day, 23, 59, 59);
      if (Date.now() > expDate.getTime()) {
        return {
          valid: false,
          deviceId,
          expiryCode,
          isPermanent: false,
          expiresAtLabel: expDate.toLocaleDateString('fa-IR'),
          errorMessage: `مهلت اعتبار این لایسنس در تاریخ ${expDate.toLocaleDateString('fa-IR')} به پایان رسیده است.`,
        };
      }
      return {
        valid: true,
        deviceId,
        expiryCode,
        isPermanent: false,
        expiresAtLabel: `معتبر تا ${expDate.toLocaleDateString('fa-IR')}`,
      };
    }

    return {
      valid: true,
      deviceId,
      expiryCode: 'PERM',
      isPermanent: true,
      expiresAtLabel: 'لایسنس دائمی (مادام‌العمر)',
    };
  } catch {
    return {
      valid: false,
      deviceId,
      expiryCode: '',
      isPermanent: false,
      expiresAtLabel: '',
      errorMessage: 'خطا در بررسی امضای دیجیتال لایسنس.',
    };
  }
}

let serverLicenseState = {
  serverDeviceId: generateDeterministicServerId(),
  activated: false,
  activatedDeviceId: '',
  licenseKey: '',
  activatedAt: '',
};

function saveLicenseToDisk(record) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = LICENSE_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(record, null, 2), 'utf-8');
    fs.renameSync(tempFile, LICENSE_FILE);
  } catch (err) {
    console.error('[Server License] Error saving license to disk:', err);
  }

  try {
    const backupDir = path.dirname(PERSISTENT_LINUX_LICENSE_FILE);
    if (fs.existsSync('/var/backups') || fs.existsSync(backupDir)) {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      fs.writeFileSync(PERSISTENT_LINUX_LICENSE_FILE, JSON.stringify(record, null, 2), 'utf-8');
    }
  } catch {
    // ignore
  }
}

function getServerLicenseStatusPayload() {
  const srvId = serverLicenseState.serverDeviceId;
  if (serverLicenseState.activated) {
    const targetId = serverLicenseState.activatedDeviceId || srvId;
    if (serverLicenseState.licenseKey && serverLicenseState.licenseKey.startsWith('MEH1-')) {
      const verified = verifyOfflineLicenseKeyServer(serverLicenseState.licenseKey, targetId);
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
      },
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
    },
  };
}

function createBlankDatabase() {
  return {
    version: 3,
    lastUpdated: new Date().toISOString(),
    settings: {
      companyName: 'حسابداری مَه',
      currency: 'تومان',
      taxRate: 10,
      financialYear: '1404',
    },
    accounts: [],
    contacts: [],
    bankAccounts: [],
    categories: [],
    products: [],
    invoices: [],
    vouchers: [],
    expenses: [],
    financialYears: [
      {
        year: '1404',
        title: 'سال مالی ۱۴۰۴',
        startDate: '1404/01/01',
        endDate: '1404/12/29',
        isClosed: false,
      },
    ],
    cheques: [],
    financialTransactions: [],
    backups: [],
    license: serverLicenseState,
  };
}

let currentDatabase = null;

function initDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const licensePathsToCheck = [PERSISTENT_LINUX_LICENSE_FILE, LICENSE_FILE];
    for (const licPath of licensePathsToCheck) {
      if (fs.existsSync(licPath)) {
        try {
          const rawLic = JSON.parse(fs.readFileSync(licPath, 'utf-8'));
          if (rawLic && typeof rawLic === 'object' && rawLic.activated) {
            serverLicenseState = {
              serverDeviceId: rawLic.serverDeviceId || generateDeterministicServerId(),
              activated: true,
              activatedDeviceId: rawLic.activatedDeviceId || rawLic.serverDeviceId || generateDeterministicServerId(),
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

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      currentDatabase = JSON.parse(raw);
      if (!serverLicenseState.activated && currentDatabase.license && currentDatabase.license.activated) {
        serverLicenseState = {
          serverDeviceId: currentDatabase.license.serverDeviceId || serverLicenseState.serverDeviceId,
          activated: true,
          activatedDeviceId: currentDatabase.license.activatedDeviceId || serverLicenseState.serverDeviceId,
          licenseKey: currentDatabase.license.licenseKey || 'SERVER-ACTIVATED',
          activatedAt: currentDatabase.license.activatedAt || new Date().toISOString(),
        };
      }
      currentDatabase.license = serverLicenseState;
      saveLicenseToDisk(serverLicenseState);
      console.log(`[Server DB] Loaded existing database with version ${currentDatabase.version || 1}`);
    } else {
      currentDatabase = createBlankDatabase();
      saveLicenseToDisk(serverLicenseState);
      fs.writeFileSync(DB_FILE, JSON.stringify(currentDatabase, null, 2), 'utf-8');
      console.log(`[Server DB] Created fresh new database file at ${DB_FILE}`);
    }
  } catch (err) {
    console.error('[Server DB] Error initializing database:', err);
    currentDatabase = createBlankDatabase();
  }
}

function saveDatabaseToDisk(db) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[Server DB] Failed to save database to disk:', err);
  }
}

initDatabase();

// SSE Clients for Live Broadcast
const sseClients = new Set();

function broadcastDatabaseUpdate(updatedDb, senderClientId) {
  const payload = JSON.stringify({
    type: 'sync',
    version: updatedDb.version,
    senderClientId: senderClientId || null,
    data: updatedDb
  });

  for (const client of sseClients) {
    try {
      client.write(`event: sync\ndata: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

function broadcastLicenseUpdate() {
  const payload = JSON.stringify(getServerLicenseStatusPayload());
  for (const client of sseClients) {
    try {
      client.write(`event: license\ndata: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: currentDatabase?.version || 1,
    lastUpdated: currentDatabase?.lastUpdated || null,
    connectedClients: sseClients.size,
    license: getServerLicenseStatusPayload(),
    serverTime: new Date().toISOString()
  });
});

// 1.5. Central Server License Status & Activation
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
      const check = verifyOfflineLicenseKeyServer(cleanKey, candidateId);
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

    const failCheck = verifyOfflineLicenseKeyServer(cleanKey, serverLicenseState.serverDeviceId);
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

// 2. Real-time Live Events (SSE)
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', version: currentDatabase?.version || 1 })}\n\n`);
  sseClients.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
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

// 3. Get Version
app.get('/api/version', (req, res) => {
  res.json({
    version: currentDatabase?.version || 1,
    lastUpdated: currentDatabase?.lastUpdated || null
  });
});

// 4. Get Data
app.get('/api/data', (req, res) => {
  res.json({
    ...(currentDatabase || createBlankDatabase()),
    license: serverLicenseState,
  });
});

// 5. Update Data
app.post('/api/data', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object') {
      res.status(400).json({ error: 'Invalid data payload' });
      return;
    }

    const senderClientId = req.headers['x-client-id'] || incoming.senderClientId;
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
    broadcastDatabaseUpdate(currentDatabase, senderClientId);

    res.json({
      success: true,
      version: newVersion,
      lastUpdated: now
    });
  } catch (err) {
    console.error('[Server DB] Error updating database:', err);
    res.status(500).json({ error: 'Failed to update server database' });
  }
});

// 6. Reset Data
app.post('/api/reset', (req, res) => {
  try {
    const senderClientId = req.headers['x-client-id'] || req.body?.senderClientId;
    const newVersion = (currentDatabase.version || 1) + 1;
    const now = new Date().toISOString();

    currentDatabase = {
      ...currentDatabase,
      version: newVersion,
      lastUpdated: now,
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

// Determine dist directory for static frontend
let distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  distPath = path.join(process.cwd(), 'dist');
}
if (!fs.existsSync(distPath)) {
  distPath = path.join(path.dirname(process.execPath), 'dist');
}

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Single Page Application (SPA) fallback
app.get('*', (req, res) => {
  const indexHtml = path.join(distPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.send(`
      <html dir="rtl">
        <head><meta charset="utf-8"><title>سرور حسابداری مَه</title></head>
        <body style="font-family: Tahoma, sans-serif; text-align: center; padding: 50px; background: #0f172a; color: #fff;">
          <h2>سرور پایگاه‌داده حسابداری مَه با موفقیت در حال اجرا است</h2>
          <p>پورت: ${PORT}</p>
        </body>
      </html>
    `);
  }
});

app.listen(Number(PORT), HOST, () => {
  console.log(`====================================================`);
  console.log(`  Persian Accounting Central Database Server Running `);
  console.log(`  Listening on: http://${HOST}:${PORT} `);
  console.log(`  Database File: ${DB_FILE} `);
  console.log(`====================================================`);
});
