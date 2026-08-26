import React, { useState, useEffect } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import {
  Building2,
  Calendar,
  Search,
  PlusCircle,
  ShieldCheck,
  Coins,
  FileText,
  ShoppingCart,
  Users,
  CreditCard,
  Maximize2,
  Minimize2,
  Menu,
  Cloud,
  RefreshCw,
  Server,
  Smartphone,
  Monitor,
  Download,
  X,
  CheckCircle2,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { getCurrentShamsiDate } from '../../utils/dateUtils';

interface HeaderProps {
  onOpenQuickInvoice: () => void;
  onOpenQuickVoucher: () => void;
  onOpenQuickContact: () => void;
  onOpenQuickExpense: () => void;
  onOpenBackupManager: () => void;
  onSearchChange: (query: string) => void;
  onToggleMobileMenu?: () => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenQuickInvoice,
  onOpenQuickVoucher,
  onOpenQuickContact,
  onOpenQuickExpense,
  onOpenBackupManager,
  onSearchChange,
  onToggleMobileMenu,
}) => {
  const { settings, updateSettings, autoBackupSnapshots, serverSyncStatus, lastServerSyncTime, syncWithServer } = useAccounting();
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showWindowsModal, setShowWindowsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Listen for PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredInstallPrompt(null);
    } else {
      alert('برای نصب این برنامه بر روی گوشی یا دسکتاپ:\n\n• در مرورگر کروم: روی آیکون نصب در نوار آدرس یا منوی سه‌نقطه > «نصب برنامه / Install app» کلیک کنید.\n• در آیفون (سافاری): دکمه اشتراک‌گذاری (Share) را بزنید و گزینه «Add to Home Screen» (افزودن به صفحه اصلی) را انتخاب فرمایید.');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    onSearchChange(val);
  };

  const toggleCurrency = () => {
    const newCurr = settings.currency === 'تومان' ? 'ریال' : 'تومان';
    updateSettings({ currency: newCurr });
  };

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left Side: Brand, Mobile Menu Toggle, Date */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Mobile Hamburger Menu Toggle */}
          <button
            id="btn-mobile-sidebar-toggle"
            type="button"
            onClick={onToggleMobileMenu}
            title="منوی اصلی سیستم"
            className="lg:hidden p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition border border-slate-200"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-md shadow-indigo-100">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-slate-800 text-xs sm:text-sm leading-tight line-clamp-1">
                {settings.companyName}
              </h1>
              {settings.financialYear ? (
                <span className="bg-indigo-50 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold border border-indigo-100 hidden sm:inline-block font-mono">
                  سال مالی {settings.financialYear}
                </span>
              ) : (
                <span className="bg-rose-50 text-rose-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold border border-rose-100 hidden sm:inline-block">
                  سال مالی تعریف نشده
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
              <Calendar className="w-3 h-3 text-indigo-500" />
              <span>امروز: {getCurrentShamsiDate()}</span>
            </div>
          </div>
        </div>

        {/* Middle: Universal Search */}
        <div className="flex-1 max-w-sm hidden lg:block">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="global-search-input"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="جستجو در فاکتورها، اشخاص، اسناد و کالاها..."
              className="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-hidden transition"
            />
          </div>
        </div>

        {/* Right Side (Actions) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Fullscreen Toggle */}
          <button
            id="btn-toggle-fullscreen"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'خروج از حالت تمام صفحه' : 'مشاهده در ابعاد تمام صفحه دسکتاپ'}
            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition border border-slate-200"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Currency Toggle */}
          <button
            id="btn-toggle-currency"
            onClick={toggleCurrency}
            title="تغییر واحد پول پیش‌فرض سیستم"
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200"
          >
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>واحد: {settings.currency}</span>
          </button>

          {/* Central Server Real-time Sync Status */}
          <button
            id="btn-server-sync-status"
            onClick={async () => {
              await syncWithServer();
            }}
            title={
              serverSyncStatus === 'synced'
                ? `پایگاه‌داده متمرکز سرور - متصل و همگام آنلاین (آخرین بروزرسانی: ${lastServerSyncTime || 'لحظاتی پیش'}) - برای بروزرسانی دستی کلیک کنید`
                : serverSyncStatus === 'syncing'
                ? 'در حال همگام‌سازی و ارتباط با پایگاه‌داده سرور...'
                : 'سرور در دسترس نیست / کلیک برای تلاش مجدد'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition border cursor-pointer ${
              serverSyncStatus === 'synced'
                ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                : serverSyncStatus === 'syncing'
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
            }`}
          >
            {serverSyncStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            ) : serverSyncStatus === 'synced' ? (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            ) : (
              <Server className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span className="hidden sm:inline text-[11px]">
              {serverSyncStatus === 'synced'
                ? `همگام با سرور (${lastServerSyncTime || 'لحظه‌ای'})`
                : serverSyncStatus === 'syncing'
                ? 'در حال اتصال...'
                : 'آفلاین (تلاش مجدد)'}
            </span>
          </button>

          {/* PWA Install Button */}
          {!isInstalled && (
            <button
              id="btn-install-pwa"
              onClick={handleInstallPWA}
              title="نصب نسخه وب‌اپلیکیشن روی گوشی یا دسکتاپ (PWA)"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition border border-indigo-200"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">نصب اپ (PWA)</span>
            </button>
          )}

          {/* Windows Client Download Button */}
          <button
            id="btn-download-windows-client"
            onClick={() => setShowWindowsModal(true)}
            title="دانلود نسخه مخصوص کلاینت ویندوز (سبک و بدون نیاز به نصب)"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg transition border border-sky-200"
          >
            <Monitor className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline">نسخه ویندوز</span>
          </button>

          {/* Backup & Restore Center Button */}
          <button
            id="btn-open-backup-manager"
            onClick={onOpenBackupManager}
            title="مدیریت بکاپ‌ها، پشتیبان‌گیری خودکار و بازگردانی"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">پشتیبان‌گیری و بازیابی</span>
            {autoBackupSnapshots.length > 0 && (
              <span className="bg-emerald-600 text-white text-[9px] font-mono px-1.5 py-0.2 rounded-full">
                {autoBackupSnapshots.length}
              </span>
            )}
          </button>

          {/* Quick Add Menu */}
          <div className="relative">
            <button
              id="btn-quick-create"
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>ثبت سریع</span>
            </button>

            {showQuickMenu && (
              <div
                id="dropdown-quick-create"
                className="absolute left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs"
              >
                <button
                  onClick={() => {
                    onOpenQuickInvoice();
                    setShowQuickMenu(false);
                  }}
                  className="w-full text-right px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4 text-indigo-500" />
                  <span>صدور فاکتور جدید</span>
                </button>
                <button
                  onClick={() => {
                    onOpenQuickVoucher();
                    setShowQuickMenu(false);
                  }}
                  className="w-full text-right px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>ثبت سند حسابداری دستی</span>
                </button>
                <button
                  onClick={() => {
                    onOpenQuickExpense();
                    setShowQuickMenu(false);
                  }}
                  className="w-full text-right px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  <span>ثبت هزینه جدید</span>
                </button>
                <button
                  onClick={() => {
                    onOpenQuickContact();
                    setShowQuickMenu(false);
                  }}
                  className="w-full text-right px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>تعریف شخص / طرف‌حساب</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Windows Client Download & Setup Modal */}
      {showWindowsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-sky-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Monitor className="w-5 h-5 text-sky-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">دانلود نسخه کلاینت ویندوز</h3>
                  <p className="text-[11px] text-sky-100 mt-0.5">آماده اجرا در چند ثانیه، فوق‌العاده سبک و متصل مستقیم به سرور</p>
                </div>
              </div>
              <button
                onClick={() => setShowWindowsModal(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
              <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-sky-900 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>ویژگی‌های نسخه سبک ویندوز:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-sky-800 pr-1">
                  <li>بدون نیاز به نصب پیش‌نیاز یا کامپایلر (پرتابل و آماده اجرا)</li>
                  <li>مصرف رم کمتر از ۳۰ مگابایت و اجرای بدون تاخیر</li>
                  <li>اتصال لحظه‌ای خودکار به این سرور مرکزی ({window.location.origin})</li>
                  <li>امکان ایجاد آیکون میانبر رسمی روی دسکتاپ ویندوز</li>
                </ul>
              </div>

              {/* Direct Download Actions */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-mono font-bold">.EXE</span>
                      <span>فایل اجرایی مستقیم ویندوز</span>
                    </div>
                    <div className="text-[11px] text-slate-500">حجم فقط ۴۰ کیلوبایت • اجرای مستقیم بدون نیاز به اکسترکت</div>
                  </div>
                  <a
                    href="/download/exe"
                    download="Hesabdari-Meh-Client.exe"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود EXE</span>
                  </a>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 text-[10px] bg-indigo-100 text-indigo-800 rounded font-mono font-bold">ZIP</span>
                      <span>بسته کامل کلاینت ویندوز</span>
                    </div>
                    <div className="text-[11px] text-slate-500">شامل فایل اگزه، لانچر، و اسکریپت ساخت میانبر روی دسکتاپ</div>
                  </div>
                  <a
                    href="/download/windows"
                    download="Hesabdari-Meh-Windows-Client.zip"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود ZIP</span>
                  </a>
                </div>
              </div>

              {/* PWA Alternative */}
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">نصب به عنوان وب‌اپلیکیشن (PWA)</div>
                    <div className="text-[10px] text-slate-500">نصب در مرورگر کروم یا اج بدون دانلود فایل</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowWindowsModal(false);
                    handleInstallPWA();
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  نصب PWA
                </button>
              </div>

              {/* Direct Server URL for clients */}
              <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-center justify-between gap-2">
                <div className="space-y-0.5 truncate">
                  <div className="font-bold text-slate-700">لینک مستقیم دانلود برای سایر کامپیوترها:</div>
                  <div className="font-mono text-indigo-600 truncate">{window.location.origin}/download/windows</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/download/windows`);
                    alert('لینک دانلود در حافظه کپی شد.');
                  }}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition shrink-0"
                >
                  کپی لینک
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowWindowsModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
