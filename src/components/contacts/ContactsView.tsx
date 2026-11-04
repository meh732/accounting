import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { Contact, ContactType } from '../../types/accounting';
import { calculateContactCardex } from '../../utils/financialCalculations';
import { formatCurrency, parseNumberFromInput } from '../../utils/dateUtils';
import { ContactCardexModal } from './ContactCardexModal';
import { ReceiptPaymentModal } from '../finance/ReceiptPaymentModal';
import {
  Users,
  Plus,
  Search,
  FileText,
  Edit2,
  Trash2,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export const ContactsView: React.FC = () => {
  const {
    contacts,
    addContact,
    updateContact,
    deleteContact,
    invoices,
    vouchers,
    expenses,
    financialTransactions,
    cheques,
    settings,
  } = useAccounting();

  const [activeTypeTab, setActiveTypeTab] = useState<ContactType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactForCardex, setSelectedContactForCardex] = useState<Contact | null>(null);
  const [paymentModalConfig, setPaymentModalConfig] = useState<{
    type: 'receipt' | 'payment';
    contactId: string;
  } | null>(null);

  // Customer / Contact Reconciliation Modal State
  const [reconcileContact, setReconcileContact] = useState<Contact | null>(null);
  const [claimedAmount, setClaimedAmount] = useState<number>(0);
  const [claimedType, setClaimedType] = useState<'بدهکار' | 'بستانکار' | 'تسویه'>('بدهکار');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);

  // Form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [type, setType] = useState<ContactType>('both');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [nationalCode, setNationalCode] = useState('');
  const [economicCode, setEconomicCode] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(50000000);
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [initialBalanceType, setInitialBalanceType] = useState<'debit' | 'credit'>('debit');

  const openContactReconcileModal = (c: Contact) => {
    const cardex = calculateContactCardex(c, invoices, vouchers, expenses, financialTransactions, cheques);
    setReconcileContact(c);
    setClaimedAmount(cardex.finalBalance);
    setClaimedType(cardex.finalBalanceType);
  };

  const openAddModal = () => {
    setContactToEdit(null);
    setCode(`${1000 + contacts.length + 1}`);
    setName('');
    setCompanyName('');
    setType('both');
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
    setNationalCode(c.nationalCode || c.nationalId || '');
    setEconomicCode(c.economicCode || '');
    setAddress(c.address || '');
    setCreditLimit(c.creditLimit || 0);
    setInitialBalance(c.initialBalance);
    setInitialBalanceType(c.initialBalanceType === 'credit' ? 'credit' : 'debit');
    setIsModalOpen(true);
  };

  const handleDelete = (c: Contact) => {
    deleteContact(c.id);
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
        nationalId: nationalCode,
        economicCode,
        address,
        creditLimit,
        initialBalance,
        initialBalanceType: initialBalance > 0 ? initialBalanceType : 'none',
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
        nationalId: nationalCode,
        economicCode,
        address,
        creditLimit,
        initialBalance,
        initialBalanceType: initialBalance > 0 ? initialBalanceType : 'none',
      });
    }

    setIsModalOpen(false);
  };

  // Filter contacts
  const filteredContacts = contacts.filter((c) => {
    const matchType =
      activeTypeTab === 'all' ||
      c.type === activeTypeTab ||
      (c.type === 'both' && (activeTypeTab === 'customer' || activeTypeTab === 'supplier'));
    const matchSearch =
      searchQuery === '' ||
      c.name.includes(searchQuery) ||
      c.code.includes(searchQuery) ||
      (c.companyName && c.companyName.includes(searchQuery)) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.mobile && c.mobile.includes(searchQuery));

    return matchType && matchSearch;
  });

  // Compute total receivables (بدهکاران) and payables (بستانکاران)
  const contactSummaries = contacts.map((c) => ({
    contact: c,
    cardex: calculateContactCardex(c, invoices, vouchers, expenses, financialTransactions, cheques),
  }));

  const totalReceivables = contactSummaries
    .filter((cs) => cs.cardex.finalBalanceType === 'بدهکار')
    .reduce((s, cs) => s + cs.cardex.finalBalance, 0);

  const totalPayables = contactSummaries
    .filter((cs) => cs.cardex.finalBalanceType === 'بستانکار')
    .reduce((s, cs) => s + cs.cardex.finalBalance, 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>مدیریت اشخاص، گزارش مشتریان، صورتحساب و مغایرت‌گیری</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            تعریف اشخاص حقیقی و حقوقی، گزارش مطالبات و بدهی‌ها، کاردکس اشخاص و مغایرت‌گیری حساب مشتریان
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {contacts.length > 0 && (
            <button
              onClick={() => openContactReconcileModal(contacts[0])}
              id="btn-contact-reconciliation"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition"
            >
              <Scale className="w-4 h-4" />
              <span>مغایرت‌گیری حساب مشتریان و اشخاص</span>
            </button>
          )}
          <button
            onClick={openAddModal}
            id="btn-add-contact"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف شخص / طرف حساب جدید</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards for Customers & Suppliers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>مجموع مطالبات ما از مشتریان (بدهکاران)</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-lg font-bold text-rose-700 font-mono mt-1">
            {formatCurrency(totalReceivables, settings.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {contactSummaries.filter((cs) => cs.cardex.finalBalanceType === 'بدهکار').length} طرف‌حساب بدهکار
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>مجموع بدهی ما به تامین‌کنندگان (بستانکاران)</span>
            <TrendingDown className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-1">
            {formatCurrency(totalPayables, settings.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {contactSummaries.filter((cs) => cs.cardex.finalBalanceType === 'بستانکار').length} طرف‌حساب بستانکار
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>تراز خالص مطالبات و بدهی اشخاص</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-bold text-indigo-900 font-mono mt-1">
            {formatCurrency(Math.abs(totalReceivables - totalPayables), settings.currency)}{' '}
            <span className="text-xs font-semibold">
              ({totalReceivables >= totalPayables ? 'خالص طلب ما' : 'خالص بدهی ما'})
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">مجموعاً {contacts.length} طرف‌حساب فعال</div>
        </div>
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
                <th className="py-3 px-3 w-36 text-left">مانده اول دوره</th>
                <th className="py-3 px-3 w-36 text-left">سقف اعتبار ({settings.currency})</th>
                <th className="py-3 px-3 text-left w-40">مانده حساب جاری</th>
                <th className="py-3 px-3 text-center w-36">کاردکس و عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredContacts.map((c) => {
                const { finalBalance, finalBalanceType, initialBalance: initBal, initialBalanceType: initType } = calculateContactCardex(
                  c,
                  invoices,
                  vouchers,
                  expenses,
                  financialTransactions,
                  cheques
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
                    <td className="py-3 px-3 font-mono text-left text-slate-700">
                      {initBal > 0 ? (
                        <span className={initType === 'credit' ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                          {initBal.toLocaleString()} ({initType === 'credit' ? 'بستانکار' : 'بدهکار'})
                        </span>
                      ) : (
                        <span className="text-slate-400">۰</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 text-left">
                      {formatCurrency(c.creditLimit, settings.currency)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-left">
                      {finalBalance === 0 ? (
                        <span className="text-slate-400 text-[11px]">بی‌حساب (۰)</span>
                      ) : (
                        <span className={finalBalanceType === 'بدهکار' ? 'text-rose-600' : 'text-emerald-600'}>
                          {finalBalance.toLocaleString()} {settings.currency} ({finalBalanceType})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedContactForCardex(c)}
                          title="مشاهده صورتحساب و کاردکس ریز حساب"
                          className="flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>صورتحساب</span>
                        </button>
                        <button
                          onClick={() => openContactReconcileModal(c)}
                          title="مغایرت‌گیری حساب با این شخص"
                          className="flex items-center gap-0.5 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[11px] font-bold transition"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>مغایرت</span>
                        </button>
                        <button
                          onClick={() => setPaymentModalConfig({ type: 'receipt', contactId: c.id })}
                          title="ثبت دریافت وجه از این شخص"
                          className="flex items-center gap-0.5 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>دریافت</span>
                        </button>
                        <button
                          onClick={() => setPaymentModalConfig({ type: 'payment', contactId: c.id })}
                          title="ثبت پرداخت وجه به این شخص"
                          className="flex items-center gap-0.5 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold transition"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>پرداخت</span>
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

      {/* Customer / Contact Reconciliation Modal */}
      {reconcileContact && (() => {
        const cardex = calculateContactCardex(
          reconcileContact,
          invoices,
          vouchers,
          expenses,
          financialTransactions,
          cheques
        );
        // Convert both to signed numbers (positive = بدهکار/receivable, negative = بستانکار/payable)
        const systemSigned =
          cardex.finalBalanceType === 'بدهکار'
            ? cardex.finalBalance
            : cardex.finalBalanceType === 'بستانکار'
            ? -cardex.finalBalance
            : 0;
        const claimedSigned =
          claimedType === 'بدهکار'
            ? claimedAmount
            : claimedType === 'بستانکار'
            ? -claimedAmount
            : 0;
        const diffSigned = systemSigned - claimedSigned;
        const absDiff = Math.abs(diffSigned);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-800 text-base">
                    مغایرت‌گیری حساب مشتری / طرف حساب: {reconcileContact.name}
                  </h3>
                </div>
                <button onClick={() => setReconcileContact(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">انتخاب شخص جهت مغایرت‌گیری:</label>
                  <select
                    value={reconcileContact.id}
                    onChange={(e) => {
                      const found = contacts.find((cnt) => cnt.id === e.target.value);
                      if (found) openContactReconcileModal(found);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold"
                  >
                    {contacts.map((cnt) => (
                      <option key={cnt.id} value={cnt.id}>
                        {cnt.name} ({cnt.companyName || 'حقیقی'}) - کد: {cnt.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-slate-500 mb-1">مانده طبق دفاتر و کاردکس ما:</div>
                    <div className={`text-sm font-black font-mono ${cardex.finalBalanceType === 'بدهکار' ? 'text-rose-700' : cardex.finalBalanceType === 'بستانکار' ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {cardex.finalBalance.toLocaleString()} {settings.currency} ({cardex.finalBalanceType})
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      جمع بدهکار: {cardex.totalDebit.toLocaleString()} | جمع بستانکار: {cardex.totalCredit.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      مانده اعلامی از سمت طرف حساب ({settings.currency}):
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        dir="ltr"
                        value={claimedAmount}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setClaimedAmount(parseNumberFromInput(e.target.value))}
                        className="w-full bg-white border border-indigo-300 rounded-lg p-2 font-mono font-bold text-left text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <select
                        value={claimedType}
                        onChange={(e) => setClaimedType(e.target.value as any)}
                        className="bg-white border border-indigo-300 rounded-lg px-2 font-bold text-xs"
                      >
                        <option value="بدهکار">بدهکار به ما</option>
                        <option value="بستانکار">بستانکار از ما</option>
                        <option value="تسویه">بی‌حساب (۰)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    absDiff === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div>
                    <div className="font-bold">نتیجه بررسی مغایرت حساب شخص:</div>
                    <div className="text-[11px] mt-0.5">
                      {absDiff === 0
                        ? 'حساب شخص کاملاً منطبق با صورتحساب اعلامی است و هیچگونه مغایرتی وجود ندارد.'
                        : diffSigned > 0
                        ? `طبق دفاتر ما، شخص مبلغ ${absDiff.toLocaleString()} ${settings.currency} بیشتر بدهکار است (احتمال عدم ثبت واریزی مشتری یا برگشت کالا).`
                        : `طبق دفاتر ما، شخص مبلغ ${absDiff.toLocaleString()} ${settings.currency} بیشتر بستانکار است (احتمال عدم ثبت پرداخت ما به تامین‌کننده).`}
                    </div>
                  </div>
                  <div className="text-left font-mono font-black text-sm shrink-0">
                    {absDiff === 0 ? '۰ (منطبق)' : `${absDiff.toLocaleString()} ${settings.currency} اختلاف`}
                  </div>
                </div>

                {/* Recent Cardex Movements for quick verification */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 flex items-center justify-between">
                    <span>ریز گردش‌های ثبت‌شده در کاردکس ({cardex.rows.length} ردیف)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const target = reconcileContact;
                        setReconcileContact(null);
                        setSelectedContactForCardex(target);
                      }}
                      className="text-indigo-600 hover:underline text-[11px]"
                    >
                      مشاهده و چاپ صورتحساب کامل ←
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto divide-y divide-slate-100">
                    {cardex.rows.map((item) => (
                      <div key={item.id} className="px-3 py-2 flex items-center justify-between text-[11px] hover:bg-slate-50">
                        <div>
                          <span className="font-mono text-slate-500 ml-2">{item.date}</span>
                          <span className="font-semibold text-slate-800">{item.description}</span>
                        </div>
                        <div className="font-mono flex items-center gap-3">
                          {item.debit > 0 && <span className="text-rose-600">بد: {item.debit.toLocaleString()}</span>}
                          {item.credit > 0 && <span className="text-emerald-600">بس: {item.credit.toLocaleString()}</span>}
                          <span className="font-bold text-slate-900">مانده: {item.balance.toLocaleString()} ({item.balanceType})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {absDiff !== 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50/70 border border-indigo-200 rounded-xl p-3">
                    <span className="font-semibold text-indigo-950">
                      ثبت سریع سند تسویه برای رفع مغایرت ({absDiff.toLocaleString()} {settings.currency}):
                    </span>
                    <div className="flex items-center gap-2">
                      {diffSigned > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            const cid = reconcileContact.id;
                            setReconcileContact(null);
                            setPaymentModalConfig({ type: 'receipt', contactId: cid });
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition"
                        >
                          ثبت رسید دریافت وجه از شخص
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const cid = reconcileContact.id;
                            setReconcileContact(null);
                            setPaymentModalConfig({ type: 'payment', contactId: cid });
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs transition"
                        >
                          ثبت رسید پرداخت وجه به شخص
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReconcileContact(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  بستن پنجره
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    value={creditLimit}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCreditLimit(parseNumberFromInput(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">مانده اول دوره</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      value={initialBalance}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setInitialBalance(parseNumberFromInput(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-left"
                    />
                    <select
                      value={initialBalanceType}
                      onChange={(e) => setInitialBalanceType(e.target.value as any)}
                      className="bg-slate-50 border border-slate-300 rounded-lg px-2 text-xs font-bold"
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

      {/* Quick Receipt / Payment Modal */}
      {paymentModalConfig && (
        <ReceiptPaymentModal
          type={paymentModalConfig.type}
          defaultContactId={paymentModalConfig.contactId}
          onClose={() => setPaymentModalConfig(null)}
        />
      )}
    </div>
  );
};
