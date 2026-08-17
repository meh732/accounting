import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { Invoice, InvoiceType } from '../../types/accounting';
import { formatCurrency, getCurrentShamsiDate } from '../../utils/dateUtils';
import { InvoicePrintModal } from './InvoicePrintModal';
import { InvoiceModal } from './InvoiceModal';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Printer,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface InvoicesViewProps {
  initialFilter?: InvoiceType | 'all';
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ initialFilter = 'all' }) => {
  const { invoices, deleteInvoice, settings } = useAccounting();

  const [activeTypeTab, setActiveTypeTab] = useState<InvoiceType | 'all'>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState<Invoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<InvoiceType>('sales');

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchType = activeTypeTab === 'all' || inv.type === activeTypeTab;
    const matchSearch =
      searchQuery === '' ||
      inv.invoiceNumber.toString().includes(searchQuery) ||
      inv.contactName.includes(searchQuery) ||
      (inv.notes && inv.notes.includes(searchQuery));
    return matchType && matchSearch;
  });

  // Calculate summary metrics
  const totalSales = invoices
    .filter((i) => i.type === 'sales')
    .reduce((sum, i) => sum + i.grandTotal, 0);

  const totalPurchases = invoices
    .filter((i) => i.type === 'purchase')
    .reduce((sum, i) => sum + i.grandTotal, 0);

  const totalSalesReturns = invoices
    .filter((i) => i.type === 'sales_return')
    .reduce((sum, i) => sum + i.grandTotal, 0);

  const totalPurchaseReturns = invoices
    .filter((i) => i.type === 'purchase_return')
    .reduce((sum, i) => sum + i.grandTotal, 0);

  const handleOpenCreate = (type: InvoiceType = 'sales') => {
    setModalDefaultType(type);
    setSelectedInvoiceForEdit(null);
    setShowCreateModal(true);
  };

  const handleDelete = (id: string, num: number) => {
    if (window.confirm(`آیا از حذف فاکتور شماره ${num} و بازگشت سند و انبار متناظر اطمینان دارید؟`)) {
      deleteInvoice(id);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <span>مدیریت خرید و فروش، فاکتورها و مرجوعی‌ها</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ثبت فاکتورهای رسمی، تسویه چندگانه نقدی و بانکی و صدور آنی سند دوبل حسابداری
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenCreate('sales')}
            id="btn-new-sales-invoice"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>فاکتور فروش جدید</span>
          </button>
          <button
            onClick={() => handleOpenCreate('purchase')}
            id="btn-new-purchase-invoice"
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>فاکتور خرید جدید</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>مجموع فاکتورهای فروش</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono mt-1">
            {formatCurrency(totalSales, settings.currency)}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>مجموع فاکتورهای خرید</span>
            <TrendingDown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono mt-1">
            {formatCurrency(totalPurchases, settings.currency)}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>مرجوعی از فروش</span>
            <RotateCcw className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-base font-bold text-rose-700 font-mono mt-1">
            {formatCurrency(totalSalesReturns, settings.currency)}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>مرجوعی از خرید</span>
            <RotateCcw className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-base font-bold text-sky-700 font-mono mt-1">
            {formatCurrency(totalPurchaseReturns, settings.currency)}
          </div>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'همه فاکتورها', count: invoices.length },
              { id: 'sales', label: 'فروش کالا', count: invoices.filter((i) => i.type === 'sales').length },
              { id: 'purchase', label: 'خرید کالا', count: invoices.filter((i) => i.type === 'purchase').length },
              { id: 'sales_return', label: 'مرجوعی فروش', count: invoices.filter((i) => i.type === 'sales_return').length },
              { id: 'purchase_return', label: 'مرجوعی خرید', count: invoices.filter((i) => i.type === 'purchase_return').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTypeTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
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
              placeholder="جستجو با شماره فاکتور، نام طرف حساب..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 font-mono">شماره</th>
                <th className="py-3 px-3">نوع فاکتور</th>
                <th className="py-3 px-3">طرف حساب</th>
                <th className="py-3 px-3">تاریخ</th>
                <th className="py-3 px-3 text-left">مبلغ کل ({settings.currency})</th>
                <th className="py-3 px-3">وضعیت تسویه</th>
                <th className="py-3 px-3 text-center">سند مالی</th>
                <th className="py-3 px-3 text-center w-28">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    هیچ فاکتوری با مشخصات مورد نظر یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const typeLabel =
                    inv.type === 'sales'
                      ? 'فروش'
                      : inv.type === 'purchase'
                      ? 'خرید'
                      : inv.type === 'sales_return'
                      ? 'مرجوعی فروش'
                      : 'مرجوعی خرید';

                  const typeColor =
                    inv.type === 'sales'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : inv.type === 'purchase'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : inv.type === 'sales_return'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-sky-50 text-sky-700 border-sky-200';

                  const isFullyPaid = inv.settlement.creditAmount === 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeColor}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">{inv.contactName}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{inv.date}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 text-left">
                        {formatCurrency(inv.grandTotal, settings.currency)}
                      </td>
                      <td className="py-3 px-3">
                        {isFullyPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>تسویه کامل</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3 h-3" />
                            <span>نسیه ({formatCurrency(inv.settlement.creditAmount, settings.currency)})</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-indigo-600 font-semibold">
                        {inv.voucherId ? `#${inv.voucherId.replace('vch-', '')}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedInvoiceForPrint(inv)}
                            title="چاپ فاکتور رسمی"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedInvoiceForEdit(inv);
                              setShowCreateModal(true);
                            }}
                            title="ویرایش فاکتور"
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                            title="حذف فاکتور"
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal for Create / Edit */}
      {showCreateModal && (
        <InvoiceModal
          initialType={modalDefaultType}
          invoiceToEdit={selectedInvoiceForEdit}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedInvoiceForEdit(null);
          }}
        />
      )}

      {/* Official Print Modal */}
      {selectedInvoiceForPrint && (
        <InvoicePrintModal
          invoice={selectedInvoiceForPrint}
          onClose={() => setSelectedInvoiceForPrint(null)}
        />
      )}
    </div>
  );
};
