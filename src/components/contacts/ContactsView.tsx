import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { Contact, ContactType } from '../../types/accounting';
import { calculateContactCardex } from '../../utils/financialCalculations';
import { formatCurrency } from '../../utils/dateUtils';
import { ContactCardexModal } from './ContactCardexModal';
import {
  Users,
  Plus,
  Search,
  Phone,
  FileText,
  Edit2,
  Trash2,
  X,
  CreditCard,
  Building,
  UserCheck
} from 'lucide-react';

export const ContactsView: React.FC = () => {
  const { contacts, addContact, updateContact, deleteContact, invoices, vouchers, expenses, settings } =
    useAccounting();

  const [activeTypeTab, setActiveTypeTab] = useState<ContactType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactForCardex, setSelectedContactForCardex] = useState<Contact | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);

  // Form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [type, setType] = useState<ContactType>('customer');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [nationalCode, setNationalCode] = useState('');
  const [economicCode, setEconomicCode] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(50000000);
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [initialBalanceType, setInitialBalanceType] = useState<'debit' | 'credit'>('debit');

  const openAddModal = () => {
    setContactToEdit(null);
    setCode(`C-${100 + contacts.length + 1}`);
    setName('');
    setCompanyName('');
    setType('customer');
    setPhone('');
    setMobile('');
    setNationalCode('');
    setEconomicCode('');
    setAddress('');
    setCreditLimit(50000000);
    setInitialBalance(0);
    setInitialBalanceType('debit');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Contact) => {
    setContactToEdit(c);
    setCode(c.code);
    setName(c.name);
    setCompanyName(c.companyName || '');
    setType(c.type);
    setPhone(c.phone || '');
    setMobile(c.mobile || '');
    setNationalCode(c.nationalCode || '');
    setEconomicCode(c.economicCode || '');
    setAddress(c.address || '');
    setCreditLimit(c.creditLimit);
    setInitialBalance(c.initialBalance);
    setInitialBalanceType(c.initialBalanceType);
    setIsModalOpen(true);
  };

  const handleDelete = (c: Contact) => {
    if (window.confirm(`آیا از حذف طرف حساب "${c.name}" اطمینان دارید؟`)) {
      deleteContact(c.id);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (contactToEdit) {
      updateContact(contactToEdit.id, {
        code,
        name: name.trim(),
        companyName: companyName.trim(),
        type,
        phone,
        mobile,
        nationalCode,
        economicCode,
        address,
        creditLimit,
        initialBalance,
        initialBalanceType,
      });
    } else {
      addContact({
        code,
        name: name.trim(),
        companyName: companyName.trim(),
        type,
        phone,
        mobile,
        nationalCode,
        economicCode,
        address,
        creditLimit,
        initialBalance,
        initialBalanceType,
      });
    }

    setIsModalOpen(false);
  };

  // Filter contacts
  const filteredContacts = contacts.filter((c) => {
    const matchType = activeTypeTab === 'all' || c.type === activeTypeTab || (c.type === 'both' && (activeTypeTab === 'customer' || activeTypeTab === 'supplier'));
    const matchSearch =
      searchQuery === '' ||
      c.name.includes(searchQuery) ||
      c.code.includes(searchQuery) ||
      (c.companyName && c.companyName.includes(searchQuery)) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.mobile && c.mobile.includes(searchQuery));

    return matchType && matchSearch;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>مدیریت اشخاص و طرف‌حساب‌ها (مشتریان، تامین‌کنندگان و کاردکس)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            تعریف اشخاص حقیقی و حقوقی، کنترل سقف اعتبار و مشاهده کاردکس کامل گردش حساب
          </p>
        </div>

        <button
          onClick={openAddModal}
          id="btn-add-contact"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>تعریف شخص / طرف حساب جدید</span>
        </button>
      </div>

      {/* Table & Filtering */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'all', label: 'همه اشخاص', count: contacts.length },
              { id: 'customer', label: 'مشتریان', count: contacts.filter((c) => c.type === 'customer' || c.type === 'both').length },
              { id: 'supplier', label: 'تامین‌کنندگان', count: contacts.filter((c) => c.type === 'supplier' || c.type === 'both').length },
              { id: 'other', label: 'سایر طرف‌حساب‌ها', count: contacts.filter((c) => c.type === 'other').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTypeTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                  activeTypeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className="mr-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام، تلفن یا کد شخص..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Contacts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 font-mono w-24">کد شخص</th>
                <th className="py-3 px-3 min-w-[200px]">نام و نام خانوادگی / شرکت</th>
                <th className="py-3 px-3 w-28">نوع طرف حساب</th>
                <th className="py-3 px-3 w-32 font-mono">تلفن تماس</th>
                <th className="py-3 px-3 w-36 text-left">سقف اعتبار ({settings.currency})</th>
                <th className="py-3 px-3 text-left w-40">مانده حساب جاری</th>
                <th className="py-3 px-3 text-center w-36">کاردکس و عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredContacts.map((c) => {
                const { finalBalance, finalBalanceType } = calculateContactCardex(
                  c,
                  invoices,
                  vouchers,
                  expenses
                );

                const typeBadge =
                  c.type === 'customer'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : c.type === 'supplier'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : c.type === 'both'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200';

                const typeLabel =
                  c.type === 'customer'
                    ? 'مشتری'
                    : c.type === 'supplier'
                    ? 'تامین‌کننده'
                    : c.type === 'both'
                    ? 'مشتری و تامین‌کننده'
                    : 'سایر';

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{c.code}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      {c.companyName && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{c.companyName}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeBadge}`}>
                        {typeLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {c.phone || c.mobile || '-'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 text-left">
                      {formatCurrency(c.creditLimit, settings.currency)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-left">
                      {finalBalance === 0 ? (
                        <span className="text-slate-400 text-[11px]">بی‌حساب (۰)</span>
                      ) : (
                        <span className={finalBalanceType === 'بدهکار' ? 'text-rose-600' : 'text-emerald-600'}>
                          {finalBalance.toLocaleString()} ({finalBalanceType})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedContactForCardex(c)}
                          title="مشاهده کاردکس ریز حساب"
                          className="flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>کاردکس</span>
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          title="ویرایش مشخصات"
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          title="حذف شخص"
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                {contactToEdit ? `ویرایش مشخصات ${contactToEdit.name}` : 'تعریف طرف حساب جدید'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">کد شخص</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نوع طرف حساب</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ContactType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    <option value="customer">مشتری (خریدار)</option>
                    <option value="supplier">تامین‌کننده (فروشنده کالا)</option>
                    <option value="both">هر دو (مشتری و تامین‌کننده)</option>
                    <option value="other">سایر اشخاص</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نام و نام خانوادگی</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: علی محمدی..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نام تجاری یا شرکت</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="مثال: بازرگانی البرز..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">شماره تماس ثابت</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="02188888888"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">شماره موبایل</label>
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="09123456789"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">کد ملی / شناسه ملی</label>
                  <input
                    type="text"
                    value={nationalCode}
                    onChange={(e) => setNationalCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">کد اقتصادی</label>
                  <input
                    type="text"
                    value={economicCode}
                    onChange={(e) => setEconomicCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">سقف اعتبار نسیه ({settings.currency})</label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">مانده اول دوره</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-left"
                    />
                    <select
                      value={initialBalanceType}
                      onChange={(e) => setInitialBalanceType(e.target.value as any)}
                      className="bg-slate-50 border border-slate-300 rounded-lg px-2 text-xs"
                    >
                      <option value="debit">بدهکار</option>
                      <option value="credit">بستانکار</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">نشانی و آدرس پستی</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="آدرس دقیق طرف حساب..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                >
                  ذخیره شخص
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Cardex Modal */}
      {selectedContactForCardex && (
        <ContactCardexModal
          contact={selectedContactForCardex}
          onClose={() => setSelectedContactForCardex(null)}
        />
      )}
    </div>
  );
};
