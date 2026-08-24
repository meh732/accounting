import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import {
  Settings,
  Building2,
  Coins,
  FileCheck2,
  Download,
  Upload,
  RefreshCw,
  Save,
  CheckCircle2,
  ShieldCheck,
  History,
  HardDrive,
  Calendar,
  Lock,
  Plus,
  Percent,
  ToggleLeft,
  ToggleRight,
  Check,
  Layers,
  Send,
  Bot,
  MessageSquare,
  Clock,
  Radio,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { BackupManagerModal } from '../backup/BackupManagerModal';
import { YearEndClosingModal } from '../yearEnd/YearEndClosingModal';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    exportDatabaseJSON,
    importDatabaseJSON,
    resetToDefaultData,
    autoBackupSnapshots,
    financialYears,
    createNewFinancialYear,
    switchFinancialYear,
    triggerBotBackupNow,
  } = useAccounting();

  const [companyName, setCompanyName] = useState(settings.companyName || 'حسابداری مه');
  const [financialYear, setFinancialYear] = useState(settings.financialYear || '1403');
  const [currency, setCurrency] = useState(settings.currency);
  const [enableTax, setEnableTax] = useState(settings.enableTax !== false);
  const [autoGenerateVouchers, setAutoGenerateVouchers] = useState(settings.autoGenerateVouchers);
  const [taxRate, setTaxRate] = useState(settings.taxRate || settings.defaultTaxRate || 10);
  const [nationalCode, setNationalCode] = useState(settings.nationalCode || '');
  const [economicCode, setEconomicCode] = useState(settings.economicCode || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [address, setAddress] = useState(settings.address || '');

  // Bot Backup State
  const [botEnabled, setBotEnabled] = useState(settings.botBackup?.enabled || false);
  const [botIntervalHours, setBotIntervalHours] = useState(settings.botBackup?.intervalHours || 6);
  const [telegramEnabled, setTelegramEnabled] = useState(settings.botBackup?.telegramEnabled || false);
  const [telegramBotToken, setTelegramBotToken] = useState(settings.botBackup?.telegramBotToken || '');
  const [telegramAdminChatIds, setTelegramAdminChatIds] = useState(settings.botBackup?.telegramAdminChatIds || '');
  const [baleEnabled, setBaleEnabled] = useState(settings.botBackup?.baleEnabled || false);
  const [baleBotToken, setBaleBotToken] = useState(settings.botBackup?.baleBotToken || '');
  const [baleAdminChatIds, setBaleAdminChatIds] = useState(settings.botBackup?.baleAdminChatIds || '');
  const [isSendingBotTest, setIsSendingBotTest] = useState(false);
  const [botTestResults, setBotTestResults] = useState<Array<{ platform: string; targetChatId: string; success: boolean; message?: string }> | null>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isYearEndModalOpen, setIsYearEndModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [showAddYear, setShowAddYear] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      companyName,
      financialYear,
      currency,
      enableTax,
      autoGenerateVouchers,
      taxRate: enableTax ? taxRate : 0,
      defaultTaxRate: taxRate,
      nationalCode,
      economicCode,
      phone,
      address,
      botBackup: {
        enabled: botEnabled,
        intervalHours: Number(botIntervalHours) || 6,
        telegramEnabled,
        telegramBotToken,
        telegramAdminChatIds,
        baleEnabled,
        baleBotToken,
        baleAdminChatIds,
        lastSentTimestamp: settings.botBackup?.lastSentTimestamp,
      },
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSendBotTestNow = async () => {
    setIsSendingBotTest(true);
    setBotTestResults(null);
    try {
      // Save latest settings first
      updateSettings({
        botBackup: {
          enabled: botEnabled,
          intervalHours: Number(botIntervalHours) || 6,
          telegramEnabled,
          telegramBotToken,
          telegramAdminChatIds,
          baleEnabled,
          baleBotToken,
          baleAdminChatIds,
        },
      });

      const res = await triggerBotBackupNow();
      setBotTestResults(res);
    } catch (err: any) {
      alert(`خطا در ارسال: ${err?.message || err}`);
    } finally {
      setIsSendingBotTest(false);
    }
  };

  const handleAddNewYear = () => {
    if (!newYearInput.trim()) return;
    createNewFinancialYear(newYearInput.trim());
    setNewYearInput('');
    setShowAddYear(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const ok = importDatabaseJSON(content);
        if (ok) {
          alert('کلیه اطلاعات و اسناد با موفقیت بازیابی شد.');
        } else {
          alert('فرمت فایل پشتیبان نامعتبر است.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-600" />
            <span>تنظیمات عمومی، مالیات بر ارزش افزوده، سال مالی و پشتیبان‌گیری</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            پیکربندی هویت تجاری «حسابداری مه»، فعال‌سازی پیش‌فرض ۱۰٪ ارزش افزوده، مدیریت سال‌های مالی و صدور اسناد
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsYearEndModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <Lock className="w-4 h-4" />
            <span>بستن سال مالی و انتقال مانده‌ها</span>
          </button>
          <button
            onClick={() => setIsBackupModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>آرشیو بکاپ‌ها ({autoBackupSnapshots.length})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>مشخصات شرکت و کسب‌وکار</span>
            </div>
            {savedSuccess && (
              <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تنظیمات ذخیره شد</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">نام شرکت / فروشگاه</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 font-medium"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">سال مالی فعال فعلی</label>
              {financialYears.length === 0 ? (
                <div className="flex items-center gap-2 py-1">
                  <span className="text-rose-500 font-bold text-xs">تعریف نشده</span>
                  <button
                    type="button"
                    onClick={() => setShowAddYear(true)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold"
                  >
                    + تعریف سال مالی
                  </button>
                </div>
              ) : (
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 font-mono font-bold text-indigo-900"
                >
                  {financialYears.map((fy) => (
                    <option key={fy.year} value={fy.year}>
                      {fy.title} {fy.isClosed ? '(بسته شده)' : '(فعال)'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Tax Settings Section */}
          <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-indigo-600" />
                <div>
                  <div className="font-bold text-slate-900 text-xs">تنظیمات مالیات بر ارزش افزوده (VAT)</div>
                  <div className="text-[11px] text-slate-500">
                    تعیین فعال یا غیرفعال بودن پیش‌فرض مالیات بر ارزش افزوده هنگام ثبت فاکتورهای جدید
                  </div>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => setEnableTax(!enableTax)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                  enableTax
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {enableTax ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>فعال (پیش‌فرض ۱۰٪)</span>
                  </>
                ) : (
                  <span>غیرفعال (۰٪)</span>
                )}
              </button>
            </div>

            {enableTax && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-100/70">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">درصد پیش‌فرض مالیات و عوارض (%)</label>
                  <input
                    type="number"
                    value={taxRate}
                    min={0}
                    max={100}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-md p-2 font-mono font-bold text-left text-indigo-900"
                  />
                </div>
                <div className="flex flex-col justify-center text-[11px] text-slate-500">
                  <span>هنگام افزودن هر ردیف کالا به فاکتور خرید یا فروش، این درصد به صورت خودکار محاسبه خواهد شد.</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">واحد پول پیش‌فرض</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'تومان' | 'ریال')}
                className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 font-bold"
              >
                <option value="تومان">تومان</option>
                <option value="ریال">ریال</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">شناسه ملی / کد ملی</label>
              <input
                type="text"
                value={nationalCode}
                onChange={(e) => setNationalCode(e.target.value)}
                placeholder="10103284920"
                className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 font-mono text-left"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">کد اقتصادی</label>
              <input
                type="text"
                value={economicCode}
                onChange={(e) => setEconomicCode(e.target.value)}
                placeholder="411111111111"
                className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 font-mono text-left"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">تلفن‌های تماس</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="02188888888"
                className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 font-mono text-left"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">آدرس رسمی شرکت / سربرگ فاکتورها</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="تهران، خیابان ولیعصر..."
                className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
              />
            </div>
          </div>

          {/* Automation Checkbox */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoGenerateVouchers}
                onChange={(e) => setAutoGenerateVouchers(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <div className="font-bold text-slate-800">صدور خودکار اسناد حسابداری دوبل</div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  با فعال بودن این گزینه، هنگام ثبت فاکتورهای فروش، خرید، مرجوعی، تسویه‌ها و تراکنش‌های جاری شرکا، سند دوبل متناظر بلافاصله صادر می‌گردد.
                </div>
              </div>
            </label>
          </div>

          {/* Telegram & Bale Bot Auto-Backup Configuration */}
          <div className="p-4 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/40 rounded-xl border border-indigo-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <span>ارسال خودکار فایل پشتیبان به ربات‌های تلگرام و بله (ویژه مدیران)</span>
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold">
                      بازه ساعتی
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    ارسال منظم فایل JSON کامل دیتابیس به ادمین‌های مشخص‌شده در تلگرام یا پیام‌رسان بله
                  </div>
                </div>
              </div>

              {/* Master Toggle */}
              <button
                type="button"
                onClick={() => setBotEnabled(!botEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                  botEnabled
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {botEnabled ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>فعال</span>
                  </>
                ) : (
                  <span>غیرفعال</span>
                )}
              </button>
            </div>

            {botEnabled && (
              <div className="space-y-4 pt-1">
                {/* Interval Selector */}
                <div className="p-3 bg-white rounded-lg border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="font-bold text-slate-800 text-xs">بازه زمانی ارسال خودکار (ساعتی)</div>
                      <div className="text-[11px] text-slate-500">هر چند ساعت یکبار نسخه پشتیبان ارسال شود؟</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={botIntervalHours}
                      onChange={(e) => setBotIntervalHours(Number(e.target.value))}
                      className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-indigo-900 text-xs focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={1}>هر ۱ ساعت یکبار</option>
                      <option value={2}>هر ۲ ساعت یکبار</option>
                      <option value={4}>هر ۴ ساعت یکبار</option>
                      <option value={6}>هر ۶ ساعت یکبار (پیش‌نهادی)</option>
                      <option value={12}>هر ۱۲ ساعت یکبار</option>
                      <option value={24}>هر ۲۴ ساعت یکبار (روزانه)</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleSendBotTestNow}
                      disabled={isSendingBotTest}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-xs transition"
                    >
                      {isSendingBotTest ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>در حال ارسال...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>ارسال تستی اکنون</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Test Results Banner */}
                {botTestResults && (
                  <div className="p-3 bg-slate-900 text-white rounded-lg text-xs space-y-1.5">
                    <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between">
                      <span>گزارش آخرین ارسال:</span>
                      <button
                        type="button"
                        onClick={() => setBotTestResults(null)}
                        className="text-slate-400 hover:text-white text-[10px]"
                      >
                        بستن
                      </button>
                    </div>
                    {botTestResults.length === 0 ? (
                      <div className="text-amber-300 text-[11px]">هیچ کانال تلگرام یا بله‌ای فعال/تنظیم نشده است.</div>
                    ) : (
                      botTestResults.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <span className={r.success ? 'text-emerald-400' : 'text-rose-400'}>
                              {r.success ? '✓' : '✗'}
                            </span>
                            <span>
                              {r.platform === 'telegram' ? 'ربات تلگرام' : 'ربات بله'} (چت: {r.targetChatId})
                            </span>
                          </span>
                          <span className={r.success ? 'text-emerald-300' : 'text-rose-300'}>
                            {r.message}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Telegram Bot Config */}
                  <div className="p-3.5 bg-white rounded-xl border border-sky-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-[11px]">
                          TG
                        </div>
                        <span className="font-bold text-slate-800 text-xs">تنظیمات ربات تلگرام</span>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={telegramEnabled}
                          onChange={(e) => setTelegramEnabled(e.target.checked)}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span className="text-[11px] font-bold text-slate-700">فعال‌سازی</span>
                      </label>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          توکن ربات تلگرام (Bot Token)
                        </label>
                        <input
                          type="password"
                          value={telegramBotToken}
                          onChange={(e) => setTelegramBotToken(e.target.value)}
                          placeholder="مثال: 123456789:AAHk..."
                          disabled={!telegramEnabled}
                          className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-300 rounded-md p-2 font-mono text-left text-xs"
                        />
                        <div className="text-[10px] text-slate-400 mt-1">
                          از طریق @BotFather در تلگرام ساخته می‌شود.
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          شناسه عددی چت ادمین‌ها (Chat ID)
                        </label>
                        <textarea
                          rows={2}
                          value={telegramAdminChatIds}
                          onChange={(e) => setTelegramAdminChatIds(e.target.value)}
                          placeholder="مثال: 123456789, 987654321 (چند شناسه با کاما یا خط جدید)"
                          disabled={!telegramEnabled}
                          className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-300 rounded-md p-2 font-mono text-left text-xs"
                        />
                        <div className="text-[10px] text-slate-400 mt-1">
                          شناسه چت خود یا ادمین‌ها (از @userinfobot دریافت کنید).
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bale Bot Config */}
                  <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px]">
                          بله
                        </div>
                        <span className="font-bold text-slate-800 text-xs">تنظیمات ربات بله (Bale Messenger)</span>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={baleEnabled}
                          onChange={(e) => setBaleEnabled(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-[11px] font-bold text-slate-700">فعال‌سازی</span>
                      </label>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          توکن ربات بله (Bale Bot Token)
                        </label>
                        <input
                          type="password"
                          value={baleBotToken}
                          onChange={(e) => setBaleBotToken(e.target.value)}
                          placeholder="مثال: 123456789:abcdef..."
                          disabled={!baleEnabled}
                          className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-300 rounded-md p-2 font-mono text-left text-xs"
                        />
                        <div className="text-[10px] text-slate-400 mt-1">
                          از طریق بازوی @BotFather در پیام‌رسان بله دریافت می‌شود.
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          شناسه کاربری/چت ادمین‌های بله (Chat ID)
                        </label>
                        <textarea
                          rows={2}
                          value={baleAdminChatIds}
                          onChange={(e) => setBaleAdminChatIds(e.target.value)}
                          placeholder="مثال: 123456789, 987654321 (چند شناسه با کاما یا خط جدید)"
                          disabled={!baleEnabled}
                          className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-300 rounded-md p-2 font-mono text-left text-xs"
                        />
                        <div className="text-[10px] text-slate-400 mt-1">
                          شناسه عددی حساب کاربری ادمین‌ها در پیام‌رسان بله.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition"
            >
              <Save className="w-4 h-4" />
              <span>ذخیره تغییرات تنظیمات</span>
            </button>
          </div>
        </form>

        {/* Right 1 Col: Financial Years & Backup & Database Maintenance */}
        <div className="space-y-4 text-xs">
          {/* Financial Years Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="font-bold text-slate-800 text-xs flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>مدیریت سال‌های مالی</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddYear(!showAddYear)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>سال جدید</span>
              </button>
            </div>

            {showAddYear && (
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-700 text-[11px]">شماره سال مالی جدید (مثلا ۱۴۰۴)</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newYearInput}
                    onChange={(e) => setNewYearInput(e.target.value)}
                    placeholder="1404"
                    className="flex-1 bg-white border border-slate-300 rounded-md p-1.5 font-mono text-center"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewYear}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-md font-bold"
                  >
                    ثبت
                  </button>
                </div>
              </div>
            )}

            {/* List of Financial Years */}
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {financialYears.length === 0 ? (
                <div className="p-3 text-center text-slate-400 bg-slate-50 rounded-lg text-xs">
                  هیچ سال مالی تعریف نشده است. بر روی «سال جدید» کلیک کنید.
                </div>
              ) : (
                financialYears.map((fy) => {
                  const isActive = fy.year === settings.financialYear;
                  return (
                    <div
                      key={fy.year}
                      className={`flex items-center justify-between p-2 rounded-lg border ${
                        isActive
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-950 font-bold'
                          : 'bg-slate-50 border-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{fy.year}</span>
                        <span className="text-[11px] truncate">{fy.title}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {fy.isClosed ? (
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded font-medium">
                            بسته شده
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
                            فعال
                          </span>
                        )}

                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => switchFinancialYear(fy.year)}
                            className="text-[10px] text-indigo-600 hover:underline px-1 py-0.5"
                          >
                            انتخاب
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsYearEndModalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>عملیات بستن سال مالی استاندارد</span>
            </button>
          </div>

          {/* Backup & Database Maintenance */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="font-bold text-slate-800 text-xs flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>پشتیبان‌گیری هوشمند</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold">
                بکاپ خودکار خروج
              </span>
            </div>
            
            <p className="text-slate-500 text-[11px] leading-relaxed">
              سامانه قبل از بسته شدن تب یا خروج از برنامه، یک نسخه از دیتابیس را در آرشیو ذخیره می‌کند تا بدون دغدغه بتوانید در مراجعات بعدی آن را بازیابی کنید.
            </p>

            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition"
            >
              <History className="w-4 h-4" />
              <span>مدیریت آرشیو و بازیابی بکاپ‌ها ({autoBackupSnapshots.length})</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={exportDatabaseJSON}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg font-bold transition text-[11px]"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>دانلود JSON</span>
              </button>

              <label className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg font-bold cursor-pointer transition text-[11px]">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>بارگذاری فایل</span>
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-rose-200 shadow-xs p-4 space-y-2.5">
            <div className="font-bold text-rose-800 text-xs flex items-center gap-1.5 border-b border-rose-100 pb-2">
              <RefreshCw className="w-4 h-4 text-rose-600" />
              <span>بازنشانی به اطلاعات اولیه</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              بازگرداندن کلیه اطلاعات به حالت پیش‌فرض کارخانه (یک نسخه بکاپ ایمنی قبل از بازنشانی ذخیره خواهد شد).
            </p>
            <button
              onClick={() => {
                if (window.confirm('آیا از بازنشانی کلیه اطلاعات برنامه به حالت استاندارد اولیه اطمینان دارید؟ یک نسخه پشتیبان قبل از این عمل ثبت خواهد شد.')) {
                  resetToDefaultData();
                  alert('اطلاعات با موفقیت بازنشانی شد.');
                }
              }}
              className="w-full py-2 px-3 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-md font-bold transition"
            >
              بازنشانی دیتابیس
            </button>
          </div>
        </div>
      </div>

      {/* Backup Modal */}
      {isBackupModalOpen && (
        <BackupManagerModal onClose={() => setIsBackupModalOpen(false)} />
      )}

      {/* Year-End Closing Modal */}
      {isYearEndModalOpen && (
        <YearEndClosingModal onClose={() => setIsYearEndModalOpen(false)} />
      )}
    </div>
  );
};


