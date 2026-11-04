/**
 * Asymmetric Schnorr Digital Signature Verification for Offline Device Activation
 * --------------------------------------------------------------------------------
 * SECURITY NOTICE:
 * This module contains ONLY the Public Verification Parameters (P, Q, G, Y).
 * The Private Signing Scalar (x) and the Owner Master Passphrase DO NOT EXIST
 * anywhere in this codebase. Forging a valid signature (e, s) for any Device ID
 * without the private scalar x requires solving the Discrete Logarithm Problem
 * Y = G^x mod P, which is mathematically infeasible for any AI or computer.
 */

const P_HEX = 'e147e4d0a7c0b9ce2ea9eb836247d8c25814009762e2501e2f27b4566ccb876f';
const Q_HEX = '70a3f26853e05ce71754f5c1b123ec612c0a004bb171280f1793da2b3665c3b7';
const Y_HEX = '2910df692ffd5dcd33b2ee9fe8cb3c2de4681db71803595241cd1e3ed6d1c962';

const P = BigInt('0x' + P_HEX);
const Q = BigInt('0x' + Q_HEX);
const G = 4n;
const Y = BigInt('0x' + Y_HEX);

const DEVICE_SEED_STORAGE_KEY = 'meh_acc_hw_install_seed_v1';
const LICENSE_STORAGE_KEY = 'meh_acc_offline_license_v1';

export interface VerifiedLicenseInfo {
  valid: boolean;
  deviceId: string;
  expiryCode: string; // 'PERM' or 'YYYYMMDD'
  isPermanent: boolean;
  expiresAtLabel: string;
  errorMessage?: string;
}

/**
 * Pure JavaScript SHA-256 (works in all contexts including HTTP LAN IPs and offline WebViews)
 */
export function sha256HexPure(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }
  const bytes = new TextEncoder().encode(ascii);
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const bitLen = bytes.length * 8;
  const totalLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(totalLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(totalLen - 4, bitLen >>> 0, false);

  const W = new Uint32Array(64);
  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(W[i - 15], 7) ^ rightRotate(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rightRotate(W[i - 2], 17) ^ rightRotate(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }
  return H.map((v) => v.toString(16).padStart(8, '0')).join('');
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
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

/**
 * Generates or retrieves the unique Hardware/System Device ID for this computer.
 * Format: MEH-PC-XXXX-XXXX-XXXX
 */
export function getOrCreateDeviceId(): string {
  try {
    let installSeed = localStorage.getItem(DEVICE_SEED_STORAGE_KEY);
    if (!installSeed) {
      const randomBytes = new Uint32Array(4);
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(randomBytes);
      } else {
        for (let i = 0; i < 4; i++) {
          randomBytes[i] = Math.floor(Math.random() * 0xffffffff);
        }
      }
      installSeed = Array.from(randomBytes)
        .map((n) => n.toString(16).padStart(8, '0'))
        .join('');
      localStorage.setItem(DEVICE_SEED_STORAGE_KEY, installSeed);
    }

    const nav = typeof navigator !== 'undefined' ? navigator : ({} as any);
    const scr = typeof screen !== 'undefined' ? screen : ({} as any);
    const hwTraits = [
      nav.platform || 'PLATFORM',
      String(nav.hardwareConcurrency || 4),
      String((nav as any).deviceMemory || 8),
      String(scr.colorDepth || 24),
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tehran',
      installSeed,
    ].join('|');

    const digest = sha256HexPure('MEH_DEVICE_FINGERPRINT_V1::' + hwTraits).toUpperCase();
    const p1 = digest.slice(0, 4);
    const p2 = digest.slice(4, 8);
    const p3 = digest.slice(8, 12);
    return `MEH-PC-${p1}-${p2}-${p3}`;
  } catch {
    return 'MEH-PC-7F2A-91C4-88B0';
  }
}

/**
 * Normalize Device ID for verification
 */
export function normalizeDeviceId(deviceId: string): string {
  return deviceId.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Verify an Offline License Key against the current computer's Device ID
 * License Format: MEH1-<EXPIRY_CODE>-<E_HEX>-<S_HEX>
 */
export function verifyOfflineLicenseKey(rawLicenseKey: string, currentDeviceId?: string): VerifiedLicenseInfo {
  const deviceId = normalizeDeviceId(currentDeviceId || getOrCreateDeviceId());
  const cleanKey = rawLicenseKey.trim().toUpperCase().replace(/\s+/g, '');

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

    // Reconstruct message bound to this exact computer's Device ID
    const msg = `${deviceId}|${expiryCode}`;

    // Schnorr verification: Rv = (G^s * Y^e) mod P
    const gs = modPow(G, s, P);
    const ye = modPow(Y, e, P);
    const Rv = (gs * ye) % P;

    const evHex = sha256HexPure(`${Rv.toString(16)}|${Y.toString(16)}|${msg}`).slice(0, 24);

    if (evHex.toLowerCase() !== eHex.toLowerCase()) {
      return {
        valid: false,
        deviceId,
        expiryCode,
        isPermanent: false,
        expiresAtLabel: '',
        errorMessage: 'کد فعال‌سازی نامعتبر است یا متعلق به کامپیوتر دیگری می‌باشد.',
      };
    }

    // Check expiration if not PERM
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

export function getStoredValidLicense(): VerifiedLicenseInfo {
  const deviceId = getOrCreateDeviceId();
  try {
    const savedKey = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (!savedKey) {
      return {
        valid: false,
        deviceId,
        expiryCode: '',
        isPermanent: false,
        expiresAtLabel: '',
      };
    }
    return verifyOfflineLicenseKey(savedKey, deviceId);
  } catch {
    return {
      valid: false,
      deviceId,
      expiryCode: '',
      isPermanent: false,
      expiresAtLabel: '',
    };
  }
}

export function saveOfflineLicenseKey(rawKey: string): VerifiedLicenseInfo {
  const result = verifyOfflineLicenseKey(rawKey);
  if (result.valid) {
    localStorage.setItem(LICENSE_STORAGE_KEY, rawKey.trim().toUpperCase().replace(/\s+/g, ''));
  }
  return result;
}
