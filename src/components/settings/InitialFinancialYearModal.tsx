import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import {
  Calendar,
  Building2,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { getCurrentShamsiDate } from '../../utils/dateUtils';

interface InitialFinancialYearModalProps {
  isOpen: boolean;
}

export const InitialFinancialYearModal: React.FC<InitialFinancialYearModalProps> = ({ isOpen }) => {
  const { settings, updateSettings, createNewFinancialYear } = useAccounting();

  // Extract current shamsi year as a smart default placeholder
  const currentShamsiYear = getCurrentShamsiDate().split('/')[0] || '1403';

  const [companyName, setCompanyName] = useState(settings.companyName || 'حسابداری مه');
  const [year, setYear] = useState(currentShamsiYear);
  const [title, setTitle] = useState(`سال مالی ${currentShamsiYear} (فعال)`);
  const [startDate, setStartDate] = useState(`${currentShamsiYear}/01/01`);
  const [endDate, setEndDate] = useState(`${currentShamsiYear}/12/29`);
  const [currency, setCurrency] = useState<'تومان' | 'ریال'>(settings.currency || 'تومان');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleYearChange = (val: string) => {
    const cleanYear = val.trim();
    setYear(cleanYear);
    if (cleanYear.length >= 2) {
      setTitle(`سال مالی ${cleanYear} (فعال)`);
      setStartDate(`${cleanYear}/01/01`);
      setEndDate(`${cleanYear}/12/29`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('لطفاً نام کسب‌وکار یا شرکت را وارد فرمایید.');
      return;
    }
    if (!year.trim() || year.trim().length < 2) {
      setError('لطفاً سال مالی معتبر (مانند ۱۴۰۳ یا ۱۴۰۴) را وارد فرمایید.');
      return;
    }

    setError('');

    // Create initial financial year
    createNewFinancialYear(year.trim(), title.trim(), startDate.trim(), endDate.trim());

    // Update settings
    updateSettings({
      companyName: companyName.trim(),
      financialYear: year.trim(),
      currency,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white p-5">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">راه‌اندازی اولیه و تعریف سال مالی</h2>
              <p className="text-xs text-indigo-200">
                لطفاً سال مالی و مشخصات اولیه را جهت شروع کار با سامانه تعریف فرمایید
              </p>
            </div>
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-bold text-xs">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>نام شرکت / فروشگاه / واحد تجاری</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="مثال: شرکت بازرگانی مه"
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 font-bold text-slate-800 outline-hidden"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>سال مالی مورد نظر (۴ رقم)</span>
                </label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => handleYearChange(e.target.value)}
                  placeholder="مثال: 1403 یا 1404"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 font-mono font-bold text-indigo-900 text-center text-sm outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-indigo-600" />
                  <span>واحد پول اصلی سامانه</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'تومان' | 'ریال')}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 font-bold text-slate-800 outline-hidden"
                >
                  <option value="تومان">تومان (پیش‌نهادی)</option>
                  <option value="ریال">ریال</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">عنوان دوره مالی</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">تاریخ شروع دوره</label>
                <input
                  type="text"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-center outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">تاریخ پایان دوره</label>
                <input
                  type="text"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-center outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center gap-2 text-indigo-900 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              سرفصل‌های استاندارد حسابداری به‌طور خودکار آماده ثبت و صدور اسناد خواهند بود.
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/30 transition"
            >
              <span>افتتاح و شروع فعالیت با سال مالی {year || '...'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
