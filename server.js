import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cjsServerPath = path.join(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(cjsServerPath)) {
  // If compiled dist/server.cjs exists, load it
  import('./dist/server.cjs');
} else {
  // Fallback to tsx or esbuild
  console.log('[Persian Accounting] Starting server via tsx/server.ts...');
  const proc = spawn('npx', ['tsx', path.join(__dirname, 'server.ts')], {
    stdio: 'inherit',
    env: process.env
  });
  proc.on('exit', (code) => {
    process.exit(code || 0);
  });
}
