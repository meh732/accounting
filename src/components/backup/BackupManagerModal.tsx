import React, { useState, useRef } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { BackupSnapshot } from '../../types/accounting';
import {
  ShieldCheck,
  Download,
  Upload,
  Clock,
  History,
  RotateCcw,
  Trash2,
  X,
  FileCheck2,
  AlertCircle,
  Database,
  PlusCircle,
  HardDriveDownload,
  CheckCircle2,
  Layers,
  FileSpreadsheet,
  Users,
  Building,
  Package
} from 'lucide-react';

interface BackupManagerModalProps {
  onClose: () => void;
}

export const BackupManagerModal: React.FC<BackupManagerModalProps> = ({ onClose }) => {
  const {
    autoBackupSnapshots,
    createBackupSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    clearAllSnapshots,
    exportSnapshotJSON,
    exportDatabaseJSON,
    importDatabaseJSON,
    lastBackupTime,
    invoices,
    vouchers,
    contacts,
    products,
    chartOfAccounts
  } = useAccounting();

  const [activeTab, setActiveTab] = useState<'snapshots' | 'file'>('snapshots');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingFilePayload, setPendingFilePayload] = useState<{
    raw: string;
    parsed: any;
    fileName: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const handleManualSnapshot = () => {
    const snap = createBackupSnapshot('پشتیبان دستی توسط کاربر');
    showSuccess(`نسخه پشتیبان دستی (${snap.shamsiTime}) با موفقیت ایجاد و ذخیره شد.`);
  };

  const handleRestoreSnapshot = (snap: BackupSnapshot) => {
    if (
      window.confirm(
        `آیا از بازیابی نسخه پشتیبان مورخ «${snap.shamsiDate} ساعت ${snap.shamsiTime}» اطمینان دارید؟ اطلاعات فعلی با این نسخه جایگزین خواهد شد.`
      )
    ) {
      const ok = restoreSnapshot(snap.id);
      if (ok) {
        showSuccess('کلیه اطلاعات و اسناد با موفقیت به نسخه انتخاب‌شده بازگردانی شد.');
      } else {
        showError('خطا در بازگردانی نسخه پشتیبان.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed.chartOfAccounts || !parsed.vouchers) {
          showError('فایل انتخاب شده ساختار معتبر پایگاه داده حسابداری را ندارد.');
          setPendingFilePayload(null);
          return;
        }

        setPendingFilePayload({
          raw: content,
          parsed,
          fileName: file.name,
        });
      } catch (err) {
        showError('فایل انتخاب شده نامعتبر بوده یا خوانده نشد.');
        setPendingFilePayload(null);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmFileRestore = () => {
    if (!pendingFilePayload) return;
    const ok = importDatabaseJSON(pendingFilePayload.raw);
    if (ok) {
      showSuccess(`اطلاعات فایل «${pendingFilePayload.fileName}» با موفقیت در سامانه بارگذاری و بازگردانی شد.`);
      setPendingFilePayload(null);
    } else {
      showError('خطا در اعمال فایل پشتیبان.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>مرکز امنیت، پشتیبان‌گیری خودکار و بازگردانی اطلاعات</span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  ذخیره خودکار فعال
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                پشتیبان‌گیری هوشمند لحظه‌ای، ثبت خودکار هنگام خروج از مرورگر و بازیابی نسخه‌های پیشین
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {successMessage && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2 font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-4 mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2 font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tabs & Top Actions */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('snapshots')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'snapshots'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>تاریخچه و آرشیو نسخه‌های خودکار ({autoBackupSnapshots.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('file')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'file'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <HardDriveDownload className="w-3.5 h-3.5" />
              <span>فایل پشتیبان آفلاین (JSON)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSnapshot}
              id="btn-create-manual-snapshot"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>ایجاد نسخه پشتیبان جدید</span>
            </button>
            <button
              onClick={exportDatabaseJSON}
              id="btn-quick-download-json"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>دانلود فایل JSON</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Quick System Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-blue-100 text-blue-700 flex items-center justify-center">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">فاکتورها</span>
                <span className="font-bold text-slate-800">{invoices.length} عدد</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-amber-100 text-amber-700 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">اسناد دوبل</span>
                <span className="font-bold text-slate-800">{vouchers.length} سند</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">طرف‌حساب‌ها</span>
                <span className="font-bold text-slate-800">{contacts.length} شخص</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-purple-100 text-purple-700 flex items-center justify-center">
                <Package className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">کالا و انبار</span>
                <span className="font-bold text-slate-800">{products.length} کالا</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center gap-2 col-span-2 sm:col-span-1">
              <div className="w-7 h-7 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Building className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">سرفصل‌ها</span>
                <span className="font-bold text-slate-800">{chartOfAccounts.length} حساب</span>
              </div>
            </div>
          </div>

          {/* TAB 1: Auto-Snapshots Archive */}
          {activeTab === 'snapshots' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-indigo-600" />
                    <span>آرشیو نسخه‌های ذخیره شده هنگام بستن پنجره و رویدادها</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    سامانه هنگام خروج از مرورگر یا بستن تب، آخرین وضعیت را به صورت خودکار پشتیبان می‌گیرد تا هیچ داده‌ای مفقود نشود.
                  </p>
                </div>
                {autoBackupSnapshots.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('آیا از پاکسازی تمام تاریخچه پشتیبان‌های خودکار اطمینان دارید؟')) {
                        clearAllSnapshots();
                        showSuccess('آرشیو با موفقیت پاکسازی شد.');
                      }
                    }}
                    className="text-rose-600 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1 p-1 hover:bg-rose-50 rounded transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>پاکسازی آرشیو</span>
                  </button>
                )}
              </div>

              {autoBackupSnapshots.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
                  <Database className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-700 text-xs">هنوز نسخه پشتیبانی در آرشیو ثبت نشده است</p>
                  <p className="text-[11px] text-slate-500">
                    با کلیک بر روی «ایجاد نسخه پشتیبان جدید» یا هنگام بستن برنامه، به صورت خودکار ثبت خواهد شد.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                  {autoBackupSnapshots.map((snap, idx) => (
                    <div
                      key={snap.id}
                      className="p-3 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-mono font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 text-xs">{snap.reason}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 font-mono rounded-md">
                            {snap.shamsiDate} - {snap.shamsiTime}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({(snap.sizeBytes / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-3 pr-7 font-mono">
                          <span>فاکتور: {snap.counts.invoices}</span>
                          <span>•</span>
                          <span>اسناد: {snap.counts.vouchers}</span>
                          <span>•</span>
                          <span>اشخاص: {snap.counts.contacts}</span>
                          <span>•</span>
                          <span>کالاها: {snap.counts.products}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => handleRestoreSnapshot(snap)}
                          title="بازیابی این نسخه"
                          className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>بازیابی</span>
                        </button>
                        <button
                          onClick={() => exportSnapshotJSON(snap)}
                          title="دانلود فایل این نسخه"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('آیا از حذف این نسخه پشتیبان اطمینان دارید؟')) {
                              deleteSnapshot(snap.id);
                            }
                          }}
                          title="حذف از آرشیو"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-100 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: File Upload / Import */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Download Box */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <Download className="w-4 h-4" />
                    <span>خروجی و دانلود فایل پشتیبان (Export JSON)</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    یک نسخه کامل شامل سرفصل‌های کدینگ، اشخاص، بانک‌ها، انبار و کالاها، کلیه اسناد دوبل و فاکتورها در قالب یک فایل استاندارد JSON در کامپیوتر شما ذخیره می‌گردد.
                  </p>
                  <button
                    onClick={exportDatabaseJSON}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود فایل پشتیبان پایگاه داده</span>
                  </button>
                </div>

                {/* Upload Box */}
                <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-indigo-800 font-bold">
                    <Upload className="w-4 h-4" />
                    <span>بارگذاری و بازیابی از فایل (Import JSON)</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    فایل پشتیبان قبلی را از سیستم خود انتخاب کنید تا با اعتبارسنجی خودکار، داده‌ها در نرم‌افزار بازیابی شوند.
                  </p>
                  <label className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition">
                    <Upload className="w-4 h-4" />
                    <span>انتخاب فایل پشتیبان از رایانه</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Pending File Inspection Card */}
              {pendingFilePayload && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <FileCheck2 className="w-4 h-4 text-amber-700" />
                      <span>پیش‌نمایش محتوای فایل انتخاب‌شده: {pendingFilePayload.fileName}</span>
                    </div>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">
                      آماده بازگردانی
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded-lg border border-amber-200 text-[11px]">
                    <div>
                      نام شرکت: <strong>{pendingFilePayload.parsed.settings?.companyName || 'نامشخص'}</strong>
                    </div>
                    <div>
                      تاریخ صدور بکاپ:{' '}
                      <strong className="font-mono">{pendingFilePayload.parsed.shamsiDate || '-'}</strong>
                    </div>
                    <div>
                      تعداد فاکتورها:{' '}
                      <strong className="font-mono text-emerald-700">
                        {pendingFilePayload.parsed.invoices?.length || 0}
                      </strong>
                    </div>
                    <div>
                      تعداد اسناد دوبل:{' '}
                      <strong className="font-mono text-indigo-700">
                        {pendingFilePayload.parsed.vouchers?.length || 0}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setPendingFilePayload(null)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg font-bold text-xs"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={handleConfirmFileRestore}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>تایید و بازگردانی این فایل</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>آخرین پشتیبان‌گیری موفق: </span>
            <span className="font-mono font-bold text-slate-700">{lastBackupTime || 'لحظاتی پیش'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold transition"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
