import React from 'react';
import { BankAccount } from '../../types/accounting';
import { useAccounting } from '../../context/AccountingContext';
import { calculateBankCardex } from '../../utils/financialCalculations';
import { formatCurrency, numberToWordsPersian } from '../../utils/dateUtils';
import { Printer, X, Landmark, Building2 } from 'lucide-react';

interface BankCardexModalProps {
  account: BankAccount;
  onClose: () => void;
}

export const BankCardexModal: React.FC<BankCardexModalProps> = ({ account, onClose }) => {
  const { invoices, expenses, vouchers, settings } = useAccounting();

  const cardex = calculateBankCardex(account, invoices, expenses, vouchers);

  const handlePrint = () => {
    window.print();
  };

  const accountTypeLabel =
    account.type === 'bank'
      ? 'حساب بانکی'
      : account.type === 'cash'
      ? 'صندوق نقدی'
      : 'دستگاه کارتخوان (POS)';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-slate-200">
        {/* Top Controls */}
        <div className="no-print p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                کاردکس ریز تراکنش‌ها و گردش: {account.title}
              </h3>
              <span className="text-[11px] text-slate-500">
                صورت‌حساب واریزی‌های فاکتورها، پرداخت هزینه‌ها و اسناد دستی
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              id="btn-print-bank-cardex"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ صورت‌حساب</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 md:p-8 overflow-y-auto print-page font-sans text-slate-900 space-y-4">
          <div className="border-2 border-slate-800 p-4 rounded-lg space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">{settings.companyName}</h2>
                  <p className="text-[11px] text-slate-600">گزارش کاردکس نقد و بانک و جریان وجوه</p>
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-base font-black text-slate-900 border-b border-slate-400 pb-0.5">
                  کاردکس و گردش حساب {accountTypeLabel}
                </h1>
                <span className="text-[10px] text-slate-500">کنترل نقدینگی و مغایرت‌گیری بانکی</span>
              </div>

              <div className="text-left text-xs space-y-1 font-mono">
                <div>تاریخ: <span className="font-bold">{new Date().toLocaleDateString('fa-IR')}</span></div>
                <div>کد حساب: <span className="font-bold">{account.code}</span></div>
              </div>
            </div>

            {/* Account Info Box */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded border border-slate-300 text-xs">
              <div>عنوان حساب: <strong>{account.title}</strong></div>
              <div>نوع حساب: <span>{accountTypeLabel}</span></div>
              <div>شماره حساب/کارت: <span className="font-mono">{account.accountNumber || '-'}</span></div>
              <div>شماره شبا: <span className="font-mono">{account.shebaNumber || '-'}</span></div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs">
                <div className="text-emerald-800 font-semibold">مجموع واریزی‌ها (ورودی وجه)</div>
                <div className="text-sm font-bold font-mono text-emerald-900 mt-1">
                  {formatCurrency(cardex.totalInflow, settings.currency)}
                </div>
              </div>
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs">
                <div className="text-rose-800 font-semibold">مجموع برداشت‌ها (خروجی وجه)</div>
                <div className="text-sm font-bold font-mono text-rose-900 mt-1">
                  {formatCurrency(cardex.totalOutflow, settings.currency)}
                </div>
              </div>
              <div className="p-2.5 bg-slate-100 border border-slate-300 rounded text-xs">
                <div className="text-slate-800 font-semibold">موجودی لحظه‌ای نهایی</div>
                <div className="text-sm font-bold font-mono text-indigo-900 mt-1">
                  {formatCurrency(cardex.currentBalance, settings.currency)}
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border border-slate-300">
                <thead className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-2 w-8 text-center border-l border-slate-300">#</th>
                    <th className="py-2 px-2.5 w-24 border-l border-slate-300 font-mono">تاریخ</th>
                    <th className="py-2 px-2.5 w-24 border-l border-slate-300 font-mono">شماره ارجاع / فاکتور</th>
                    <th className="py-2 px-3 border-l border-slate-300">شرح رویداد مالی</th>
                    <th className="py-2 px-3 w-32 text-left border-l border-slate-300">واریز / دریافت ({settings.currency})</th>
                    <th className="py-2 px-3 w-32 text-left border-l border-slate-300">برداشت / پرداخت ({settings.currency})</th>
                    <th className="py-2 px-3 w-36 text-left">مانده لحظه‌ای ({settings.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {cardex.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-2 text-center border-l border-slate-200 font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2.5 border-l border-slate-200 font-mono text-slate-600">
                        {row.date}
                      </td>
                      <td className="py-2 px-2.5 border-l border-slate-200 font-mono font-semibold text-slate-800">
                        {row.documentNumber}
                      </td>
                      <td className="py-2 px-3 border-l border-slate-200 font-medium text-slate-900">
                        {row.description}
                      </td>
                      <td className="py-2 px-3 border-l border-slate-200 font-mono font-bold text-left text-emerald-700">
                        {row.inflow > 0 ? row.inflow.toLocaleString() : '۰'}
                      </td>
                      <td className="py-2 px-3 border-l border-slate-200 font-mono font-bold text-left text-rose-700">
                        {row.outflow > 0 ? row.outflow.toLocaleString() : '۰'}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-left text-slate-900">
                        {row.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <tr>
                    <td colSpan={4} className="py-2 px-3 border-l border-slate-300 text-right">
                      جمع کل گردش‌ها:
                    </td>
                    <td className="py-2 px-3 border-l border-slate-300 text-left font-mono text-emerald-900">
                      {cardex.totalInflow.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 border-l border-slate-300 text-left font-mono text-rose-900">
                      {cardex.totalOutflow.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-left font-mono text-indigo-900 font-black">
                      {cardex.currentBalance.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* In words summary */}
            <div className="p-2 bg-slate-50 rounded border border-slate-300 text-xs">
              <span className="font-bold">موجودی نهایی به حروف: </span>
              <span>
                {numberToWordsPersian(cardex.currentBalance)} {settings.currency} تمام
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
