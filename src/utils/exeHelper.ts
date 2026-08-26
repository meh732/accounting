import fs from 'fs';
import path from 'path';

export function getPatchedExeBuffer(serverUrl: string): Buffer | null {
  const baseExePath = path.join(process.cwd(), 'windows_setup', 'Hesabdari-Meh-Client-Base.exe');
  if (!fs.existsSync(baseExePath)) {
    return null;
  }

  const exeBuffer = fs.readFileSync(baseExePath);
  const startMarker = '###HESABDARI_MEH_SERVER_URL_START###';
  const endMarker = '###HESABDARI_MEH_SERVER_URL_END###';

  const markerIndex = exeBuffer.indexOf(Buffer.from(startMarker, 'utf-8'));
  if (markerIndex === -1) {
    return exeBuffer;
  }

  const newPayload = `${startMarker}${serverUrl}${endMarker}`;
  const maxBufferLen = 2048;

  const patchedBuffer = Buffer.from(exeBuffer);
  patchedBuffer.fill(0, markerIndex, markerIndex + maxBufferLen);
  patchedBuffer.write(newPayload, markerIndex, 'utf-8');

  return patchedBuffer;
}
