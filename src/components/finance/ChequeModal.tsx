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
  FileCheck2,
  X,
  Building2,
  User,
  Calendar,
  Hash,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ChequeModalProps {
  type?: 'receive' | 'payment';
  onClose: () => void;
  defaultContactId?: string;
}

const IRANIAN_BANKS = [
  'بانک ملی ایران',
  'بانک ملت',
  'بانک صادرات ایران',
  'بانک تجارت',
  'بانک سپه',
  'بانک پاسارگاد',
  'بانک سامان',
  'بانک پارسیان',
  'بانک آینده',
  'بانک کشاورزی',
  'بانک مسکن',
  'بانک شهر',
  'بانک رفاه کارگران',
  'بانک اقتصاد نوین',
  'بانک سینا',
  'بانک گردشگری',
  'بانک دی',
  'پست بانک ایران',
  'بانک کارآفرین',
  'بانک خاورمیانه',
  'بانک ایران زمین',
  'بانک سرمایه',
  'بانک رسالت',
  'بانک مهر ایران',
];

export const ChequeModal: React.FC<ChequeModalProps> = ({
  type: initialType = 'receive',
  onClose,
  defaultContactId,
}) => {
  const { contacts, bankAccounts, addCheque, settings } = useAccounting();

  const [type, setType] = useState<'receive' | 'payment'>(initialType);
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [sayadId, setSayadId] = useState<string>('');
  const [bankName, setBankName] = useState<string>(IRANIAN_BANKS[0]);
  const [branchName, setBranchName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [contactId, setContactId] = useState<string>(defaultContactId || contacts[0]?.id || '');
  const [bankAccountId, setBankAccountId] = useState<string>(bankAccounts[0]?.id || '');
  const [drawerName, setDrawerName] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(getCurrentShamsiDate());
  const [dueDate, setDueDate] = useState<string>(getCurrentShamsiDate());
  const [amountInput, setAmountInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const isReceive = type === 'receive';
  const numericAmount = parseNumberFromInput(amountInput);

  const selectedContact = contacts.find((c) => c.id === contactId);
  const selectedBankAccount = bankAccounts.find((b) => b.id === bankAccountId);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseNumberFromInput(raw);
    setAmountInput(num > 0 ? formatNumberWithCommas(num) : raw);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chequeNumber.trim()) {
      alert('لطفاً شماره سریال چک را وارد نمایید.');
      return;
    }

    if (numericAmount <= 0) {
      alert('لطفاً مبلغ معتبر بزرگتر از صفر وارد نمایید.');
      return;
    }

    const contactName = selectedContact ? selectedContact.name : 'طرف‌حساب';

    addCheque({
      type,
      chequeNumber: chequeNumber.trim(),
      sayadId: sayadId.trim(),
      bankName: isReceive ? bankName : (selectedBankAccount?.bankName || bankName),
      branchName: branchName.trim(),
      accountNumber: accountNumber.trim(),
      contactId,
      contactName,
      bankAccountId: isReceive ? undefined : selectedBankAccount?.id,
      bankAccountTitle: isReceive ? undefined : selectedBankAccount?.title,
      drawerName: drawerName.trim() || (isReceive ? contactName : settings.companyName),
      amount: numericAmount,
      issueDate,
      dueDate,
      status: 'pending',
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div
          className={`p-4 flex items-center justify-between text-white ${
            isReceive
              ? 'bg-gradient-to-r from-teal-600 to-emerald-700'
              : 'bg-gradient-to-r from-amber-600 to-orange-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {isReceive ? 'ثبت چک دریافتی صیادی (اسناد دریافتنی)' : 'ثبت چک پرداختی صیادی (اسناد پرداختنی)'}
              </h3>
              <p className="text-[11px] text-white/80 mt-0.5">
                {isReceive
                  ? 'ثبت چک نزد صندوق و صدور خودکار سند حسابداری تسویه طلب'
                  : 'صدور چک از حساب‌های شرکت در وجه تامین‌کنندگان با سند تعهدی'}
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

        {/* Type Toggle Tabs */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => setType('receive')}
            className={`flex-1 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
              isReceive
                ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>چک دریافتی از مشتری (اسناد دریافتنی)</span>
          </button>
          <button
            type="button"
            onClick={() => setType('payment')}
            className={`flex-1 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
              !isReceive
                ? 'bg-white text-amber-700 shadow-sm border border-amber-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4 text-amber-600" />
            <span>چک پرداختی به تامین‌کننده (اسناد پرداختنی)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Row 1: Sayad ID & Cheque Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>شناسه صیادی (۱۶ رقم)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">اختیاری / سامانه صیاد</span>
              </label>
              <input
                type="text"
                maxLength={16}
                value={sayadId}
                onChange={(e) => setSayadId(e.target.value.replace(/\D/g, ''))}
                placeholder="مثال: 1234567890123456"
                dir="ltr"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono tracking-widest text-center focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>شماره سریال چک</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
                placeholder="مثال: 452109"
                dir="ltr"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition"
                required
              />
            </div>
          </div>

          {/* Row 2: Bank & Contact Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isReceive ? (
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>نام بانک صادرکننده چک</span>
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition"
                >
                  {IRANIAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>دسته چک حساب بانکی شرکت</span>
                </label>
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition font-medium"
                >
                  {bankAccounts
                    .filter((b) => b.type === 'bank')
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.bankName} - {b.accountNumber})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{isReceive ? 'واگذارنده (مشتری / پرداخت‌کننده)' : 'در وجه (تامین‌کننده / طلبکار)'}</span>
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
          </div>

          {/* Row 3: Issue Date & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>تاریخ صدور چک (شمسی)</span>
              </label>
              <input
                type="text"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                placeholder="1403/05/15"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-indigo-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>تاریخ سررسید چک (شمسی)</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="1403/06/15"
                className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-xs font-mono font-bold text-indigo-900 focus:border-indigo-500 outline-hidden bg-indigo-50/50 focus:bg-white transition"
                required
              />
            </div>
          </div>

          {/* Row 4: Branch and Drawer Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>شعبه بانک</span>
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="مثال: شعبه مرکزی کد ۲۱۴"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>صاحب حساب / امضاکننده چک</span>
              </label>
              <input
                type="text"
                value={drawerName}
                onChange={(e) => setDrawerName(e.target.value)}
                placeholder={isReceive ? 'نام صادرکننده چک' : settings.companyName}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Row 5: Amount with live words conversion */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 text-xs flex items-center gap-1">
                <span>مبلغ چک ({settings.currency})</span>
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

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>یادداشت و بابت چک</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="بابت تسویه فاکتور شماره، ضمانت قرارداد، یا پرداخت مرحله‌ای..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-indigo-500 outline-hidden bg-slate-50 focus:bg-white transition resize-none"
            />
          </div>

          {/* Auto double entry voucher notice */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-[11px]">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600" />
            <span>
              {isReceive
                ? 'سند حسابداری دریافت چک (بدهکار: اسناد دریافتنی نزد صندوق | بستانکار: حساب‌های دریافتنی تجاری) به صورت خودکار صادر می‌گردد.'
                : 'سند حسابداری صدور چک (بدهکار: حساب‌های پرداختنی تجاری | بستانکار: اسناد پرداختنی تجاری) به صورت خودکار صادر می‌گردد.'}
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
                isReceive
                  ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
              }`}
            >
              {isReceive ? 'ثبت و درج چک دریافتی' : 'ثبت و صدور چک پرداختی'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
