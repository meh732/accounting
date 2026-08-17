import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { BankAccount, BankAccountType } from '../../types/accounting';
import { calculateBankCardex } from '../../utils/financialCalculations';
import { formatCurrency } from '../../utils/dateUtils';
import { BankCardexModal } from './BankCardexModal';
import {
  Landmark,
  Plus,
  Search,
  CreditCard,
  FileText,
  Edit2,
  Trash2,
  X,
  Wallet
} from 'lucide-react';

export const BankAndCashView: React.FC = () => {
  const {
    bankAccounts,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    invoices,
    expenses,
    vouchers,
    settings,
  } = useAccounting();

  const [activeTypeTab, setActiveTypeTab] = useState<BankAccountType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountForCardex, setSelectedAccountForCardex] = useState<BankAccount | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<BankAccount | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [type, setType] = useState<BankAccountType>('bank');
  const [bankName, setBankName] = useState('بانک ملت');
  const [accountNumber, setAccountNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [shebaNumber, setShebaNumber] = useState('');
  const [branchName, setBranchName] = useState('');
  const [initialBalance, setInitialBalance] = useState<number>(0);

  const openAddModal = (defaultType: BankAccountType = 'bank') => {
    setAccountToEdit(null);
    setTitle('');
    setType(defaultType);
    setBankName(defaultType === 'cash' ? 'صندوق' : 'بانک ملت');
    setAccountNumber('');
    setCardNumber('');
    setShebaNumber('');
    setBranchName('');
    setInitialBalance(0);
    setIsModalOpen(true);
  };

  const openEditModal = (acc: BankAccount) => {
    setAccountToEdit(acc);
    setTitle(acc.title);
    setType(acc.type);
    setBankName(acc.bankName || '');
    setAccountNumber(acc.accountNumber || '');
    setCardNumber(acc.cardNumber || '');
    setShebaNumber(acc.shebaNumber || '');
    setBranchName(acc.branchName || '');
    setInitialBalance(acc.initialBalance);
    setIsModalOpen(true);
  };

  const handleDelete = (acc: BankAccount) => {
    if (window.confirm(`آیا از حذف حساب "${acc.title}" اطمینان دارید؟`)) {
      deleteBankAccount(acc.id);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (accountToEdit) {
      updateBankAccount(accountToEdit.id, {
        title: title.trim(),
        type,
        bankName,
        accountNumber,
        cardNumber,
        shebaNumber,
        branchName,
        initialBalance,
      });
    } else {
      addBankAccount({
        title: title.trim(),
        type,
        bankName,
        accountNumber,
        cardNumber,
        shebaNumber,
        branchName,
        initialBalance,
        isActive: true,
      });
    }

    setIsModalOpen(false);
  };

  // Filter accounts
  const filteredAccounts = bankAccounts.filter((acc) => {
    const matchType = activeTypeTab === 'all' || acc.type === activeTypeTab;
    const matchSearch =
      searchQuery === '' ||
      acc.title.includes(searchQuery) ||
      (acc.bankName && acc.bankName.includes(searchQuery)) ||
      (acc.accountNumber && acc.accountNumber.includes(searchQuery)) ||
      (acc.cardNumber && acc.cardNumber.includes(searchQuery));

    return matchType && matchSearch;
  });

  // Calculate Total Liquid Assets
  const totalLiquidity = bankAccounts.reduce((sum, b) => {
    const { currentBalance } = calculateBankCardex(b, invoices, expenses, vouchers);
    return sum + currentBalance;
  }, 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-600" />
            <span>مدیریت نقد و بانک، صندوق‌ها و پایانه‌های فروشگاهی (POS)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            کنترل دقیق موجودی لحظه‌ای، گزارش گردش و کاردکس بانک و تسویه حساب‌ها
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openAddModal('bank')}
            id="btn-add-bank"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تعریف حساب بانکی</span>
          </button>
          <button
            onClick={() => openAddModal('cash')}
            id="btn-add-cash"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تعریف صندوق</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>مجموع کل نقدینگی و وجوه آماده</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-1">
            {formatCurrency(totalLiquidity, settings.currency)}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>تعداد حساب‌های بانکی</span>
            <Landmark className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-bold text-slate-800 font-mono mt-1">
            {bankAccounts.filter((b) => b.type === 'bank').length} حساب
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>تعداد صندوق‌ها و کارتخوان‌ها</span>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-slate-800 font-mono mt-1">
            {bankAccounts.filter((b) => b.type === 'cash' || b.type === 'pos').length} پایانه
          </div>
        </div>
      </div>

      {/* Table & Filtering */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1 text-xs">
            {[
              { id: 'all', label: 'همه حساب‌ها', count: bankAccounts.length },
              { id: 'bank', label: 'حساب‌های بانکی', count: bankAccounts.filter((b) => b.type === 'bank').length },
              { id: 'cash', label: 'صندوق‌ها', count: bankAccounts.filter((b) => b.type === 'cash').length },
              { id: 'pos', label: 'دستگاه‌های کارتخوان (POS)', count: bankAccounts.filter((b) => b.type === 'pos').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTypeTab(tab.id as any)}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  activeTypeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className="mr-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام بانک، حساب یا شبا..."
              className="w-full pl-2.5 pr-8 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md outline-hidden focus:bg-white focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Accounts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2 px-2.5 min-w-[200px]">عنوان حساب / صندوق</th>
                <th className="py-2 px-2.5 w-24">نوع</th>
                <th className="py-2 px-2.5 w-28 font-mono">شماره حساب</th>
                <th className="py-2 px-2.5 w-32 font-mono">شماره کارت / شبا</th>
                <th className="py-2 px-2.5 text-left w-32">مانده اول دوره</th>
                <th className="py-2 px-2.5 text-left w-36">موجودی لحظه‌ای ({settings.currency})</th>
                <th className="py-2 px-2.5 text-center w-28">کاردکس و عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredAccounts.map((acc) => {
                const { currentBalance } = calculateBankCardex(acc, invoices, expenses, vouchers);

                const typeBadge =
                  acc.type === 'bank'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : acc.type === 'cash'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200';

                const typeLabel =
                  acc.type === 'bank' ? 'بانک' : acc.type === 'cash' ? 'صندوق' : 'کارتخوان';

                return (
                  <tr key={acc.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2 px-2.5">
                      <div className="font-bold text-slate-900">{acc.title}</div>
                      {acc.bankName && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {acc.bankName} {acc.branchName ? `(شعبه ${acc.branchName})` : ''}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${typeBadge}`}>
                        {typeLabel}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 font-mono text-slate-700">{acc.accountNumber || '-'}</td>
                    <td className="py-2 px-2.5 font-mono text-slate-500 text-[11px]">
                      {acc.cardNumber || acc.shebaNumber || '-'}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-slate-600 text-left">
                      {formatCurrency(acc.initialBalance, settings.currency)}
                    </td>
                    <td className="py-2 px-2.5 font-mono font-bold text-left text-xs text-emerald-700">
                      {formatCurrency(currentBalance, settings.currency)}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedAccountForCardex(acc)}
                          title="مشاهده کاردکس نقد و بانک"
                          className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-semibold transition"
                        >
                          <FileText className="w-3 h-3" />
                          <span>کاردکس</span>
                        </button>
                        <button
                          onClick={() => openEditModal(acc)}
                          title="ویرایش حساب"
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc)}
                          title="حذف حساب"
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Bank Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="font-bold text-slate-800 text-xs">
                {accountToEdit ? `ویرایش ${accountToEdit.title}` : 'تعریف حساب، صندوق یا کارتخوان جدید'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نوع نقد و بانک</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as BankAccountType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 font-medium"
                  >
                    <option value="bank">حساب بانکی جاری / پس‌انداز</option>
                    <option value="cash">صندوق نقدی (تنخواه‌گردان)</option>
                    <option value="pos">دستگاه کارتخوان متصل (POS)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">عنوان حساب / صندوق</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: بانک ملت شعبه ونک..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 font-medium"
                    required
                  />
                </div>
              </div>

              {type !== 'cash' && (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">نام بانک</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="بانک ملت، ملی، سامان..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">کد یا نام شعبه</label>
                      <input
                        type="text"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        placeholder="شعبه بازار..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">شماره حساب</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="123456789"
                        className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 font-mono text-left"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">شماره کارت ۱۶ رقمی</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="61043378..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 font-mono text-left"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">شماره شبا (IBAN)</label>
                    <input
                      type="text"
                      value={shebaNumber}
                      onChange={(e) => setShebaNumber(e.target.value)}
                      placeholder="IR..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 font-mono text-left"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  موجودی اولیه اول دوره ({settings.currency})
                </label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 font-mono text-left"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold shadow-xs"
                >
                  ذخیره حساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cardex Modal */}
      {selectedAccountForCardex && (
        <BankCardexModal
          account={selectedAccountForCardex}
          onClose={() => setSelectedAccountForCardex(null)}
        />
      )}
    </div>
  );
};
