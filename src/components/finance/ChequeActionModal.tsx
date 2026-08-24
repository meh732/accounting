import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { ChequeRecord } from '../../types/accounting';
import {
  getCurrentShamsiDate,
  formatCurrency,
  numberToWordsPersian
} from '../../utils/dateUtils';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  X,
  Building2,
  Calendar,
  FileText,
  AlertTriangle,
  Coins
} from 'lucide-react';

interface ChequeActionModalProps {
  cheque: ChequeRecord;
  action: 'pass' | 'bounce' | 'return';
  onClose: () => void;
}

export const ChequeActionModal: React.FC<ChequeActionModalProps> = ({
  cheque,
  action,
  onClose,
}) => {
  const { bankAccounts, passCheque, bounceCheque, returnCheque, settings } = useAccounting();

  const [date, setDate] = useState<string>(getCurrentShamsiDate());
  const [bankAccountId, setBankAccountId] = useState<string>(
    cheque.bankAccountId || bankAccounts.find((b) => b.type === 'bank')?.id || bankAccounts[0]?.id || ''
  );
  const [reason, setReason] = useState<string>('');

  const isReceive = cheque.type === 'receive';

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (action === 'pass') {
      if (!bankAccountId) {
        alert('لطفاً حساب بانکی را انتخاب نمایید.');
        return;
      }
      passCheque(cheque.id, bankAccountId, date);
    } else if (action === 'bounce') {
      bounceCheque(cheque.id, date, reason);
    } else if (action === 'return') {
      returnCheque(cheque.id, date);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div
          className={`p-4 flex items-center justify-between text-white ${
            action === 'pass'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
              : action === 'bounce'
              ? 'bg-gradient-to-r from-rose-600 to-red-700'
              : 'bg-gradient-to-r from-slate-700 to-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              {action === 'pass' && <CheckCircle2 className="w-5 h-5" />}
              {action === 'bounce' && <XCircle className="w-5 h-5" />}
              {action === 'return' && <RotateCcw className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {action === 'pass' && (isReceive ? 'وصول چک و واریز به حساب بانکی' : 'پاس شدن چک صادره از حساب بانکی')}
                {action === 'bounce' && 'برگشت زدن (واخواست) چک صیادی'}
                {action === 'return' && 'استرداد چک به طرف‌حساب'}
              </h3>
              <p className="text-[11px] text-white/80 mt-0.5">
                شماره چک: {cheque.chequeNumber} | طرف‌حساب: {cheque.contactName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cheque Summary Card */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>مبلغ چک:</span>
              <span className="font-bold font-mono text-indigo-700 text-sm">
                {formatCurrency(cheque.amount, settings.currency)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>بانک و سررسید:</span>
              <span className="font-medium text-slate-800">
                {cheque.bankName} - سررسید {cheque.dueDate}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              {numberToWordsPersian(cheque.amount)} {settings.currency}
            </div>
          </div>
        </div>

        {/* Action Form */}
        <form onSubmit={handleConfirm} className="p-4 sm:p-5 space-y-3.5 text-xs">
          {/* Operation Date */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>تاریخ انجام عملیات (شمسی)</span>
            </label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="1403/05/15"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition"
              required
            />
          </div>

          {/* If Action is Pass: Select Bank Account */}
          {action === 'pass' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {isReceive ? 'حساب بانکی مقصد واریز' : 'حساب بانکی برداشت چک'}
                </span>
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition font-medium"
                required
              >
                {bankAccounts
                  .filter((b) => b.type === 'bank' || b.type === 'pos')
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.bankName} - {b.accountNumber})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* If Action is Bounce: Reason */}
          {action === 'bounce' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>علت برگشت / واخواست چک</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="عدم موجودی کافی، عدم تطابق امضا، مسدودی حساب..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-rose-500 outline-hidden bg-slate-50 focus:bg-white transition"
                required
              />
            </div>
          )}

          {/* Info notice */}
          <div
            className={`p-3 rounded-xl text-[11px] leading-relaxed border ${
              action === 'pass'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : action === 'bounce'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            {action === 'pass' &&
              (isReceive
                ? 'با تایید این مرحله، سند دوبل واریز به بانک و خروج چک از اسناد دریافتنی صادر شده و موجودی بانک افزایش می‌یابد.'
                : 'با تایید این مرحله، سند دوبل برداشت از بانک و تسویه اسناد پرداختنی صادر شده و از موجودی بانک کسر می‌گردد.')}
            {action === 'bounce' &&
              'با برگشت زدن چک، بدهی طرف‌حساب مجدداً احیا شده و چک از اسناد در جریان وصول خارج می‌شود.'}
            {action === 'return' &&
              'با استرداد چک، وضعیت چک به مسترد تغییر یافته و اسناد موقت آن ابطال خواهد شد.'}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition border border-slate-200"
            >
              انصراف
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition ${
                action === 'pass'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : action === 'bounce'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-slate-700 hover:bg-slate-800 shadow-slate-700/20'
              }`}
            >
              تایید و اعمال عملیات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
