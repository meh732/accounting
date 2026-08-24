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
  ArrowDownLeft,
  ArrowUpRight,
  X,
  CreditCard,
  Building2,
  User,
  Calendar,
  Hash,
  FileText,
  CheckCircle2
} from 'lucide-react';

interface ReceiptPaymentModalProps {
  type: 'receipt' | 'payment';
  onClose: () => void;
  defaultContactId?: string;
}

export const ReceiptPaymentModal: React.FC<ReceiptPaymentModalProps> = ({
  type,
  onClose,
  defaultContactId,
}) => {
  const { contacts, bankAccounts, addFinancialTransaction, settings } = useAccounting();

  const isReceipt = type === 'receipt';

  const [date, setDate] = useState<string>(getCurrentShamsiDate());
  const [contactId, setContactId] = useState<string>(defaultContactId || contacts[0]?.id || '');
  const [amountInput, setAmountInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'cash' | 'pos'>('bank');
  const [accountId, setAccountId] = useState<string>(bankAccounts[0]?.id || '');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [title, setTitle] = useState<string>(
    isReceipt ? 'دریافت وجه از طرف‌حساب' : 'پرداخت وجه به طرف‌حساب'
  );
  const [description, setDescription] = useState<string>('');

  const numericAmount = parseNumberFromInput(amountInput);

  // Available bank accounts filtered if user selected cash/bank
  const filteredAccounts = bankAccounts.filter((b) => {
    if (paymentMethod === 'cash') return b.type === 'cash';
    if (paymentMethod === 'pos') return b.type === 'pos' || b.type === 'bank';
    return b.type === 'bank';
  });

  const selectedContact = contacts.find((c) => c.id === contactId);
  const selectedAccount = bankAccounts.find((b) => b.id === accountId) || filteredAccounts[0] || bankAccounts[0];

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

    const contactName = selectedContact ? selectedContact.name : 'طرف‌حساب عمومی';
    const accTitle = selectedAccount ? selectedAccount.title : 'حساب مالی';

    if (isReceipt) {
      addFinancialTransaction({
        type: 'receipt',
        date,
        amount: numericAmount,
        title: title.trim() || 'دریافت وجه',
        description: description.trim() || `دریافت وجه از ${contactName} به ${accTitle}`,
        contactId,
        contactName,
        destinationAccountId: selectedAccount?.id,
        destinationAccountTitle: accTitle,
        paymentMethod,
        trackingNumber: trackingNumber.trim(),
      });
    } else {
      addFinancialTransaction({
        type: 'payment',
        date,
        amount: numericAmount,
        title: title.trim() || 'پرداخت وجه',
        description: description.trim() || `پرداخت وجه به ${contactName} از ${accTitle}`,
        contactId,
        contactName,
        sourceAccountId: selectedAccount?.id,
        sourceAccountTitle: accTitle,
        paymentMethod,
        trackingNumber: trackingNumber.trim(),
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div
          className={`p-4 flex items-center justify-between text-white ${
            isReceipt
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
              : 'bg-gradient-to-r from-rose-600 to-amber-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              {isReceipt ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {isReceipt ? 'ثبت فرم دریافت وجه (واریز به صندوق / بانک)' : 'ثبت فرم پرداخت وجه (حواله / نقد)'}
              </h3>
              <p className="text-[11px] text-white/80 mt-0.5">
                {isReceipt
                  ? 'ثبت خودکار سند حسابداری بدهکار بانک/صندوق و بستانکار طرف‌حساب'
                  : 'ثبت خودکار سند حسابداری بدهکار طرف‌حساب و بستانکار بانک/صندوق'}
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
                <span>تاریخ تراکنش (شمسی)</span>
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

          {/* Row 2: Contact & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>طرف‌حساب ({isReceipt ? 'پرداخت‌کننده' : 'دریافت‌کننده'})</span>
              </label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition"
              >
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type === 'customer' ? 'مشتری' : c.type === 'supplier' ? 'تامین‌کننده' : 'طرف‌حساب'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>روش تراکنش</span>
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank')}
                  className={`py-1.5 rounded-md font-bold text-[11px] transition ${
                    paymentMethod === 'bank'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  بانک / حواله
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pos')}
                  className={`py-1.5 rounded-md font-bold text-[11px] transition ${
                    paymentMethod === 'pos'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  کارتخوان POS
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-1.5 rounded-md font-bold text-[11px] transition ${
                    paymentMethod === 'cash'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  صندوق نقدی
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Bank / Cash Account & Tracking code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{isReceipt ? 'واریز به حساب / صندوق' : 'برداشت از حساب / صندوق'}</span>
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition font-medium"
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.bankName || (b.type === 'cash' ? 'صندوق' : 'کارتخوان')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>شماره پیگیری / فیش / ارجاع</span>
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="مثال: 98214560"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Row 4: Amount with live words conversion */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 text-xs flex items-center gap-1">
                <span>مبلغ تراکنش ({settings.currency})</span>
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

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">توضیحات و بابت سند</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="توضیحات تکمیلی بابت تسویه فاکتور، پیش‌پرداخت یا قرارداد..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition resize-none"
            />
          </div>

          {/* Accounting voucher info tag */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>
              سند دوبل متناظر به صورت خودکار در سرفصل‌های معین و تفصیلی ثبت و موازنه خواهد شد.
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
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition ${
                isReceipt
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              }`}
            >
              {isReceipt ? 'ثبت و تایید دریافت وجه' : 'ثبت و تایید پرداخت وجه'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
