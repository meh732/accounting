const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Universal CORS
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

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

function createBlankDatabase() {
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    settings: {
      companyName: 'شرکت بازرگانی مَه',
      currency: 'ریال',
      taxRate: 10,
      financialYear: '1405'
    },
    accounts: [],
    contacts: [],
    bankAccounts: [],
    categories: [],
    products: [],
    invoices: [],
    vouchers: [],
    expenses: [],
    financialYears: [],
    cheques: [],
    financialTransactions: [],
    backups: []
  };
}

let currentDatabase = null;

function initDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      currentDatabase = JSON.parse(raw);
      console.log(`[Server DB] Loaded existing database with version ${currentDatabase.version || 1}`);
    } else {
      currentDatabase = createBlankDatabase();
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

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: currentDatabase?.version || 1,
    lastUpdated: currentDatabase?.lastUpdated || null,
    connectedClients: sseClients.size,
    serverTime: new Date().toISOString()
  });
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
  res.json(currentDatabase || createBlankDatabase());
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

    currentDatabase = {
      ...currentDatabase,
      ...cleanIncoming,
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
