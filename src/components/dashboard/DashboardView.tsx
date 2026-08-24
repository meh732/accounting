import React from 'react';
import { useAccounting } from '../../context/AccountingContext';
import {
  calculateProfitAndLoss,
  calculateContactCardex,
  calculateBankCardex
} from '../../utils/financialCalculations';
import { formatCurrency, toPersianDigits } from '../../utils/dateUtils';
import {
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Users,
  Landmark,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Clock,
  Plus,
  ShoppingBag,
  DollarSign,
  ChevronLeft
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  onOpenInvoiceModal: () => void;
  onOpenVoucherModal: () => void;
  onOpenExpenseModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenInvoiceModal,
  onOpenVoucherModal,
  onOpenExpenseModal,
}) => {
  const {
    invoices,
    expenses,
    products,
    bankAccounts,
    contacts,
    vouchers,
    cheques,
    settings
  } = useAccounting();

  const pnl = calculateProfitAndLoss(invoices, expenses, products);

  // 1. Total Bank & Cash Balances
  const totalCashAndBank = bankAccounts.reduce((sum, b) => {
    const { currentBalance } = calculateBankCardex(b, invoices, expenses, vouchers);
    return sum + currentBalance;
  }, 0);

  // 2. Customer Receivables & Supplier Payables
  let totalReceivables = 0; // طلب از مشتریان
  let totalPayables = 0;    // بدهی به تامین‌کنندگان

  contacts.forEach((c) => {
    const { finalBalance, finalBalanceType } = calculateContactCardex(c, invoices, vouchers, expenses);
    if (finalBalanceType === 'بدهکار') {
      totalReceivables += finalBalance;
    } else if (finalBalanceType === 'بستانکار') {
      totalPayables += finalBalance;
    }
  });

  // 3. Low stock alerts (products below reorder point)
  const lowStockProducts = products.filter((p) => p.stockQuantity <= p.reorderPoint);

  // 4. Pending Cheques from treasury cheques and invoices
  const pendingChequesList = cheques.filter((c) => c.status === 'pending');

  // 5. Recent Invoices
  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
            <span>سامانه حسابداری مَه - نسخه جامع</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            مرکز کنترل و عملیات مالی {settings.companyName}
          </h2>
          <p className="text-slate-300 text-xs mt-1 max-w-xl">
            مدیریت آسان خرید و فروش، اسناد دوبل استاندارد، دریافت و پرداخت، خزانه‌داری، چک‌های صیادی و انبار
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="dash-btn-open-finance"
            onClick={() => onNavigate('finance')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg shadow-amber-400/20 transition transform hover:-translate-y-0.5"
          >
            <DollarSign className="w-4 h-4 text-amber-950" />
            <span>امور مالی و چک</span>
          </button>
          <button
            id="dash-btn-new-invoice"
            onClick={onOpenInvoiceModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>صدور فاکتور</span>
          </button>
          <button
            id="dash-btn-new-voucher"
            onClick={onOpenVoucherModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-lg shadow-emerald-400/20 transition transform hover:-translate-y-0.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-950" />
            <span>ثبت سند دستی</span>
          </button>
          <button
            id="dash-btn-new-expense"
            onClick={onOpenExpenseModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition"
          >
            <ArrowDownLeft className="w-4 h-4 text-rose-400" />
            <span>ثبت هزینه</span>
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Cash & Bank */}
        <div
          onClick={() => onNavigate('banks')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">موجودی نقد و بانک</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-slate-800 font-mono">
              {formatCurrency(totalCashAndBank, settings.currency)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
              <span>تعداد حساب‌ها: {bankAccounts.length}</span>
              <span className="text-slate-300">•</span>
              <span className="text-indigo-600 font-medium group-hover:underline">مشاهده کاردکس</span>
            </div>
          </div>
        </div>

        {/* 2. Customer Receivables (طلب از مشتریان) */}
        <div
          onClick={() => onNavigate('contacts')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">مطالبات از مشتریان</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-indigo-700 font-mono">
              {formatCurrency(totalReceivables, settings.currency)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
              <span>حساب‌های دریافتنی</span>
              <span className="text-slate-300">•</span>
              <span className="text-indigo-600 font-medium group-hover:underline">لیست اشخاص</span>
            </div>
          </div>
        </div>

        {/* 3. Supplier Payables (بدهی به تامین‌کنندگان) */}
        <div
          onClick={() => onNavigate('contacts')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">بدهی به تامین‌کنندگان</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-rose-600 font-mono">
              {formatCurrency(totalPayables, settings.currency)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
              <span>حساب‌های پرداختنی</span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-600 font-medium group-hover:underline">مدیریت بدهی‌ها</span>
            </div>
          </div>
        </div>

        {/* 4. Net Profit / Performance */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">سود خالص دوره مالی</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-lg font-bold font-mono ${
                pnl.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatCurrency(pnl.netProfit, settings.currency)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
              <span>فروش خالص: {formatCurrency(pnl.netSales, settings.currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Invoices & Operational Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Invoices */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">آخرین فاکتورهای ثبت شده</h3>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <span>مشاهده همه فاکتورها</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">شماره</th>
                  <th className="py-2.5 px-3 font-semibold">نوع فاکتور</th>
                  <th className="py-2.5 px-3 font-semibold">طرف حساب</th>
                  <th className="py-2.5 px-3 font-semibold">تاریخ</th>
                  <th className="py-2.5 px-3 font-semibold">مبلغ کل</th>
                  <th className="py-2.5 px-3 font-semibold">تسویه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => {
                  const typeLabel =
                    inv.type === 'sales'
                      ? 'فروش'
                      : inv.type === 'purchase'
                      ? 'خرید'
                      : inv.type === 'sales_return'
                      ? 'برگشت فروش'
                      : 'برگشت خرید';

                  const typeColor =
                    inv.type === 'sales'
                      ? 'bg-indigo-50 text-indigo-700'
                      : inv.type === 'purchase'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700';

                  const isFullySettled = inv.settlement.creditAmount === 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${typeColor}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium max-w-[180px] truncate">
                        {inv.contactName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{inv.date}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {formatCurrency(inv.grandTotal, settings.currency)}
                      </td>
                      <td className="py-2.5 px-3">
                        {isFullySettled ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
                            تسویه شده
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">
                            نسیه ({formatCurrency(inv.settlement.creditAmount, settings.currency)})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Alerts (Low Stock & Cheques) */}
        <div className="space-y-4">
          {/* Low stock card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>هشدار کسری موجودی کالا</span>
              </div>
              <button
                onClick={() => onNavigate('products')}
                className="text-[11px] text-indigo-600 hover:underline"
              >
                انبار کالا
              </button>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400">
                تمامی کالاها در حد نصاب موجودی هستند.
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockProducts.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="p-2 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 text-[11px] max-w-[170px] truncate">
                        {p.title}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        نقطه سفارش: {p.reorderPoint} {p.unit}
                      </div>
                    </div>
                    <div className="text-left font-mono font-bold text-amber-700">
                      {p.stockQuantity} {p.unit}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Cheques card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs">
                <Clock className="w-4 h-4" />
                <span>چک‌های در جریان و سررسید</span>
              </div>
              <button
                onClick={() => onNavigate('finance')}
                className="text-[11px] text-indigo-600 hover:underline font-bold"
              >
                امور مالی ({toPersianDigits(pendingChequesList.length)})
              </button>
            </div>

            {pendingChequesList.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400">
                چک معوق یا در جریانی ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingChequesList.slice(0, 3).map((ch) => (
                  <div
                    key={ch.id}
                    onClick={() => onNavigate('finance')}
                    className="p-2 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-medium text-slate-800 text-[11px] flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            ch.type === 'receive' ? 'bg-teal-500' : 'bg-amber-500'
                          }`}
                        />
                        <span>{ch.type === 'receive' ? 'چک دریافتی' : 'چک پرداختی'} - {ch.bankName}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        سررسید: {ch.dueDate} | طرف‌حساب: {ch.contactName}
                      </div>
                    </div>
                    <div className="text-left font-mono font-bold text-slate-800 text-xs">
                      {formatCurrency(ch.amount, settings.currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
