import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { AccountCategory, AccountLevel, AccountNature } from '../../types/accounting';
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';

export const ChartOfAccountsView: React.FC = () => {
  const { chartOfAccounts, addAccountCategory, updateAccountCategory, deleteAccountCategory } = useAccounting();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<AccountLevel | 'all'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<AccountCategory | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState<AccountLevel>('moein');
  const [parentCode, setParentCode] = useState('');
  const [nature, setNature] = useState<AccountNature>('debit');
  const [description, setDescription] = useState('');

  const openAddModal = (parent?: AccountCategory) => {
    setAccountToEdit(null);
    if (parent) {
      setParentCode(parent.code);
      setNature(parent.nature);
      if (parent.level === 'group') {
        setLevel('kol');
        setCode(`${parent.code}01`);
      } else if (parent.level === 'kol') {
        setLevel('moein');
        setCode(`${parent.code}01`);
      } else {
        setLevel('tafsili');
        setCode(`${parent.code}001`);
      }
    } else {
      setParentCode('');
      setCode('');
      setLevel('moein');
      setNature('debit');
    }
    setTitle('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (acc: AccountCategory) => {
    setAccountToEdit(acc);
    setCode(acc.code);
    setTitle(acc.title);
    setLevel(acc.level);
    setParentCode(acc.parentCode || '');
    setNature(acc.nature);
    setDescription(acc.description || '');
    setIsModalOpen(true);
  };

  const handleDelete = (acc: AccountCategory) => {
    if (acc.isSystem) {
      alert('این سرفصل حسابداری سیستمی و محافظت‌شده است و قابل حذف مستقیم نیست.');
      return;
    }
    if (window.confirm(`آیا از حذف سرفصل "${acc.code} - ${acc.title}" اطمینان دارید؟`)) {
      deleteAccountCategory(acc.id);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) return;

    if (accountToEdit) {
      updateAccountCategory(accountToEdit.id, {
        code: code.trim(),
        title: title.trim(),
        level,
        parentCode: parentCode || undefined,
        nature,
        description,
      });
    } else {
      addAccountCategory({
        code: code.trim(),
        title: title.trim(),
        level,
        parentCode: parentCode || undefined,
        nature,
        description,
        isSystem: false,
      });
    }

    setIsModalOpen(false);
  };

  // Filter accounts
  const filteredAccounts = chartOfAccounts.filter((acc) => {
    const matchSearch =
      searchQuery === '' ||
      acc.code.includes(searchQuery) ||
      acc.title.includes(searchQuery) ||
      (acc.description && acc.description.includes(searchQuery));

    const matchLevel = selectedLevel === 'all' || acc.level === selectedLevel;

    return matchSearch && matchLevel;
  });

  const getLevelName = (lvl: AccountLevel) => {
    switch (lvl) {
      case 'group':
        return 'گروه حساب';
      case 'kol':
        return 'حساب کل';
      case 'moein':
        return 'حساب معین';
      case 'tafsili':
        return 'حساب تفصیلی';
      default:
        return lvl;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Title & Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-indigo-600" />
            <span>کدینگ و درختواره سرفصل‌های حسابداری (Chart of Accounts)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            سرفصل‌های استاندارد مالی در ۴ سطح (گروه، کل، معین و تفصیلی) با امکان تعریف، ویرایش و مدیریت ماهیت
          </p>
        </div>

        <button
          onClick={() => openAddModal()}
          id="btn-add-account"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>تعریف سرفصل جدید</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Level Filter Tabs */}
          <div className="flex flex-wrap gap-1 text-xs">
            <button
              onClick={() => setSelectedLevel('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                selectedLevel === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              همه سطوح ({chartOfAccounts.length})
            </button>
            <button
              onClick={() => setSelectedLevel('group')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                selectedLevel === 'group' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              گروه ({chartOfAccounts.filter((a) => a.level === 'group').length})
            </button>
            <button
              onClick={() => setSelectedLevel('kol')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                selectedLevel === 'kol' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              کل ({chartOfAccounts.filter((a) => a.level === 'kol').length})
            </button>
            <button
              onClick={() => setSelectedLevel('moein')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                selectedLevel === 'moein' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              معین ({chartOfAccounts.filter((a) => a.level === 'moein').length})
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی کد یا نام حساب..."
              className="w-full pl-2.5 pr-8 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md outline-hidden focus:bg-white focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Accounts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2 px-2.5 font-mono w-24">کد حساب</th>
                <th className="py-2 px-2.5 min-w-[220px]">عنوان سرفصل حسابداری</th>
                <th className="py-2 px-2.5 w-24">سطح حساب</th>
                <th className="py-2 px-2.5 w-24">ماهیت حساب</th>
                <th className="py-2 px-2.5 min-w-[180px]">توضیحات</th>
                <th className="py-2 px-2.5 text-center w-24">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredAccounts.map((acc) => {
                const indentClass =
                  acc.level === 'group'
                    ? 'font-bold text-slate-900 bg-slate-50/70'
                    : acc.level === 'kol'
                    ? 'font-semibold text-slate-800 pr-5'
                    : acc.level === 'moein'
                    ? 'text-slate-700 pr-8'
                    : 'text-slate-600 pr-12';

                const levelBadgeColor =
                  acc.level === 'group'
                    ? 'bg-slate-800 text-white'
                    : acc.level === 'kol'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : acc.level === 'moein'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200';

                return (
                  <tr key={acc.id} className="hover:bg-indigo-50/20 transition">
                    <td className="py-1.5 px-2.5 font-mono font-bold text-indigo-700">{acc.code}</td>
                    <td className={`py-1.5 px-2.5 ${indentClass}`}>
                      <div className="flex items-center gap-1.5">
                        {acc.level === 'group' && <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>}
                        {acc.level === 'kol' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>}
                        {acc.level === 'moein' && <span className="w-1 h-1 rounded-full bg-emerald-500"></span>}
                        <span>{acc.title}</span>
                      </div>
                    </td>
                    <td className="py-1.5 px-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${levelBadgeColor}`}>
                        {getLevelName(acc.level)}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5">
                      {acc.nature === 'debit' ? (
                        <span className="text-indigo-600 text-[11px] font-medium">بدهکار</span>
                      ) : acc.nature === 'credit' ? (
                        <span className="text-emerald-600 text-[11px] font-medium">بستانکار</span>
                      ) : (
                        <span className="text-purple-600 text-[11px] font-medium">دوگانه</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-400 text-[11px] truncate max-w-xs">
                      {acc.description || '-'}
                    </td>
                    <td className="py-1.5 px-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {acc.level !== 'tafsili' && (
                          <button
                            onClick={() => openAddModal(acc)}
                            title="افزودن زیرحساب"
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(acc)}
                          title="ویرایش سرفصل"
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc)}
                          title="حذف سرفصل"
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

      {/* Account Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="font-bold text-slate-800 text-xs">
                {accountToEdit ? `ویرایش سرفصل ${accountToEdit.code}` : 'تعریف سرفصل جدید حسابداری'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">سطح حساب</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as AccountLevel)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 font-medium"
                  >
                    <option value="group">گروه (۱ رقمی)</option>
                    <option value="kol">کل (۲ تا ۳ رقمی)</option>
                    <option value="moein">معین (۴ تا ۶ رقمی)</option>
                    <option value="tafsili">تفصیلی</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">کد حسابداری</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="مثال: 10103"
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 font-mono font-bold text-left"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">عنوان سرفصل حساب</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: موجودی ارزی یا بانک صادرات..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ماهیت حساب</label>
                <select
                  value={nature}
                  onChange={(e) => setNature(e.target.value as AccountNature)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5"
                >
                  <option value="debit">بدهکار (دارایی / هزینه / خرید)</option>
                  <option value="credit">بستانکار (بدهی / سرمایه / درآمد / فروش)</option>
                  <option value="both">دوگانه / شناور</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">کد سرفصل بالادست (والد)</label>
                <input
                  type="text"
                  value={parentCode}
                  onChange={(e) => setParentCode(e.target.value)}
                  placeholder="مثال: 101"
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 font-mono text-left"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">توضیحات و یادداشت</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="توضیحات در مورد گردش این حساب..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5"
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
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-bold shadow-xs"
                >
                  ذخیره سرفصل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
