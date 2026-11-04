import React, { useState, useEffect } from 'react';
import {
  getOrCreateDeviceId,
  getStoredValidLicense,
  getStoredRawLicenseKey,
  cacheServerLicenseLocally,
  saveOfflineLicenseKey,
  VerifiedLicenseInfo,
} from '../../utils/offlineLicense';
import { ShieldCheck, Lock, Copy, CheckCircle2, KeyRound, AlertCircle, Cpu, Server } from 'lucide-react';

interface OfflineActivationGateProps {
  children: React.ReactNode;
}

export const OfflineActivationGate: React.FC<OfflineActivationGateProps> = ({ children }) => {
  const [deviceId, setDeviceId] = useState<string>('');
  const [licenseStatus, setLicenseStatus] = useState<VerifiedLicenseInfo | null>(null);
  const [licenseInput, setLicenseInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedDevice, setCopiedDevice] = useState<boolean>(false);
  const [isActivating, setIsActivating] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;

    const checkServerAndLocalLicense = async () => {
      const localBrowserDevId = getOrCreateDeviceId();
      const localStored = getStoredValidLicense();
      const localRawKey = getStoredRawLicenseKey();

      // If local browser already has a cached valid license, unlock immediately while syncing with server in background
      if (localStored.valid && isMounted) {
        setDeviceId(localStored.deviceId || localBrowserDevId);
        setLicenseStatus(localStored);
      }

      try {
        const res = await fetch('/api/license', { cache: 'no-store' });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const serverLic = await res.json();
          const srvDevId = serverLic.serverDeviceId || localBrowserDevId;

          // Case 1: The Linux Server is ALREADY activated -> unlock this LAN/Mobile client immediately!
          if (serverLic.activated) {
            cacheServerLicenseLocally(
              serverLic.licenseKey,
              serverLic.activatedDeviceId || srvDevId
            );
            if (isMounted) {
              setDeviceId(serverLic.activatedDeviceId || srvDevId);
              setLicenseStatus(
                serverLic.licenseInfo && serverLic.licenseInfo.valid
                  ? serverLic.licenseInfo
                  : {
                      valid: true,
                      deviceId: serverLic.activatedDeviceId || srvDevId,
                      expiryCode: 'PERM',
                      isPermanent: true,
                      expiresAtLabel: 'فعال‌شده روی سرور مرکزی (شبکه)',
                    }
              );
            }
            return;
          }

          // Case 2: The Linux Server is NOT activated yet, BUT this admin browser was already activated -> push activation to Server automatically!
          if (localStored.valid) {
            try {
              await fetch('/api/license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  licenseKey: localRawKey || 'SERVER-ACTIVATED',
                  deviceId: localStored.deviceId || localBrowserDevId,
                  preActivatedBrowser: true,
                }),
              });
            } catch {
              // ignore network error
            }
            if (isMounted) {
              setDeviceId(localStored.deviceId || srvDevId);
              setLicenseStatus(localStored);
            }
            return;
          }

          // Case 3: Neither Server nor local browser is activated -> show the Linux Server's Hardware ID
          if (isMounted) {
            setDeviceId(srvDevId);
            setLicenseStatus(
              serverLic.licenseInfo || {
                valid: false,
                deviceId: srvDevId,
                expiryCode: '',
                isPermanent: false,
                expiresAtLabel: '',
              }
            );
          }
          return;
        }

        // Secondary fallback: check /api/data in case /api/license was not served as JSON
        const dataRes = await fetch('/api/data', { cache: 'no-store' });
        if (dataRes.ok) {
          const dbJson = await dataRes.json();
          if (dbJson && dbJson.license && dbJson.license.activated) {
            const srvId = dbJson.license.activatedDeviceId || dbJson.license.serverDeviceId || localBrowserDevId;
            cacheServerLicenseLocally(dbJson.license.licenseKey, srvId);
            if (isMounted) {
              setDeviceId(srvId);
              setLicenseStatus({
                valid: true,
                deviceId: srvId,
                expiryCode: 'PERM',
                isPermanent: true,
                expiresAtLabel: 'فعال‌شده روی سرور مرکزی (شبکه)',
              });
            }
            return;
          }
        }
      } catch {
        // Offline fallback if server API unreachable
      }

      if (isMounted) {
        setDeviceId(localStored.deviceId || localBrowserDevId);
        setLicenseStatus(localStored);
      }
    };

    checkServerAndLocalLicense();

    // Listen for real-time server activation events via SSE so all connected LAN browsers unlock immediately
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('license', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.activated && data.licenseInfo?.valid) {
            if (data.licenseKey) {
              cacheServerLicenseLocally(
                data.licenseKey,
                data.activatedDeviceId || data.serverDeviceId
              );
            }
            if (isMounted) {
              setDeviceId(data.activatedDeviceId || data.serverDeviceId);
              setLicenseStatus(data.licenseInfo);
            }
          }
        } catch {
          // ignore parse error
        }
      });
    } catch {
      // ignore SSE error
    }

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const handleCopyDeviceId = () => {
    if (!deviceId) return;
    navigator.clipboard.writeText(deviceId);
    setCopiedDevice(true);
    setTimeout(() => setCopiedDevice(false), 2000);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanInput = licenseInput.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanInput) {
      setErrorMsg('لطفاً کد لایسنس فعال‌سازی آفلاین را وارد نمایید.');
      return;
    }

    setIsActivating(true);
    try {
      // 1. Activate directly on the Central Linux Server so ALL LAN clients are unlocked permanently
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: cleanInput,
          deviceId: getOrCreateDeviceId(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.valid && data.licenseInfo) {
        cacheServerLicenseLocally(cleanInput, data.activatedDeviceId || deviceId);
        setLicenseStatus(data.licenseInfo);
        setIsActivating(false);
        return;
      }

      // 2. Fallback check locally in case key was generated for local browser ID
      const localRes = saveOfflineLicenseKey(cleanInput, deviceId);
      if (localRes.valid) {
        try {
          await fetch('/api/license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              licenseKey: cleanInput,
              deviceId: localRes.deviceId,
            }),
          });
        } catch {
          // ignore
        }
        setLicenseStatus(localRes);
      } else {
        setErrorMsg(
          data.errorMessage || localRes.errorMessage || 'کد لایسنس وارد شده نامعتبر است.'
        );
      }
    } catch {
      const localRes = saveOfflineLicenseKey(cleanInput, deviceId);
      if (localRes.valid) {
        setLicenseStatus(localRes);
      } else {
        setErrorMsg(localRes.errorMessage || 'کد لایسنس وارد شده نامعتبر است.');
      }
    } finally {
      setIsActivating(false);
    }
  };

  if (!licenseStatus) {
    return null;
  }

  if (licenseStatus.valid) {
    return <>{children}</>;
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center p-4 font-sans text-slate-100"
    >
      <div className="w-full max-w-lg bg-slate-900/90 border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
        {/* Header */}
        <div className="p-6 bg-gradient-to-l from-indigo-900/80 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1">
              <Server className="w-3 h-3" />
              <span>قفل سخت‌افزاری سرور مرکزی (Central Server Protection)</span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-white">
              فعال‌سازی سرور مرکزی سامانه حسابداری مَه
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              با یک‌بار فعال‌سازی روی این سرور، تمامی کلاینت‌های شبکه (IP) بدون نیاز به فعال‌سازی مجدد به همین دیتابیس متصل می‌شوند.
            </p>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleActivate} className="p-6 space-y-5 text-xs">
          {/* Step 1: Device ID */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>۱. شناسه سخت‌افزاری سرور مرکزی (Server ID):</span>
              </span>
              <span className="text-[10px] text-slate-500">یکپارچه برای کل شبکه</span>
            </div>

            <div className="flex items-center justify-between gap-2 bg-slate-900 border border-indigo-500/30 rounded-xl p-2.5">
              <span
                dir="ltr"
                className="font-mono font-black text-sm sm:text-base text-indigo-300 tracking-wider select-all"
              >
                {deviceId}
              </span>
              <button
                type="button"
                onClick={handleCopyDeviceId}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs transition shrink-0 cursor-pointer"
              >
                {copiedDevice ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>کپی شد</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی کد سرور</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              کد شناسایی سرور بالا را کپی کرده و در فایل صدور لایسنس آفلاین وارد نمایید تا کلید دیجیتال مخصوص این سرور صادر شود.
            </p>
          </div>

          {/* Step 2: License Key Input */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-200 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>۲. کد لایسنس فعال‌سازی سرور (Offline License Key):</span>
            </label>
            <textarea
              rows={3}
              dir="ltr"
              value={licenseInput}
              onChange={(e) => setLicenseInput(e.target.value)}
              placeholder="MEH1-PERM-..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl p-3 font-mono text-left text-xs text-emerald-300 placeholder:text-slate-600 outline-hidden transition"
              required
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isActivating}
            className="w-full py-3 px-4 bg-gradient-to-l from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 disabled:opacity-60 text-white font-black rounded-xl shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-2 text-sm transition cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>
              {isActivating
                ? 'در حال ثبت لایسنس روی سرور مرکزی...'
                : 'بررسی امضای دیجیتال و فعال‌سازی دائمی سرور و شبکه'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};

