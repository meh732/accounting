import fs from 'fs';
import path from 'path';

export function generateWindowsExeWithUrl(serverUrl, outputPath) {
  const baseExePath = path.join(process.cwd(), 'windows_setup', 'Hesabdari-Meh-Client-Base.exe');
  if (!fs.existsSync(baseExePath)) {
    throw new Error('Base executable not found at ' + baseExePath);
  }

  const exeBuffer = fs.readFileSync(baseExePath);
  const startMarker = '###HESABDARI_MEH_SERVER_URL_START###';
  const endMarker = '###HESABDARI_MEH_SERVER_URL_END###';

  const markerString = `${startMarker}http://localhost:3000${endMarker}`;
  const markerIndex = exeBuffer.indexOf(Buffer.from(startMarker, 'utf-8'));

  if (markerIndex === -1) {
    // If not found in binary, write direct copy
    fs.writeFileSync(outputPath, exeBuffer);
    return outputPath;
  }

  // Create new payload with exact buffer sizing
  const newPayload = `${startMarker}${serverUrl}${endMarker}`;
  const maxBufferLen = 2048;

  // Clone buffer
  const patchedBuffer = Buffer.from(exeBuffer);
  // Zero out old buffer area
  patchedBuffer.fill(0, markerIndex, markerIndex + maxBufferLen);
  // Write new payload
  patchedBuffer.write(newPayload, markerIndex, 'utf-8');

  fs.writeFileSync(outputPath, patchedBuffer);
  return outputPath;
}
