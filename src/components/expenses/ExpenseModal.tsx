import React, { useState } from 'react';
import { Expense } from '../../types/accounting';
import { useAccounting } from '../../context/AccountingContext';
import { getCurrentShamsiDate, formatCurrency } from '../../utils/dateUtils';
import { X, DollarSign, Landmark, Plus, Trash2, Tag, Calendar } from 'lucide-react';

interface ExpenseModalProps {
  expenseToEdit?: Expense | null;
  onClose: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ expenseToEdit, onClose }) => {
  const { chartOfAccounts, bankAccounts, addExpense, updateExpense, settings } = useAccounting();

  // Filter expense accounts
  const expenseAccounts = chartOfAccounts.filter((a) => a.type === 'expense' && a.level === 'moein');

  const [date, setDate] = useState<string>(expenseToEdit?.date || getCurrentShamsiDate());
  const [accountCode, setAccountCode] = useState<string>(expenseToEdit?.accountCode || expenseAccounts[0]?.code || '60101');
  const [title, setTitle] = useState<string>(expenseToEdit?.title || '');
  const [amount, setAmount] = useState<number>(expenseToEdit?.amount || 0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>(expenseToEdit?.paymentMethod || 'bank');
  const [bankAccountId, setBankAccountId] = useState<string>(
    expenseToEdit?.bankAccountId || bankAccounts[0]?.id || ''
  );
  const [trackingCode, setTrackingCode] = useState<string>(expenseToEdit?.trackingCode || '');
  const [recipient, setRecipient] = useState<string>(expenseToEdit?.recipient || '');
  const [description, setDescription] = useState<string>(expenseToEdit?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) {
      alert('لطفاً عنوان هزینه و مبلغ معتبر را وارد فرمایید.');
      return;
    }

    const acc = chartOfAccounts.find((a) => a.code === accountCode);
    const bankAcc = bankAccounts.find((b) => b.id === bankAccountId);

    if (expenseToEdit) {
      updateExpense(expenseToEdit.id, {
        date,
        accountCode,
        accountTitle: acc?.title || 'هزینه عمومی',
        title: title.trim(),
        amount,
        paymentMethod,
        bankAccountId,
        bankAccountTitle: bankAcc?.title || '',
        trackingCode,
        recipient,
        description,
      });
    } else {
      addExpense({
        date,
        accountCode,
        accountTitle: acc?.title || 'هزینه عمومی',
        title: title.trim(),
        amount,
        paymentMethod,
        bankAccountId,
        bankAccountTitle: bankAcc?.title || '',
        trackingCode,
        recipient,
        description,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {expenseToEdit ? 'ویرایش سند هزینه' : 'ثبت هزینه جدید و صدور سند حسابداری'}
              </h3>
              <span className="text-[11px] text-slate-500">کاهش از موجودی نقد/بانک و ثبت در سرفصل معین هزینه</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">تاریخ پرداخت (شمسی)</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-center"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">مبلغ هزینه ({settings.currency})</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-rose-700 text-left"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">سرفصل حسابداری هزینه</label>
            <select
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
              required
            >
              {expenseAccounts.map((a) => (
                <option key={a.id} value={a.code}>
                  {a.code} - {a.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">عنوان و شرح خلاصه هزینه</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: اجاره دفتر شهریور ماه، هزینه ایاب و ذهاب..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">روش پرداخت</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
              >
                <option value="bank">کارت به کارت / حواله بانکی</option>
                <option value="cash">نقدی از صندوق</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">حساب بانکی / صندوق پرداخت‌کننده</label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                required
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">دریافت‌کننده وجه (شخص / مرکز)</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="نام شخص یا فروشگاه..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">شماره پیگیری / رسید پرداخت</label>
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="TRX-..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-left"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">توضیحات تکمیلی</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs"
            >
              {expenseToEdit ? 'ذخیره تغییرات' : 'ثبت هزینه و صدور سند'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
