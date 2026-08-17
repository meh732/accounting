import React from 'react';
import { Contact } from '../../types/accounting';
import { useAccounting } from '../../context/AccountingContext';
import { calculateContactCardex } from '../../utils/financialCalculations';
import { formatCurrency, numberToWordsPersian } from '../../utils/dateUtils';
import { Printer, X, User, Phone, MapPin, Building2, TrendingUp, TrendingDown } from 'lucide-react';

interface ContactCardexModalProps {
  contact: Contact;
  onClose: () => void;
}

export const ContactCardexModal: React.FC<ContactCardexModalProps> = ({ contact, onClose }) => {
  const { invoices, vouchers, expenses, settings } = useAccounting();

  const cardex = calculateContactCardex(contact, invoices, vouchers, expenses);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-slate-200">
        {/* Top Controls */}
        <div className="no-print p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                کاردکس ریز حساب و صورتحساب: {contact.name} ({contact.code})
              </h3>
              <span className="text-[11px] text-slate-500">
                شامل کلیه فاکتورهای فروش، خرید، واریزی‌ها، چک‌ها و اسناد دستی
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              id="btn-print-cardex"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ صورتحساب</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Cardex Area */}
        <div className="p-6 md:p-8 overflow-y-auto print-page font-sans text-slate-900 space-y-4">
          {/* Official Company Header */}
          <div className="border-2 border-slate-800 p-4 rounded-lg space-y-3">
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">{settings.companyName}</h2>
                  <p className="text-[11px] text-slate-600">گزارش رسمی گردش حساب و کاردکس اشخاص</p>
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-base font-black text-slate-900 border-b border-slate-400 pb-0.5">
                  صورت‌حساب و کاردکس طرف‌حساب
                </h1>
                <span className="text-[10px] text-slate-500">حسابداری مالی و بازرگانی</span>
              </div>

              <div className="text-left text-xs space-y-1 font-mono">
                <div>کد شخص: <span className="font-bold">{contact.code}</span></div>
                <div>تاریخ گزارش: <span className="font-bold">{new Date().toLocaleDateString('fa-IR')}</span></div>
              </div>
            </div>

            {/* Contact Information Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded border border-slate-300 text-xs">
              <div>نام طرف حساب: <strong>{contact.name}</strong></div>
              <div>تلفن: <span className="font-mono">{contact.phone || contact.mobile || '-'}</span></div>
              <div>کد اقتصادی/ملی: <span className="font-mono">{contact.nationalCode || contact.economicCode || '-'}</span></div>
              <div>سقف اعتبار: <span className="font-mono">{formatCurrency(contact.creditLimit, settings.currency)}</span></div>
              {contact.address && <div className="col-span-2 md:col-span-4">نشانی: {contact.address}</div>}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded text-xs">
                <div className="text-indigo-800 font-semibold">مجموع گردش بدهکار (خریدها/بدهی)</div>
                <div className="text-sm font-bold font-mono text-indigo-900 mt-1">
                  {formatCurrency(cardex.totalDebit, settings.currency)}
                </div>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs">
                <div className="text-emerald-800 font-semibold">مجموع گردش بستانکار (پرداخت‌ها)</div>
                <div className="text-sm font-bold font-mono text-emerald-900 mt-1">
                  {formatCurrency(cardex.totalCredit, settings.currency)}
                </div>
              </div>
              <div className="p-2.5 bg-slate-100 border border-slate-300 rounded text-xs">
                <div className="text-slate-800 font-semibold">مانده نهایی حساب</div>
                <div className="text-sm font-bold font-mono mt-1 flex items-center gap-1">
                  <span className={cardex.finalBalanceType === 'بدهکار' ? 'text-rose-700' : 'text-emerald-700'}>
                    {formatCurrency(cardex.finalBalance, settings.currency)}
                  </span>
                  <span className="text-[11px] font-bold text-slate-700">({cardex.finalBalanceType})</span>
                </div>
              </div>
            </div>

            {/* Cardex Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border border-slate-300">
                <thead className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-2 w-8 text-center border-l border-slate-300">#</th>
                    <th className="py-2 px-2.5 w-24 border-l border-slate-300 font-mono">تاریخ</th>
                    <th className="py-2 px-2.5 w-20 border-l border-slate-300 font-mono">شماره مدرک</th>
                    <th className="py-2 px-3 border-l border-slate-300">شرح تراکنش و رویداد مالی</th>
                    <th className="py-2 px-3 w-32 text-left border-l border-slate-300">بدهکار ({settings.currency})</th>
                    <th className="py-2 px-3 w-32 text-left border-l border-slate-300">بستانکار ({settings.currency})</th>
                    <th className="py-2 px-3 w-36 text-left">مانده حساب ({settings.currency})</th>
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
                      <td className="py-2 px-3 border-l border-slate-200 font-mono font-bold text-left text-slate-800">
                        {row.debit > 0 ? row.debit.toLocaleString() : '۰'}
                      </td>
                      <td className="py-2 px-3 border-l border-slate-200 font-mono font-bold text-left text-slate-800">
                        {row.credit > 0 ? row.credit.toLocaleString() : '۰'}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-left text-slate-900">
                        <span className={row.balanceType === 'بدهکار' ? 'text-rose-700' : 'text-emerald-700'}>
                          {row.balance.toLocaleString()}
                        </span>{' '}
                        <span className="text-[10px] text-slate-500 font-sans">({row.balanceType})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <tr>
                    <td colSpan={4} className="py-2 px-3 border-l border-slate-300 text-right">
                      جمع کل گردش‌ها:
                    </td>
                    <td className="py-2 px-3 border-l border-slate-300 text-left font-mono text-indigo-900">
                      {cardex.totalDebit.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 border-l border-slate-300 text-left font-mono text-emerald-900">
                      {cardex.totalCredit.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-left font-mono text-slate-900 font-black">
                      {cardex.finalBalance.toLocaleString()} ({cardex.finalBalanceType})
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* In words summary */}
            <div className="p-2 bg-slate-50 rounded border border-slate-300 text-xs">
              <span className="font-bold">مانده به حروف: </span>
              <span>
                {numberToWordsPersian(cardex.finalBalance)} {settings.currency} ({cardex.finalBalanceType})
              </span>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs font-semibold text-slate-700">
              <div>امور مالی {settings.companyName} (مهر و امضا)</div>
              <div>تاییدیه طرف حساب {contact.name} (امضا و تاریخ)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
