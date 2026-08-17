import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { Expense } from '../../types/accounting';
import { formatCurrency } from '../../utils/dateUtils';
import { ExpenseModal } from './ExpenseModal';
import {
  DollarSign,
  Plus,
  Search,
  Tag,
  Edit2,
  Trash2,
  Landmark,
  TrendingDown
} from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const { expenses, deleteExpense, chartOfAccounts, settings } = useAccounting();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const expenseAccounts = chartOfAccounts.filter((a) => a.code.startsWith('5') || a.code.startsWith('6') || a.code.startsWith('8'));

  const filteredExpenses = expenses.filter((exp) => {
    const matchCat = selectedCategoryFilter === 'all' || exp.accountCode === selectedCategoryFilter;
    const matchSearch =
      searchQuery === '' ||
      exp.description.includes(searchQuery) ||
      exp.accountTitle.includes(searchQuery) ||
      (exp.beneficiary && exp.beneficiary.includes(searchQuery)) ||
      (exp.trackingNumber && exp.trackingNumber.includes(searchQuery));

    return matchCat && matchSearch;
  });

  const totalExpenseSum = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleDelete = (exp: Expense) => {
    if (window.confirm(`آیا از حذف هزینه "${exp.description}" به مبلغ ${formatCurrency(exp.amount, settings.currency)} اطمینان دارید؟`)) {
      deleteExpense(exp.id);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-rose-600" />
            <span>مدیریت و ثبت هزینه‌های جاری و سرفصل‌ها</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ثبت هزینه‌های اداری، توزیع، حقوق و دستمزد همراه با صدور خودکار سند حسابداری
          </p>
        </div>

        <button
          onClick={() => {
            setExpenseToEdit(null);
            setIsModalOpen(true);
          }}
          id="btn-add-expense"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>ثبت هزینه جدید</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>مجموع کل هزینه‌های ثبت شده</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg font-bold text-rose-700 font-mono mt-1">
            {formatCurrency(totalExpenseSum, settings.currency)}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>تعداد رکوردهای هزینه</span>
            <Tag className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg font-bold text-slate-800 font-mono mt-1">
            {expenses.length} مورد
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>سرفصل‌های فعال هزینه</span>
            <Landmark className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-slate-800 font-mono mt-1">
            {expenseAccounts.length} سرفصل
          </div>
        </div>
      </div>

      {/* Table & Filter */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 text-xs">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                selectedCategoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>همه سرفصل‌ها</span>
              <span className="mr-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800">
                {expenses.length}
              </span>
            </button>

            {expenseAccounts.slice(0, 5).map((acc) => (
              <button
                key={acc.id}
                onClick={() => setSelectedCategoryFilter(acc.code)}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  selectedCategoryFilter === acc.code
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{acc.title}</span>
                <span className="mr-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800">
                  {expenses.filter((e) => e.accountCode === acc.code).length}
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
              placeholder="جستجوی شرح، دریافت کننده..."
              className="w-full pl-2.5 pr-8 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md outline-hidden focus:bg-white focus:border-rose-500"
            />
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2 px-2.5 w-20 font-mono">تاریخ</th>
                <th className="py-2 px-2.5 min-w-[200px]">شرح و موضوع هزینه</th>
                <th className="py-2 px-2.5 w-36">سرفصل حسابداری</th>
                <th className="py-2 px-2.5 w-32">منبع پرداخت</th>
                <th className="py-2 px-2.5 w-28">دریافت‌کننده</th>
                <th className="py-2 px-2.5 text-left w-32">مبلغ ({settings.currency})</th>
                <th className="py-2 px-2.5 text-center w-20">سند دوبل</th>
                <th className="py-2 px-2.5 text-center w-20">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    هیچ هزینه‌ای با مشخصات انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2 px-2.5 font-mono text-slate-500">{exp.date}</td>
                    <td className="py-2 px-2.5 font-bold text-slate-900">{exp.description}</td>
                    <td className="py-2 px-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {exp.accountTitle}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-slate-700">
                      {exp.sourceAccountTitle || (exp.paymentType === 'cash' ? 'صندوق' : 'بانک')}
                      {exp.trackingNumber && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          ش پیگیری: {exp.trackingNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-slate-600">{exp.beneficiary || '-'}</td>
                    <td className="py-2 px-2.5 font-mono font-bold text-rose-700 text-left">
                      {formatCurrency(exp.amount, settings.currency)}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono text-[11px] text-indigo-600 font-semibold">
                      {exp.voucherId ? `#${exp.voucherId.replace('vch-', '')}` : '-'}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setExpenseToEdit(exp);
                            setIsModalOpen(true);
                          }}
                          title="ویرایش هزینه"
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp)}
                          title="حذف هزینه"
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Modal */}
      {isModalOpen && (
        <ExpenseModal
          expenseToEdit={expenseToEdit}
          onClose={() => {
            setIsModalOpen(false);
            setExpenseToEdit(null);
          }}
        />
      )}
    </div>
  );
};
