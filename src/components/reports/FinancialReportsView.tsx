import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import {
  calculateTrialBalance,
  calculateProfitAndLoss,
  calculateProductCardex,
  calculateBankCardex,
  calculateContactCardex,
} from '../../utils/financialCalculations';
import { formatCurrency, getCurrentShamsiDate } from '../../utils/dateUtils';
import {
  BarChart3,
  TrendingUp,
  Printer,
  Scale,
  Layers,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

export const FinancialReportsView: React.FC = () => {
  const {
    chartOfAccounts,
    vouchers,
    invoices,
    expenses,
    products,
    bankAccounts,
    contacts,
    financialTransactions,
    cheques,
    settings,
    runSampleAccountingScenario,
    clearAllDataToZero,
  } = useAccounting();

  const [activeReportTab, setActiveReportTab] = useState<
    'trial_balance' | 'profit_loss' | 'balance_sheet' | 'audit_reconciliation'
  >('trial_balance');
  const [trialLevelFilter, setTrialLevelFilter] = useState<'all' | 'kol' | 'moein'>('all');
  const [hideZeroBalances, setHideZeroBalances] = useState(true);
  const [scenarioNotice, setScenarioNotice] = useState<string | null>(null);

  const trial = calculateTrialBalance(chartOfAccounts, vouchers);
  const pnl = calculateProfitAndLoss(invoices, expenses, products);

  // Filter trial balance items
  const filteredTrialItems = trial.items.filter((item) => {
    if (trialLevelFilter !== 'all' && item.level !== trialLevelFilter) return false;
    if (
      hideZeroBalances &&
      item.turnoverDebit === 0 &&
      item.turnoverCredit === 0 &&
      item.finalDebit === 0 &&
      item.finalCredit === 0
    ) {
      return false;
    }
    return true;
  });

  // Live Automated Audit Checks
  const unbalancedVouchers = vouchers.filter((v) => {
    const td = v.totalDebit ?? v.items.reduce((s, i) => s + i.debit, 0);
    const tc = v.totalCredit ?? v.items.reduce((s, i) => s + i.credit, 0);
    return td !== tc;
  });
  const productAudits = products.map((p) => {
    const cardex = calculateProductCardex(p, invoices);
    return {
      product: p,
      cardexStock: cardex.currentStock,
      isMatched: p.stockQuantity === cardex.currentStock,
      totalIn: cardex.totalInQty,
      totalOut: cardex.totalOutQty,
    };
  });
  const bankAudits = bankAccounts.map((b) => {
    const cardex = calculateBankCardex(b, invoices, expenses, vouchers, financialTransactions, cheques);
    return {
      bank: b,
      cardexBalance: cardex.currentBalance,
      totalDebit: cardex.totalInflow,
      totalCredit: cardex.totalOutflow,
      rowCount: cardex.rows.length,
    };
  });
  const contactAudits = contacts.map((c) => {
    const cardex = calculateContactCardex(c, invoices, vouchers, expenses, financialTransactions, cheques);
    return {
      contact: c,
      finalBalance: cardex.finalBalance,
      finalBalanceType: cardex.finalBalanceType,
      totalDebit: cardex.totalDebit,
      totalCredit: cardex.totalCredit,
      rowCount: cardex.rows.length,
    };
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>گزارشات مالی، سود و زیان و تست سلامت جامع حسابداری</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            تراز آزمایشی ۴ ستونی، صورت سود و زیان دوره‌ای، ترازنامه و مغایرت‌گیری خودکار کلیه زیرسیستم‌ها
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              runSampleAccountingScenario();
              setScenarioNotice('چرخه کامل حسابداری (کالا، خرید، فروش، انبارگردانی، دریافت/پرداخت، هزینه و اسناد) با موفقیت بازنشانی و بارگذاری شد.');
              setTimeout(() => setScenarioNotice(null), 5000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>بارگذاری چرخه کامل نمونه حسابداری</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>چاپ / خروجی PDF</span>
          </button>
        </div>
      </div>

      {scenarioNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{scenarioNotice}</span>
        </div>
      )}

      {/* Tabs & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 space-y-3 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveReportTab('trial_balance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeReportTab === 'trial_balance'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                <span>تراز آزمایشی دفاتر (۴ ستونی)</span>
              </div>
            </button>

            <button
              onClick={() => setActiveReportTab('profit_loss')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeReportTab === 'profit_loss'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>صورت سود و زیان (P&L)</span>
              </div>
            </button>

            <button
              onClick={() => setActiveReportTab('balance_sheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeReportTab === 'balance_sheet'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>خلاصه ترازنامه و دارایی‌ها</span>
              </div>
            </button>

            <button
              onClick={() => setActiveReportTab('audit_reconciliation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeReportTab === 'audit_reconciliation'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>تست سلامت و مغایرت‌گیری جامع (انبار، بانک، مشتریان و اسناد)</span>
              </div>
            </button>
          </div>

          {activeReportTab === 'trial_balance' && (
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <label className="text-slate-500 font-medium">سطح سرفصل:</label>
                <select
                  value={trialLevelFilter}
                  onChange={(e) => setTrialLevelFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs"
                >
                  <option value="all">همه سطوح (کل و معین)</option>
                  <option value="kol">سطح کل</option>
                  <option value="moein">سطح معین</option>
                </select>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={hideZeroBalances}
                  onChange={(e) => setHideZeroBalances(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>مخفی کردن حساب‌های بدون گردش</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Printable Report Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        {/* Printable Header */}
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-slate-800">{settings.companyName}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {activeReportTab === 'trial_balance'
                ? 'تراز آزمایشی چهار ستونی گردش و مانده حساب‌ها'
                : activeReportTab === 'profit_loss'
                ? 'صورت سود و زیان عملکرد مالی دوره‌ای'
                : activeReportTab === 'balance_sheet'
                ? 'خلاصه ترازنامه و وضعیت دارایی‌ها و بدهی‌ها'
                : 'گزارش ممیزی، تست سلامت و مغایرت‌گیری جامع انبار، بانک و اشخاص'}
            </div>
          </div>
          <div className="text-left text-xs text-slate-500 font-mono">
            <div>تاریخ گزارش: {getCurrentShamsiDate()}</div>
            <div>واحد پول: {settings.currency}</div>
          </div>
        </div>

        {/* 1. Trial Balance Table */}
        {activeReportTab === 'trial_balance' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th rowSpan={2} className="py-2 px-2.5 border-l border-slate-200 w-24 text-center font-mono">کد حساب</th>
                    <th rowSpan={2} className="py-2 px-2.5 border-l border-slate-200 min-w-[200px]">شرح سرفصل حسابداری</th>
                    <th rowSpan={2} className="py-2 px-2.5 border-l border-slate-200 w-20 text-center">سطح</th>
                    <th colSpan={2} className="py-1 px-2.5 border-l border-slate-200 text-center bg-slate-200/70">گردش عملیات دوره</th>
                    <th colSpan={2} className="py-1 px-2.5 text-center bg-slate-200/70">مانده نهایی پایان دوره</th>
                  </tr>
                  <tr className="border-t border-slate-200 bg-slate-50 text-[11px]">
                    <th className="py-1.5 px-2.5 border-l border-slate-200 text-left w-32">بدهکار</th>
                    <th className="py-1.5 px-2.5 border-l border-slate-200 text-left w-32">بستانکار</th>
                    <th className="py-1.5 px-2.5 border-l border-slate-200 text-left w-32">بدهکار</th>
                    <th className="py-1.5 px-2.5 text-left w-32">بستانکار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {filteredTrialItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                        گردش حسابی برای نمایش در تراز یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredTrialItems.map((item) => {
                      const isGroup = item.level === 'group';
                      const isKol = item.level === 'kol';
                      const rowBg = isGroup
                        ? 'bg-slate-100/80 font-bold text-slate-900'
                        : isKol
                        ? 'bg-slate-50/50 font-semibold text-slate-800'
                        : 'text-slate-700';

                      return (
                        <tr key={item.code} className={`${rowBg} hover:bg-indigo-50/20 transition`}>
                          <td className="py-1.5 px-2.5 border-l border-slate-200 text-center">{item.code}</td>
                          <td className="py-1.5 px-2.5 border-l border-slate-200 font-sans">
                            <span className={isKol ? 'pr-4' : item.level === 'moein' ? 'pr-8' : ''}>
                              {item.title}
                            </span>
                          </td>
                          <td className="py-1.5 px-2.5 border-l border-slate-200 text-center font-sans text-[11px] text-slate-500">
                            {item.level === 'group' ? 'گروه' : item.level === 'kol' ? 'کل' : 'معین'}
                          </td>
                          <td className="py-1.5 px-2.5 border-l border-slate-200 text-left">
                            {item.turnoverDebit > 0 ? item.turnoverDebit.toLocaleString() : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 border-l border-slate-200 text-left">
                            {item.turnoverCredit > 0 ? item.turnoverCredit.toLocaleString() : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 border-l border-slate-200 text-left text-indigo-700">
                            {item.finalDebit > 0 ? item.finalDebit.toLocaleString() : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 text-left text-emerald-700">
                            {item.finalCredit > 0 ? item.finalCredit.toLocaleString() : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-mono font-bold text-xs">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3 text-right font-sans">
                      جمع کل تراز آزمایشی:
                    </td>
                    <td className="py-2.5 px-2.5 text-left border-l border-slate-700">
                      {trial.totalTurnoverDebit.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2.5 text-left border-l border-slate-700">
                      {trial.totalTurnoverCredit.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2.5 text-left border-l border-slate-700 text-indigo-300">
                      {trial.totalFinalDebit.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2.5 text-left text-emerald-300">
                      {trial.totalFinalCredit.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Trial Status Footer */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                {trial.isBalanced ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>تراز آزمایشی کاملاً متعادل و بدون مغایرت است. (اختلاف = ۰)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>تراز دارای عدم تعادل است! لطفاً اسناد ناتراز را بازبینی فرمایید.</span>
                  </div>
                )}
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                تعداد کل اسناد موثر: {vouchers.length} سند مالی
              </div>
            </div>
          </div>
        )}

        {/* 2. Profit and Loss Report */}
        {activeReportTab === 'profit_loss' && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">شرح سرفصل سود و زیانی</th>
                    <th className="py-2.5 px-3 text-left w-48 font-mono">مبلغ جزئی ({settings.currency})</th>
                    <th className="py-2.5 px-3 text-left w-48 font-mono">مبلغ کل ({settings.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {/* Revenue */}
                  <tr className="bg-slate-50/60 font-bold text-slate-800">
                    <td className="py-2 px-3">درآمد ناخالص حاصل از فروش کالا و خدمات</td>
                    <td className="py-2 px-3 text-left font-mono"></td>
                    <td className="py-2 px-3 text-left font-mono text-slate-900">
                      {pnl.grossSales.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="text-slate-600">
                    <td className="py-1.5 px-3 pr-6">کسر می‌شود: برگشت از فروش</td>
                    <td className="py-1.5 px-3 text-left font-mono text-rose-600">
                      ({pnl.salesReturns.toLocaleString()})
                    </td>
                    <td></td>
                  </tr>
                  <tr className="text-slate-600">
                    <td className="py-1.5 px-3 pr-6">کسر می‌شود: تخفیفات اعطایی فروش</td>
                    <td className="py-1.5 px-3 text-left font-mono text-rose-600">
                      ({pnl.salesDiscounts.toLocaleString()})
                    </td>
                    <td></td>
                  </tr>
                  <tr className="bg-indigo-50/50 font-bold text-indigo-900 border-t border-b border-indigo-100">
                    <td className="py-2 px-3">فروش خالص دوره</td>
                    <td></td>
                    <td className="py-2 px-3 text-left font-mono">{pnl.netSales.toLocaleString()}</td>
                  </tr>

                  {/* COGS */}
                  <tr className="text-slate-700">
                    <td className="py-2 px-3">کسر می‌شود: بهای تمام شده کالای فروش رفته (COGS)</td>
                    <td></td>
                    <td className="py-2 px-3 text-left font-mono text-rose-600">
                      ({pnl.cogs.toLocaleString()})
                    </td>
                  </tr>

                  {/* Inventory Adjustments (Stocktaking Surplus/Deficit) */}
                  {pnl.inventoryAdjustmentNet !== 0 && (
                    <tr className="text-slate-700">
                      <td className="py-2 px-3">
                        {pnl.inventoryAdjustmentNet > 0
                          ? 'اضافه می‌شود: مازاد انبارگردانی (درآمد تعدیل موجودی انبار)'
                          : 'کسر می‌شود: کسری انبارگردانی (هزینه تعدیل موجودی انبار)'}
                      </td>
                      <td></td>
                      <td
                        className={`py-2 px-3 text-left font-mono ${
                          pnl.inventoryAdjustmentNet > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {pnl.inventoryAdjustmentNet > 0
                          ? `+${pnl.inventoryAdjustmentNet.toLocaleString()}`
                          : `(${Math.abs(pnl.inventoryAdjustmentNet).toLocaleString()})`}
                      </td>
                    </tr>
                  )}

                  {/* Gross Profit */}
                  <tr className="bg-emerald-50/60 font-bold text-emerald-900 border-t border-b border-emerald-100">
                    <td className="py-2.5 px-3">سود (زیان) ناخالص عملیاتی</td>
                    <td></td>
                    <td className="py-2.5 px-3 text-left font-mono text-sm">
                      {pnl.grossProfit.toLocaleString()}
                    </td>
                  </tr>

                  {/* Operating Expenses */}
                  <tr className="bg-slate-50/60 font-bold text-slate-800">
                    <td className="py-2 px-3">هزینه‌های عمومی، اداری و توزیع:</td>
                    <td></td>
                    <td className="py-2 px-3 text-left font-mono text-rose-600">
                      ({pnl.totalOperatingExpenses.toLocaleString()})
                    </td>
                  </tr>
                  {pnl.expenseDetails.map((exp, idx) => (
                    <tr key={idx} className="text-slate-600 text-[11px]">
                      <td className="py-1 px-3 pr-6">• {exp.category}</td>
                      <td className="py-1 px-3 text-left font-mono">{exp.amount.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  ))}

                  {/* Net Profit */}
                  <tr className="bg-slate-900 text-white font-bold text-sm">
                    <td className="py-3 px-3">سود (زیان) خالص دوره مالی</td>
                    <td></td>
                    <td className={`py-3 px-3 text-left font-mono ${pnl.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {pnl.netProfit.toLocaleString()} {settings.currency}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Balance Sheet Summary */}
        {activeReportTab === 'balance_sheet' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assets */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1.5 flex items-center justify-between">
                <span>دارایی‌ها (Assets)</span>
                <span className="text-indigo-600">سمت راست ترازنامه</span>
              </div>
              <div className="space-y-1.5 text-xs font-medium">
                {trial.items
                  .filter((i) => i.code.startsWith('10') && i.finalDebit > 0)
                  .map((i) => (
                    <div key={i.code} className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-700">{i.title}</span>
                      <span className="font-mono font-bold text-slate-900">{i.finalDebit.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Liabilities and Equity */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1.5 flex items-center justify-between">
                <span>بدهی‌ها و سرمایه (Liabilities & Equity)</span>
                <span className="text-emerald-600">سمت چپ ترازنامه</span>
              </div>
              <div className="space-y-1.5 text-xs font-medium">
                {trial.items
                  .filter((i) => (i.code.startsWith('30') || i.code.startsWith('40')) && i.finalCredit > 0)
                  .map((i) => (
                    <div key={i.code} className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-700">{i.title}</span>
                      <span className="font-mono font-bold text-slate-900">{i.finalCredit.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. System Health & Comprehensive Audit / Reconciliation */}
        {activeReportTab === 'audit_reconciliation' && (
          <div className="space-y-5 text-xs">
            {/* Summary Banner */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-emerald-950 text-sm">
                    نتیجه تست خودکار یکپارچگی حسابداری، انبار، بانک و اشخاص
                  </div>
                  <div className="text-emerald-800 mt-0.5">
                    تمامی اسناد دوبل ({vouchers.length} سند)، کاردکس کالاها ({products.length} کالا)، کاردکس بانک‌ها ({bankAccounts.length} حساب) و صورتحساب اشخاص ({contacts.length} شخص) بررسی و راستی‌آزمایی شدند.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 no-print">
                <button
                  type="button"
                  onClick={() => {
                    clearAllDataToZero();
                    setScenarioNotice('کلیه اطلاعات پاک شد و سیستم آماده شروع از صفر مطلق است.');
                    setTimeout(() => setScenarioNotice(null), 4000);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>صفر کردن اطلاعات (شروع خام)</span>
                </button>
              </div>
            </div>

            {/* 4 Check Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <div className="text-slate-500 mb-1">۱. تراز اسناد حسابداری دوبل</div>
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  {unbalancedVouchers.length === 0 && trial.isBalanced ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">۱۰۰٪ تراز ({vouchers.length} سند)</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span className="text-rose-700">{unbalancedVouchers.length} سند ناتراز</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <div className="text-slate-500 mb-1">۲. تطابق انبار و کاردکس کالا</div>
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  {productAudits.every((pa) => pa.isMatched) ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">منطبق ({products.length} کالا)</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span className="text-rose-700">دارای اختلاف کاردکس</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <div className="text-slate-500 mb-1">۳. نقدینگی بانک و صندوق</div>
                <div className="font-bold text-indigo-700 font-mono">
                  {formatCurrency(
                    bankAudits.reduce((s, b) => s + b.cardexBalance, 0),
                    settings.currency
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <div className="text-slate-500 mb-1">۴. سود (زیان) خالص دوره</div>
                <div className={`font-bold font-mono ${pnl.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCurrency(pnl.netProfit, settings.currency)}
                </div>
              </div>
            </div>

            {/* Detailed Audit Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Inventory & Stocktaking Audit */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800">
                  وضعیت موجودی کالاها و تطابق با کاردکس انبار و انبارگردانی
                </div>
                <table className="w-full text-right text-[11px]">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-2.5">نام کالا</th>
                      <th className="py-1.5 px-2.5 text-center">موجودی فعلی</th>
                      <th className="py-1.5 px-2.5 text-center">کاردکس</th>
                      <th className="py-1.5 px-2.5 text-center">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {productAudits.map((pa) => (
                      <tr key={pa.product.id}>
                        <td className="py-1.5 px-2.5 font-sans font-semibold text-slate-800">{pa.product.title || pa.product.name}</td>
                        <td className="py-1.5 px-2.5 text-center font-bold">{pa.product.stockQuantity}</td>
                        <td className="py-1.5 px-2.5 text-center">{pa.cardexStock}</td>
                        <td className="py-1.5 px-2.5 text-center font-sans">
                          {pa.isMatched ? (
                            <span className="text-emerald-700 font-bold">دقیق و منطبق</span>
                          ) : (
                            <span className="text-rose-600 font-bold">مغایرت</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Contacts & Customers Audit */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800">
                  گزارش وضعیت حساب مشتریان و تامین‌کنندگان (کاردکس اشخاص)
                </div>
                <table className="w-full text-right text-[11px]">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-2.5">نام طرف حساب</th>
                      <th className="py-1.5 px-2.5 text-left">گردش بدهکار</th>
                      <th className="py-1.5 px-2.5 text-left">گردش بستانکار</th>
                      <th className="py-1.5 px-2.5 text-left">مانده نهایی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {contactAudits.map((ca) => (
                      <tr key={ca.contact.id}>
                        <td className="py-1.5 px-2.5 font-sans font-semibold text-slate-800">{ca.contact.name}</td>
                        <td className="py-1.5 px-2.5 text-left text-rose-600">{ca.totalDebit.toLocaleString()}</td>
                        <td className="py-1.5 px-2.5 text-left text-emerald-600">{ca.totalCredit.toLocaleString()}</td>
                        <td className="py-1.5 px-2.5 text-left font-bold">
                          {ca.finalBalance.toLocaleString()} ({ca.finalBalanceType})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bank Accounts Audit */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800">
                گزارش گردش و مانده حساب‌های بانکی، صندوق و کارتخوان (کاردکس بانک)
              </div>
              <table className="w-full text-right text-[11px]">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-2.5">عنوان حساب / بانک</th>
                    <th className="py-1.5 px-2.5 text-left">جمع ورودی (بدهکار)</th>
                    <th className="py-1.5 px-2.5 text-left">جمع خروجی (بستانکار)</th>
                    <th className="py-1.5 px-2.5 text-left">موجودی قطعی کاردکس</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {bankAudits.map((ba) => (
                    <tr key={ba.bank.id}>
                      <td className="py-1.5 px-2.5 font-sans font-semibold text-slate-800">{ba.bank.title}</td>
                      <td className="py-1.5 px-2.5 text-left text-emerald-600">{ba.totalDebit.toLocaleString()}</td>
                      <td className="py-1.5 px-2.5 text-left text-rose-600">{ba.totalCredit.toLocaleString()}</td>
                      <td className="py-1.5 px-2.5 text-left font-bold text-indigo-700">
                        {ba.cardexBalance.toLocaleString()} {settings.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
