import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import {
  getCurrentShamsiDate,
  formatCurrency,
  formatNumberWithCommas,
  parseNumberFromInput,
  numberToWordsPersian
} from '../../utils/dateUtils';
import {
  ArrowLeftRight,
  X,
  Building2,
  Calendar,
  Hash,
  FileText,
  CheckCircle2
} from 'lucide-react';

interface TransferModalProps {
  onClose: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ onClose }) => {
  const { bankAccounts, addFinancialTransaction, settings } = useAccounting();

  const [date, setDate] = useState<string>(getCurrentShamsiDate());
  const [sourceAccountId, setSourceAccountId] = useState<string>(bankAccounts[0]?.id || '');
  const [destinationAccountId, setDestinationAccountId] = useState<string>(
    bankAccounts.length > 1 ? bankAccounts[1]?.id : bankAccounts[0]?.id || ''
  );
  const [amountInput, setAmountInput] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [title, setTitle] = useState<string>('انتقال داخلی بین حساب‌ها');
  const [description, setDescription] = useState<string>('');

  const numericAmount = parseNumberFromInput(amountInput);

  const sourceAccount = bankAccounts.find((b) => b.id === sourceAccountId);
  const destAccount = bankAccounts.find((b) => b.id === destinationAccountId);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseNumberFromInput(raw);
    setAmountInput(num > 0 ? formatNumberWithCommas(num) : raw);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) {
      alert('لطفاً مبلغ معتبر بزرگتر از صفر وارد نمایید.');
      return;
    }

    if (sourceAccountId === destinationAccountId) {
      alert('حساب مبدا و حساب مقصد نمی‌توانند یکسان باشند.');
      return;
    }

    const srcTitle = sourceAccount ? sourceAccount.title : 'حساب مبدا';
    const destTitle = destAccount ? destAccount.title : 'حساب مقصد';

    addFinancialTransaction({
      type: 'transfer',
      date,
      amount: numericAmount,
      title: title.trim() || 'انتقال وجه داخلی',
      description: description.trim() || `انتقال داخلی از ${srcTitle} به ${destTitle}`,
      sourceAccountId,
      sourceAccountTitle: srcTitle,
      destinationAccountId,
      destinationAccountTitle: destTitle,
      paymentMethod: 'bank',
      trackingNumber: trackingNumber.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="p-4 flex items-center justify-between text-white bg-gradient-to-r from-blue-600 to-indigo-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">انتقال داخلی وجه (بانک به بانک / صندوق)</h3>
              <p className="text-[11px] text-white/80 mt-0.5">
                جابجایی نقدینگی بین حساب‌های بانکی و صندوق‌های شرکت
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs">
          {/* Row 1: Date & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>تاریخ انتقال (شمسی)</span>
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

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>عنوان عملیات</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition"
                required
              />
            </div>
          </div>

          {/* Row 2: Source and Destination Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-rose-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-rose-500" />
                <span>حساب مبدا (برداشت وجه)</span>
              </label>
              <select
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-indigo-500 outline-hidden bg-white transition font-medium"
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.bankName || (b.type === 'cash' ? 'صندوق' : 'کارتخوان')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-emerald-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>حساب مقصد (واریز وجه)</span>
              </label>
              <select
                value={destinationAccountId}
                onChange={(e) => setDestinationAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-indigo-500 outline-hidden bg-white transition font-medium"
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id} disabled={b.id === sourceAccountId}>
                    {b.title} {b.id === sourceAccountId ? '(مبدا انتخاب شده)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Amount with live words conversion */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 text-xs flex items-center gap-1">
                <span>مبلغ انتقال ({settings.currency})</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              {numericAmount > 0 && (
                <span className="text-[11px] font-bold text-indigo-700 font-mono">
                  {formatCurrency(numericAmount, settings.currency)}
                </span>
              )}
            </div>

            <input
              type="text"
              value={amountInput}
              onChange={handleAmountChange}
              placeholder="0"
              dir="ltr"
              className="w-full px-3 py-2.5 text-base font-bold font-mono text-left bg-white border border-slate-300 focus:border-indigo-500 rounded-lg outline-hidden text-slate-900 shadow-inner"
              required
            />

            {numericAmount > 0 && (
              <div className="text-[11px] text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 leading-relaxed">
                <span className="font-semibold text-slate-500">حروف: </span>
                <span className="font-bold text-indigo-900">
                  {numberToWordsPersian(numericAmount)} {settings.currency}
                </span>
              </div>
            )}
          </div>

          {/* Row 4: Tracking code */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>شماره ارجاع / شناسه انتقال بانکی</span>
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="مثال: TRF-87421"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">توضیحات و بابت سند</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="توضیحات تکمیلی بابت انتقال نقدینگی، تامین موجودی یا شارژ تنخواه..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition resize-none"
            />
          </div>

          {/* Accounting voucher info tag */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-[11px]">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
            <span>
              سند دوبل انتقال داخلی به صورت خودکار صادر شده و موجودی هر دو حساب همگام‌سازی می‌شود.
            </span>
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
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition"
            >
              ثبت و انتقال وجه
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
