import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const HOST = '0.0.0.0';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Default initial database schema with standard chart of accounts
const defaultChartOfAccounts = [
  // 1. دارایی‌های جاری
  { id: 'acc-1', code: '1', title: 'دارایی‌های جاری', level: 'group', nature: 'debit', isSystem: true },
  { id: 'acc-101', code: '101', parentCode: '1', title: 'موجودی نقد و بانک', level: 'kol', nature: 'debit', isSystem: true },
  { id: 'acc-10101', code: '10101', parentCode: '101', title: 'صندوق‌ها', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-10102', code: '10102', parentCode: '101', title: 'حساب‌های بانکی ریالی', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-10103', code: '10103', parentCode: '101', title: 'تنخواه‌گردان‌ها', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-10104', code: '10104', parentCode: '101', title: 'دستگاه‌های کارتخوان (POS)', level: 'moein', nature: 'debit', isSystem: true },
  
  { id: 'acc-102', code: '102', parentCode: '1', title: 'اسناد دریافتنی تجاری', level: 'kol', nature: 'debit', isSystem: true },
  { id: 'acc-10201', code: '10201', parentCode: '102', title: 'چک‌های دریافتی نزد صندوق', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-10202', code: '10202', parentCode: '102', title: 'اسناد در جریان وصول', level: 'moein', nature: 'debit', isSystem: true },

  { id: 'acc-103', code: '103', parentCode: '1', title: 'حساب‌های دریافتنی تجاری (بدهکاران)', level: 'kol', nature: 'debit', isSystem: true },
  { id: 'acc-10301', code: '10301', parentCode: '103', title: 'مشتریان تجاری داخلی', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-10302', code: '10302', parentCode: '103', title: 'سایر حساب‌های دریافتنی', level: 'moein', nature: 'debit', isSystem: true },

  { id: 'acc-104', code: '104', parentCode: '1', title: 'موجودی مواد و کالا', level: 'kol', nature: 'debit', isSystem: true },
  { id: 'acc-10401', code: '10401', parentCode: '104', title: 'موجودی کالای انبار مرکزی', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-10402', code: '10402', parentCode: '104', title: 'کالای در راه', level: 'moein', nature: 'debit', isSystem: true },

  { id: 'acc-105', code: '105', parentCode: '1', title: 'پیش‌پرداخت‌ها و علی‌الحساب‌ها', level: 'kol', nature: 'debit', isSystem: true },
  { id: 'acc-10501', code: '10501', parentCode: '105', title: 'پیش‌پرداخت خرید کالا و خدمات', level: 'moein', nature: 'debit', isSystem: true },

  // 2. دارایی‌های غیرجاری
  { id: 'acc-2', code: '2', title: 'دارایی‌های غیرجاری', level: 'group', nature: 'debit', isSystem: true },
  { id: 'acc-201', code: '201', parentCode: '2', title: 'دارایی‌های ثابت مشهود', level: 'kol', nature: 'debit', isSystem: true },
  { id: 'acc-20101', code: '20101', parentCode: '201', title: 'اثاثه و منصوبات اداری', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-20102', code: '20102', parentCode: '201', title: 'وسایط نقلیه', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-20103', code: '20103', parentCode: '201', title: 'رایانه و تجهیزات الکترونیکی', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-202', code: '202', parentCode: '2', title: 'استهلاک انباشته دارایی‌های ثابت', level: 'kol', nature: 'credit', isSystem: true },
  { id: 'acc-20201', code: '20201', parentCode: '202', title: 'استهلاک انباشته اموال و تجهیزات', level: 'moein', nature: 'credit', isSystem: true },

  // 3. بدهی‌های جاری
  { id: 'acc-3', code: '3', title: 'بدهی‌های جاری', level: 'group', nature: 'credit', isSystem: true },
  { id: 'acc-301', code: '301', parentCode: '3', title: 'حساب‌های پرداختنی تجاری (بستانکاران)', level: 'kol', nature: 'credit', isSystem: true },
  { id: 'acc-30101', code: '30101', parentCode: '301', title: 'تامین‌کنندگان کالا و خدمات', level: 'moein', nature: 'credit', isSystem: true },
  
  { id: 'acc-302', code: '302', parentCode: '3', title: 'اسناد پرداختنی تجاری', level: 'kol', nature: 'credit', isSystem: true },
  { id: 'acc-30201', code: '30201', parentCode: '302', title: 'چک‌های پرداختنی عهده بانک‌ها', level: 'moein', nature: 'credit', isSystem: true },

  { id: 'acc-303', code: '303', parentCode: '3', title: 'سایر بدهی‌ها و ذخایر', level: 'kol', nature: 'credit', isSystem: true },
  { id: 'acc-30301', code: '30301', parentCode: '303', title: 'مالیات و عوارض بر ارزش افزوده پرداختنی', level: 'moein', nature: 'credit', isSystem: true },
  { id: 'acc-30302', code: '30302', parentCode: '303', title: 'حقوق و دستمزد پرداختنی', level: 'moein', nature: 'credit', isSystem: true },
  { id: 'acc-30303', code: '30303', parentCode: '303', title: 'بیمه پرداختنی', level: 'moein', nature: 'credit', isSystem: true },

  // 4. حقوق صاحبان سهام و سرمایه
  { id: 'acc-4', code: '4', title: 'حقوق مالکانه و سرمایه', level: 'group', nature: 'credit', isSystem: true },
  { id: 'acc-401', code: '401', parentCode: '4', title: 'سرمایه اولیه و ثبت شده', level: 'kol', nature: 'credit', isSystem: true },
  { id: 'acc-40101', code: '40101', parentCode: '401', title: 'سرمایه شرکا و موسسین', level: 'moein', nature: 'credit', isSystem: true },
  { id: 'acc-402', code: '402', parentCode: '4', title: 'سود و زیان انباشته', level: 'kol', nature: 'credit', isSystem: true },
  { id: 'acc-40201', code: '40201', parentCode: '402', title: 'سود/زیان انباشته سنواتی', level: 'moein', nature: 'credit', isSystem: true },
  { id: 'acc-403', code: '403', parentCode: '4', title: 'جاری شرکا و سهامداران', level: 'kol', nature: 'both', isSystem: true },
  { id: 'acc-40301', code: '40301', parentCode: '403', title: 'حساب جاری شرکا', level: 'moein', nature: 'both', isSystem: true },
  { id: 'acc-40302', code: '40302', parentCode: '403', title: 'برداشت‌های جاری شرکا', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-40303', code: '40303', parentCode: '403', title: 'واریز و آورده شرکا', level: 'moein', nature: 'credit', isSystem: true },

  // 5. درآمدها و فروش
  { id: 'acc-5', code: '5', title: 'درآمدها', level: 'group', nature: 'credit', isSystem: true },
  { id: 'acc-501', code: '501', parentCode: '5', title: 'فروش ناخالص کالا و خدمات', level: 'kol', nature: 'credit', isSystem: true },
  { id: 'acc-50101', code: '50101', parentCode: '501', title: 'فروش کالای بازرگانی', level: 'moein', nature: 'credit', isSystem: true },
  { id: 'acc-50102', code: '50102', parentCode: '501', title: 'ارائه خدمات فنی و اجرایی', level: 'moein', nature: 'credit', isSystem: true },
  { id: 'acc-502', code: '502', parentCode: '5', title: 'برگشت از فروش و تخفیفات', level: 'kol', nature: 'debit', isSystem: true },
  { id: 'acc-50201', code: '50201', parentCode: '502', title: 'برگشت از فروش کالا', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-50202', code: '50202', parentCode: '502', title: 'تخفیفات نقدی اعطایی فروش', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-503', code: '503', parentCode: '5', title: 'سایر درآمدهای غیرعملیاتی', level: 'kol', nature: 'credit', isSystem: true },
  { id: 'acc-50301', code: '50301', parentCode: '503', title: 'سود سپرده‌های بانکی', level: 'moein', nature: 'credit', isSystem: true },

  // 6. بهای تمام شده کالای فروش رفته و خرید
  { id: 'acc-6', code: '6', title: 'بهای تمام شده', level: 'group', nature: 'debit', isSystem: true },
  { id: 'acc-601', code: '601', parentCode: '6', title: 'بهای تمام شده کالای فروش رفته', level: 'kol', nature: 'debit', isSystem: true },
  { id: 'acc-60101', code: '60101', parentCode: '601', title: 'بهای تمام شده کالای فروش رفته', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-602', code: '602', parentCode: '6', title: 'خرید کالا و ملزومات', level: 'kol', nature: 'debit', isSystem: true },
  { id: 'acc-60201', code: '60201', parentCode: '602', title: 'خرید کالای بازرگانی', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-603', code: '603', parentCode: '6', title: 'برگشت از خرید و تخفیفات', level: 'kol', nature: 'credit', isSystem: true },
  { id: 'acc-60301', code: '60301', parentCode: '603', title: 'برگشت از خرید کالا', level: 'moein', nature: 'credit', isSystem: true },
  { id: 'acc-60302', code: '60302', parentCode: '603', title: 'تخفیفات نقدی کسب شده خرید', level: 'moein', nature: 'credit', isSystem: true },

  // 7. هزینه‌های اداری، عمومی و توزیع و فروش
  { id: 'acc-7', code: '7', title: 'هزینه‌ها', level: 'group', nature: 'debit', isSystem: true },
  { id: 'acc-701', code: '701', parentCode: '7', title: 'هزینه‌های حقوق و دستمزد پرسنل', level: 'kol', nature: 'debit', isSystem: true },
  { id: 'acc-70101', code: '70101', parentCode: '701', title: 'حقوق و مزایای کارکنان', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-70102', code: '70102', parentCode: '701', title: 'حق بیمه سهم کارفرما', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-70103', code: '70103', parentCode: '701', title: 'پاداش، عیدی و سنوات', level: 'moein', nature: 'debit', isSystem: true },

  { id: 'acc-702', code: '702', parentCode: '7', title: 'هزینه‌های عمومی و اداری', level: 'kol', nature: 'debit', isSystem: true },
  { id: 'acc-70201', code: '70201', parentCode: '702', title: 'هزینه اجاره دفتر و انبار', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-70202', code: '70202', parentCode: '702', title: 'هزینه آب، برق، گاز و تلفن و اینترنت', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-70203', code: '70203', parentCode: '702', title: 'هزینه ملزومات اداری و مصرفی', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-70204', code: '70204', parentCode: '702', title: 'هزینه پذیرایی، آبدارخانه و جلسات', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-70205', code: '70205', parentCode: '702', title: 'هزینه تعمیرات و نگهداری تجهیزات', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-70206', code: '70206', parentCode: '702', title: 'هزینه ایاب و ذهاب و سفر', level: 'moein', nature: 'debit', isSystem: true },

  { id: 'acc-703', code: '703', parentCode: '7', title: 'هزینه‌های بازاریابی و فروش', level: 'kol', nature: 'debit', isSystem: true },
  { id: 'acc-70301', code: '70301', parentCode: '703', title: 'هزینه تبلیغات و بازاریابی دیجیتال', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-70302', code: '70302', parentCode: '703', title: 'هزینه حمل و نقل، ارسال و پیک', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-70303', code: '70303', parentCode: '703', title: 'پورسانت و کارمزد فروش', level: 'moein', nature: 'debit', isSystem: true },

  { id: 'acc-704', code: '704', parentCode: '7', title: 'هزینه‌های مالی و کارمزد بانکی', level: 'kol', nature: 'debit', isSystem: true },
  { id: 'acc-70401', code: '70401', parentCode: '704', title: 'کارمزد خدمات بانکی و دستگاه پوز', level: 'moein', nature: 'debit', isSystem: true },
  { id: 'acc-70402', code: '70402', parentCode: '704', title: 'هزینه بهره و تسهیلات مالی', level: 'moein', nature: 'debit', isSystem: true },

  // 8. حساب‌های بستن و انتظامی (استاندارد بستن سال مالی)
  { id: 'acc-8', code: '8', title: 'حساب‌های بستن و انتظامی', level: 'group', nature: 'both', isSystem: true },
  { id: 'acc-801', code: '801', parentCode: '8', title: 'خلاصه سود و زیان عملکرد سال', level: 'kol', nature: 'both', isSystem: true },
  { id: 'acc-80101', code: '80101', parentCode: '801', title: 'خلاصه سود و زیان (بستن حساب‌های موقت)', level: 'moein', nature: 'both', isSystem: true },
  { id: 'acc-802', code: '802', parentCode: '8', title: 'تراز اختتامیه و افتتاحیه', level: 'kol', nature: 'both', isSystem: true },
  { id: 'acc-80201', code: '80201', parentCode: '802', title: 'تراز اختتامیه / افتتاحیه انتقالی', level: 'moein', nature: 'both', isSystem: true },
];

function createBlankDatabase() {
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    settings: {
      companyName: 'حسابداری مه',
      financialYear: '',
      tagline: 'سامانه یکپارچه و استاندارد مالی و بازرگانی',
      economicCode: '',
      nationalCode: '',
      registrationNumber: '',
      phone: '',
      mobile: '',
      address: '',
      postalCode: '',
      currency: 'تومان',
      enableTax: true,
      taxRate: 10,
      defaultTaxRate: 10,
      invoiceHeaderNote: 'فروش کالا و ارائه خدمات با رعایت کلیه استانداردهای مالی',
      invoiceFooterNote: 'از اعتماد و همکاری شما سپاسگزاریم.',
      autoGenerateVouchers: true,
      autoBackupOnClose: true,
      botBackup: {
        enabled: false,
        intervalHours: 6,
        telegramEnabled: false,
        telegramBotToken: '',
        telegramAdminChatIds: '',
        baleEnabled: false,
        baleBotToken: '',
        baleAdminChatIds: '',
      },
    },
    financialYears: [],
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
    backups: []
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
      if (parsed && typeof parsed === 'object') {
        currentDatabase = {
          ...createBlankDatabase(),
          ...parsed,
          accounts: parsed.accounts && parsed.accounts.length > 0 ? parsed.accounts : defaultChartOfAccounts
        };
        console.log(`[Server DB] Successfully loaded database with version ${currentDatabase.version}`);
        return;
      }
    }

    // Write initial database file
    saveDatabaseToDisk(currentDatabase);
    console.log(`[Server DB] Created initial blank database file on server.`);
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
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Endpoints
  // 1. Health check & Server Status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      version: currentDatabase.version,
      lastUpdated: currentDatabase.lastUpdated,
      financialYear: currentDatabase.settings.financialYear || null,
      serverTime: new Date().toISOString()
    });
  });

  // 2. Get current version for polling
  app.get('/api/version', (req, res) => {
    res.json({
      version: currentDatabase.version || 1,
      lastUpdated: currentDatabase.lastUpdated
    });
  });

  // 3. Get entire unified server database
  app.get('/api/data', (req, res) => {
    res.json(currentDatabase);
  });

  // 4. Update entire or partial database
  app.post('/api/data', (req, res) => {
    try {
      const incoming = req.body;
      if (!incoming || typeof incoming !== 'object') {
        res.status(400).json({ error: 'Invalid payload' });
        return;
      }

      const newVersion = (currentDatabase.version || 1) + 1;
      const now = new Date().toISOString();

      currentDatabase = {
        ...currentDatabase,
        ...incoming,
        version: newVersion,
        lastUpdated: now
      };

      saveDatabaseToDisk(currentDatabase);

      res.json({
        success: true,
        version: newVersion,
        lastUpdated: now,
        message: 'Database saved to server successfully.'
      });
    } catch (err) {
      console.error('[Server DB] Error updating database:', err);
      res.status(500).json({ error: 'Failed to update server database' });
    }
  });

  // 5. Reset database on server
  app.post('/api/reset', (req, res) => {
    try {
      const blank = createBlankDatabase();
      blank.version = (currentDatabase.version || 1) + 1;
      blank.lastUpdated = new Date().toISOString();

      currentDatabase = blank;
      saveDatabaseToDisk(currentDatabase);

      res.json({
        success: true,
        version: currentDatabase.version,
        data: currentDatabase
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to reset server database' });
    }
  });

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
