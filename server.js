import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const distPath = path.join(__dirname, 'dist');

// Serve static files from Vite build output
app.use(express.static(distPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Single Page Application (SPA) fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(Number(PORT), HOST, () => {
  console.log(`====================================================`);
  console.log(` Persian Accounting Web Application is Running! `);
  console.log(` Listening on: http://${HOST}:${PORT} `);
  console.log(`====================================================`);
});
