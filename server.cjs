const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Determine the dist folder location (works for both standalone .exe and standard node.js)
let distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  distPath = path.join(process.cwd(), 'dist');
}
if (!fs.existsSync(distPath)) {
  distPath = path.join(path.dirname(process.execPath), 'dist');
}

// Serve static files from Vite build output
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else {
  console.warn(`[WARNING] Dist directory not found at: ${distPath}. Run "npm run build" first.`);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    server: 'Hesabdari Meh Dedicated Windows Server',
    timestamp: new Date().toISOString() 
  });
});

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
          <h2>سرور حسابداری مَه با موفقیت در حال اجرا است</h2>
          <p>پورت: ${PORT}</p>
          <p style="color: #94a3b8;">برای مشاهده رابط کاربری، ابتدا دستور <code>npm run build</code> را اجرا فرمایید.</p>
        </body>
      </html>
    `);
  }
});

app.listen(Number(PORT), HOST, () => {
  console.log(`====================================================`);
  console.log(`  Persian Accounting Dedicated Windows Server  `);
  console.log(`  Listening on: http://${HOST}:${PORT} `);
  console.log(`  Local Access: http://localhost:${PORT} `);
  console.log(`====================================================`);
});
