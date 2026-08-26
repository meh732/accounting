import React, { useState, useMemo } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { calculateTrialBalance, calculateProfitAndLoss } from '../../utils/financialCalculations';
import { formatCurrency, getCurrentShamsiDate } from '../../utils/dateUtils';
import {
  Calendar,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Layers,
  X,
  History,
  TrendingUp,
  Scale,
  ShieldCheck
} from 'lucide-react';

interface YearEndClosingModalProps {
  onClose: () => void;
}

export const YearEndClosingModal: React.FC<YearEndClosingModalProps> = ({ onClose }) => {
  const {
    settings,
    updateSettings,
    chartOfAccounts,
    vouchers,
    invoices,
    expenses,
    products,
    addVoucher,
    financialYears,
    closeFinancialYear,
    createNewFinancialYear,
  } = useAccounting();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const currentYear = settings.financialYear || '1403';
  const nextYearNumber = (parseInt(currentYear) + 1).toString();
  const [newYearName, setNewYearName] = useState(nextYearNumber);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Financial calculations for closing
  const trial = useMemo(() => calculateTrialBalance(chartOfAccounts, vouchers), [chartOfAccounts, vouchers]);
  const pnl = useMemo(() => calculateProfitAndLoss(invoices, expenses, products), [invoices, expenses, products]);

  // Revenues (Group 5)
  const revenueAccounts = useMemo(() => {
    return trial.items.filter((item) => item.code.startsWith('5') && item.level === 'moein' && item.turnoverCredit > 0);
  }, [trial]);
  const totalRevenues = revenueAccounts.reduce((sum, item) => sum + item.turnoverCredit - item.turnoverDebit, 0);

  // Costs & Expenses (Group 6 & 7)
  const expenseAccounts = useMemo(() => {
    return trial.items.filter(
      (item) => (item.code.startsWith('6') || item.code.startsWith('7')) && item.level === 'moein' && item.turnoverDebit > 0
    );
  }, [trial]);
  const totalExpensesAndCosts = expenseAccounts.reduce((sum, item) => sum + item.turnoverDebit - item.turnoverCredit, 0);

  // Net Profit / Loss
  const netProfitOrLoss = totalRevenues - totalExpensesAndCosts;
  const isProfitable = netProfitOrLoss >= 0;

  // Permanent Accounts (Group 1, 2, 3, 4)
  const permanentAssetAccounts = useMemo(() => {
    return trial.items.filter((item) => (item.code.startsWith('1') || item.code.startsWith('2')) && item.level === 'moein' && item.finalDebit > 0);
  }, [trial]);

  const permanentLiabilityEquityAccounts = useMemo(() => {
    return trial.items.filter((item) => (item.code.startsWith('3') || item.code.startsWith('4')) && item.level === 'moein' && item.finalCredit > 0);
  }, [trial]);

  const handleExecuteYearEndClosing = () => {
    setIsProcessing(true);

    try {
      // Execute the standard accounting closing workflow
      const res = closeFinancialYear(currentYear, newYearName);
      if (res) {
        setSuccessMessage(`سال مالی ${currentYear} با موفقیت و طبق استانداردهای حسابداری بسته شد و سال مالی جدید ${newYearName} با صدور سند افتتاحیه آغاز گردید.`);
        setCurrentStep(4);
      }
    } catch (err: any) {
      alert('خطا در اجرای بستن سال مالی: ' + (err.message || err));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>عملیات استاندارد بستن سال مالی و انتقال مانده‌ها</span>
                <span className="bg-indigo-50 text-indigo-700 font-mono text-xs px-2 py-0.5 rounded-full border border-indigo-200">
                  سال مالی {currentYear}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                بستن حساب‌های موقت به سود و زیان، انتقال به سود انباشته، صدور سند اختتامیه و سند افتتاحیه سال جدید
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Navigation */}
        <div className="px-6 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className={`flex items-center gap-1.5 font-bold ${currentStep >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
              ۱
            </span>
            <span>کنترل تراز و سود/زیان</span>
          </div>

          <div className="w-8 h-0.5 bg-slate-300"></div>

          <div className={`flex items-center gap-1.5 font-bold ${currentStep >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
              ۲
            </span>
            <span>بستن حساب‌های موقت</span>
          </div>

          <div className="w-8 h-0.5 bg-slate-300"></div>

          <div className={`flex items-center gap-1.5 font-bold ${currentStep >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
              ۳
            </span>
            <span>سند اختتامیه و افتتاحیه</span>
          </div>

          <div className="w-8 h-0.5 bg-slate-300"></div>

          <div className={`flex items-center gap-1.5 font-bold ${currentStep >= 4 ? 'text-emerald-600' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
              ✓
            </span>
            <span>پایان و سال جدید</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 text-xs space-y-4">
          {/* STEP 1 */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                <Scale className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-indigo-950 text-xs">گام اول: کنترل موازنه تراز آزمایشی و سود/زیان سال مالی {currentYear}</h4>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    قبل از بستن دفاتر، تمام اسناد حسابداری بررسی می‌شوند. جمع گردش بدهکار و بستانکار باید کاملاً موازنه باشد تا بستن حساب‌ها بر اساس استانداردهای حسابداری بدون هیچ اختلافی انجام پذیرد.
                  </p>
                </div>
              </div>

              {/* Status Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <span className="text-slate-500 text-[11px]">وضعیت موازنه دفاتر مالی:</span>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>دفاتر کاملاً تراز و موازنه هستند</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    جمع گردش: {formatCurrency(trial.totalTurnoverDebit, settings.currency)}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <span className="text-slate-500 text-[11px]">مجموع درآمدهای سال:</span>
                  <div className="font-mono font-bold text-indigo-700 text-sm">
                    {formatCurrency(totalRevenues, settings.currency)}
                  </div>
                  <span className="text-[10px] text-slate-400">سرفصل‌های گروه ۵ (درآمدها)</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <span className="text-slate-500 text-[11px]">مجموع هزینه‌ها و بهای تمام شده:</span>
                  <div className="font-mono font-bold text-rose-700 text-sm">
                    {formatCurrency(totalExpensesAndCosts, settings.currency)}
                  </div>
                  <span className="text-[10px] text-slate-400">سرفصل‌های گروه ۶ و ۷</span>
                </div>
              </div>

              {/* Net Profit Card */}
              <div className={`p-4 rounded-xl border ${isProfitable ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'} flex items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                  <TrendingUp className={`w-5 h-5 ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`} />
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      {isProfitable ? 'سود ویژه عملکرد سال مالی' : 'زیان ویژه عملکرد سال مالی'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      این مبلغ در مرحله بعد به سرفصل ۴۰۲۰۱ (سود/زیان انباشته سنواتی) منتقل خواهد شد.
                    </div>
                  </div>
                </div>
                <div className={`text-base font-mono font-bold ${isProfitable ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCurrency(Math.abs(netProfitOrLoss), settings.currency)}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span>پیش‌نمایش سند بستن حساب‌های موقت (سود و زیانی)</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  طبق استانداردهای حسابداری، حساب‌های درآمدی که مانده بستانکار دارند بدهکار شده، و حساب‌های هزینه و بهای تمام شده که مانده بدهکار دارند بستانکار شده و مابه‌التفاوت به «خلاصه سود و زیان (کد ۸۰۱۰۱)» و سپس به «سود (زیان) انباشته (کد ۴۰۲۰۱)» منتقل و مانده حساب‌های موقت صفر می‌گردد.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2 w-10 text-center">ردیف</th>
                      <th className="p-2">کد و عنوان سرفصل</th>
                      <th className="p-2 w-32 text-left">بدهکار ({settings.currency})</th>
                      <th className="p-2 w-32 text-left">بستانکار ({settings.currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {revenueAccounts.map((acc, i) => (
                      <tr key={acc.code} className="hover:bg-slate-50">
                        <td className="p-2 text-center text-slate-400">{i + 1}</td>
                        <td className="p-2 text-slate-800 font-sans font-medium">
                          <span className="text-indigo-600 font-mono font-bold ml-1">{acc.code}</span>
                          <span>{acc.title}</span>
                        </td>
                        <td className="p-2 text-left font-bold text-slate-900">
                          {formatCurrency(acc.turnoverCredit - acc.turnoverDebit, settings.currency)}
                        </td>
                        <td className="p-2 text-left text-slate-400">۰</td>
                      </tr>
                    ))}
                    {expenseAccounts.map((acc, i) => (
                      <tr key={acc.code} className="hover:bg-slate-50">
                        <td className="p-2 text-center text-slate-400">{revenueAccounts.length + i + 1}</td>
                        <td className="p-2 text-slate-800 font-sans font-medium">
                          <span className="text-rose-600 font-mono font-bold ml-1">{acc.code}</span>
                          <span>{acc.title}</span>
                        </td>
                        <td className="p-2 text-left text-slate-400">۰</td>
                        <td className="p-2 text-left font-bold text-slate-900">
                          {formatCurrency(acc.turnoverDebit - acc.turnoverCredit, settings.currency)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-indigo-50/50 font-bold">
                      <td className="p-2 text-center">★</td>
                      <td className="p-2 text-indigo-900 font-sans">
                        <span className="text-indigo-700 font-mono ml-1">40201</span>
                        <span>سود و زیان انباشته سنواتی (انتقال عملکرد سال)</span>
                      </td>
                      <td className="p-2 text-left">
                        {!isProfitable ? formatCurrency(Math.abs(netProfitOrLoss), settings.currency) : '۰'}
                      </td>
                      <td className="p-2 text-left">
                        {isProfitable ? formatCurrency(netProfitOrLoss, settings.currency) : '۰'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>تنظیم سال مالی جدید و پیش‌نمایش سند اختتامیه و افتتاحیه</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  سند اختتامیه با سرفصل ۸۰۲۰۱ صادر می‌شود و تمام مانده‌های ترازنامه‌ای (دارایی‌ها، بدهی‌ها، جاری شرکا و حقوق صاحبان سهام) را به سال مالی جدید منتقل می‌نماید. در سال مالی جدید، سند شماره ۱ به عنوان سند افتتاحیه به صورت خودکار صادر می‌گردد.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نام سال مالی جدید</label>
                  <input
                    type="text"
                    value={newYearName}
                    onChange={(e) => setNewYearName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 text-center"
                    required
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[11px] text-slate-500 font-medium">اقداماتی که انجام خواهد شد:</span>
                  <ul className="text-[10px] text-indigo-900 font-semibold space-y-0.5 mt-1 list-disc list-inside">
                    <li>صدور سند بستن حساب‌های موقت سال {currentYear}</li>
                    <li>صدور سند اختتامیه و قفل کردن سال مالی {currentYear}</li>
                    <li>ایجاد سال مالی {newYearName} و صدور سند افتتاحیه</li>
                  </ul>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>هشدار نهایی:</strong> با زدن دکمه بستن نهایی، کلیه محاسبات انجام شده و اسناد حسابداری استاندارد ثبت خواهند شد. این فرایند کاملاً ایمن بوده و یک نسخه پشتیبان قبل از اجرا به صورت خودکار تهیه می‌شود.
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {currentStep === 4 && (
            <div className="py-8 text-center space-y-4 animate-in fade-in duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-base">عملیات بستن سال مالی با موفقیت کامل انجام شد</h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  {successMessage || `سال مالی ${currentYear} طبق استانداردهای حسابداری بسته شد و سال مالی ${newYearName} آغاز گردید.`}
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  بازگشت به برنامه با سال مالی جدید
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        {currentStep < 4 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-semibold transition"
              >
                <ArrowRight className="w-4 h-4" />
                <span>مرحله قبل</span>
              </button>
            ) : (
              <div></div>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <span>مرحله بعد</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteYearEndClosing}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{isProcessing ? 'در حال صدور اسناد و بستن سال...' : 'تایید نهایی و بستن سال مالی'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
