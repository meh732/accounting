import React, { useState, useEffect } from 'react';
import {
  getOrCreateDeviceId,
  getStoredValidLicense,
  saveOfflineLicenseKey,
  VerifiedLicenseInfo,
} from '../../utils/offlineLicense';
import { ShieldCheck, Lock, Copy, CheckCircle2, KeyRound, AlertCircle, Cpu } from 'lucide-react';

interface OfflineActivationGateProps {
  children: React.ReactNode;
}

export const OfflineActivationGate: React.FC<OfflineActivationGateProps> = ({ children }) => {
  const [deviceId, setDeviceId] = useState<string>('');
  const [licenseStatus, setLicenseStatus] = useState<VerifiedLicenseInfo | null>(null);
  const [licenseInput, setLicenseInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedDevice, setCopiedDevice] = useState<boolean>(false);

  useEffect(() => {
    const devId = getOrCreateDeviceId();
    setDeviceId(devId);
    const stored = getStoredValidLicense();
    setLicenseStatus(stored);
  }, []);

  const handleCopyDeviceId = () => {
    if (!deviceId) return;
    navigator.clipboard.writeText(deviceId);
    setCopiedDevice(true);
    setTimeout(() => setCopiedDevice(false), 2000);
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanInput = licenseInput.trim().toUpperCase();
    if (!cleanInput) {
      setErrorMsg('لطفاً کد لایسنس فعال‌سازی آفلاین را وارد نمایید.');
      return;
    }

    const res = saveOfflineLicenseKey(cleanInput);
    if (res.valid) {
      setLicenseStatus(res);
    } else {
      setErrorMsg(res.errorMessage || 'کد لایسنس وارد شده نامعتبر است.');
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
              <span>قفل سخت‌افزاری سیستم (Offline Protection)</span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-white">
              فعال‌سازی آفلاین سامانه حسابداری مَه
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              این کامپیوتر هنوز فعال‌سازی نشده است. جهت بازگشایی برنامه، لایسنس اختصاصی این سیستم را وارد نمایید.
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
                <span>۱. شناسه سخت‌افزاری این کامپیوتر (Device ID):</span>
              </span>
              <span className="text-[10px] text-slate-500">اختصاصی این دستگاه</span>
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
                    <span>کپی کد سیستم</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              کد شناسایی بالا را کپی کرده و در فایل صدور لایسنس آفلاین وارد نمایید تا کلید دیجیتال مخصوص این کامپیوتر صادر شود.
            </p>
          </div>

          {/* Step 2: License Key Input */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-200 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>۲. کد لایسنس فعال‌سازی آفلاین (Offline License Key):</span>
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
            className="w-full py-3 px-4 bg-gradient-to-l from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-black rounded-xl shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-2 text-sm transition cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>بررسی امضای دیجیتال و فعال‌سازی دائمی سیستم</span>
          </button>
        </form>
      </div>
    </div>
  );
};
