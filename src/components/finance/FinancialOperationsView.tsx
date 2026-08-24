import React, { useState, useMemo } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { ChequeRecord, FinancialTransaction } from '../../types/accounting';
import {
  getCurrentShamsiDate,
  formatCurrency,
  toPersianDigits
} from '../../utils/dateUtils';
import { ReceiptPaymentModal } from './ReceiptPaymentModal';
import { TransferModal } from './TransferModal';
import { ChequeModal } from './ChequeModal';
import { ChequeActionModal } from './ChequeActionModal';
import {
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  FileCheck2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Building2,
  User,
  Calendar,
  CreditCard,
  Trash2,
  ExternalLink,
  ShieldCheck,
  FileText,
  Printer
} from 'lucide-react';

export const FinancialOperationsView: React.FC = () => {
  const {
    cheques,
    deleteCheque,
    financialTransactions,
    deleteFinancialTransaction,
    bankAccounts,
    vouchers,
    settings,
  } = useAccounting();

  // Navigation & Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<
    'all' | 'receipts' | 'payments' | 'transfers' | 'incoming_cheques' | 'outgoing_cheques'
  >('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'passed' | 'bounced'>('all');

  // Modals state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isChequeModalOpen, setIsChequeModalOpen] = useState(false);
  const [chequeModalType, setChequeModalType] = useState<'receive' | 'payment'>('receive');

  // Cheque Action Modal
  const [activeChequeAction, setActiveChequeAction] = useState<{
    cheque: ChequeRecord;
    action: 'pass' | 'bounce' | 'return';
  } | null>(null);

  // Print voucher / receipt
  const [printTransaction, setPrintTransaction] = useState<FinancialTransaction | ChequeRecord | null>(null);

  // Financial Stats & Metrics
  const stats = useMemo(() => {
    const totalReceipts = financialTransactions
      .filter((t) => t.type === 'receipt')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalPayments = financialTransactions
      .filter((t) => t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);

    const pendingIncomingCheques = cheques
      .filter((c) => c.type === 'receive' && c.status === 'pending')
      .reduce((sum, c) => sum + c.amount, 0);

    const pendingOutgoingCheques = cheques
      .filter((c) => c.type === 'payment' && c.status === 'pending')
      .reduce((sum, c) => sum + c.amount, 0);

    const passedCheques = cheques
      .filter((c) => c.status === 'passed')
      .reduce((sum, c) => sum + c.amount, 0);

    const totalCashBankBalance = bankAccounts.reduce((sum, b) => sum + (b.initialBalance || 0), 0);

    return {
      totalReceipts,
      totalPayments,
      pendingIncomingCheques,
      pendingOutgoingCheques,
      passedCheques,
      totalCashBankBalance,
    };
  }, [financialTransactions, cheques, bankAccounts]);

  // Filtered Financial Transactions
  const filteredTransactions = useMemo(() => {
    return financialTransactions.filter((tx) => {
      if (activeSubTab === 'receipts' && tx.type !== 'receipt') return false;
      if (activeSubTab === 'payments' && tx.type !== 'payment') return false;
      if (activeSubTab === 'transfers' && tx.type !== 'transfer') return false;
      if (activeSubTab === 'incoming_cheques' || activeSubTab === 'outgoing_cheques') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = tx.title?.toLowerCase().includes(q);
        const matchDesc = tx.description?.toLowerCase().includes(q);
        const matchContact = tx.contactName?.toLowerCase().includes(q);
        const matchTracking = tx.trackingNumber?.toLowerCase().includes(q);
        const matchSrc = tx.sourceAccountTitle?.toLowerCase().includes(q);
        const matchDest = tx.destinationAccountTitle?.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchContact || matchTracking || matchSrc || matchDest;
      }
      return true;
    });
  }, [financialTransactions, activeSubTab, searchQuery]);

  // Filtered Cheques
  const filteredCheques = useMemo(() => {
    return cheques.filter((chq) => {
      if (activeSubTab === 'receipts' || activeSubTab === 'payments' || activeSubTab === 'transfers') return false;
      if (activeSubTab === 'incoming_cheques' && chq.type !== 'receive') return false;
      if (activeSubTab === 'outgoing_cheques' && chq.type !== 'payment') return false;

      if (statusFilter !== 'all' && chq.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = chq.chequeNumber.toLowerCase().includes(q);
        const matchSayad = chq.sayadId?.toLowerCase().includes(q);
        const matchBank = chq.bankName.toLowerCase().includes(q);
        const matchContact = chq.contactName.toLowerCase().includes(q);
        const matchNotes = chq.notes?.toLowerCase().includes(q);
        return matchNum || matchSayad || matchBank || matchContact || matchNotes;
      }
      return true;
    });
  }, [cheques, activeSubTab, statusFilter, searchQuery]);

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('آیا از حذف این تراکنش مالی و ابطال سند حسابداری مربوطه اطمینان دارید؟')) {
      deleteFinancialTransaction(id);
    }
  };

  const handleDeleteCheque = (id: string) => {
    if (window.confirm('آیا از حذف این چک و کلیه اسناد حسابداری متصل به آن اطمینان دارید؟')) {
      deleteCheque(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Title */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                امور مالی، خزانه‌داری و اسناد دریافت و پرداخت
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                مدیریت جامع دریافت‌ها، پرداخت‌ها، نقل و انتقالات و مدیریت چک‌های صیادی با صدور اسناد دوبل تراز
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Receive button */}
          <button
            id="btn-open-receipt"
            onClick={() => setIsReceiptModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>دریافت وجه (به صندوق/بانک)</span>
          </button>

          {/* Payment button */}
          <button
            id="btn-open-payment"
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>پرداخت وجه (حواله/نقد)</span>
          </button>

          {/* Transfer button */}
          <button
            id="btn-open-transfer"
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition"
          >
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            <span>انتقال داخلی</span>
          </button>

          {/* Cheque Receive button */}
          <button
            id="btn-open-cheque-receive"
            onClick={() => {
              setChequeModalType('receive');
              setIsChequeModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition"
          >
            <FileCheck2 className="w-4 h-4 text-teal-600" />
            <span>ثبت چک دریافتی</span>
          </button>

          {/* Cheque Payment button */}
          <button
            id="btn-open-cheque-payment"
            onClick={() => {
              setChequeModalType('payment');
              setIsChequeModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition"
          >
            <CreditCard className="w-4 h-4 text-amber-600" />
            <span>صدور چک پرداختی</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Receipts */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">مجموع دریافتی‌های نقدی/بانکی</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-600">
            {formatCurrency(stats.totalReceipts, settings.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {toPersianDigits(financialTransactions.filter((t) => t.type === 'receipt').length)} فقره تراکنش دریافت
          </div>
        </div>

        {/* Total Payments */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">مجموع پرداختی‌های نقدی/بانکی</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-rose-600">
            {formatCurrency(stats.totalPayments, settings.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {toPersianDigits(financialTransactions.filter((t) => t.type === 'payment').length)} فقره تراکنش پرداخت
          </div>
        </div>

        {/* Pending Incoming Cheques */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">اسناد دریافتنی (چک‌های نزد صندوق)</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-teal-700">
            {formatCurrency(stats.pendingIncomingCheques, settings.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {toPersianDigits(cheques.filter((c) => c.type === 'receive' && c.status === 'pending').length)} چک در انتظار وصول
          </div>
        </div>

        {/* Pending Outgoing Cheques */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">اسناد پرداختنی (چک‌های صادره)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-amber-700">
            {formatCurrency(stats.pendingOutgoingCheques, settings.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {toPersianDigits(cheques.filter((c) => c.type === 'payment' && c.status === 'pending').length)} چک در انتظار سررسید
          </div>
        </div>
      </div>

      {/* Tabs and Filters Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveSubTab('all')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition ${
                activeSubTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              همه عملیات ({toPersianDigits(financialTransactions.length + cheques.length)})
            </button>

            <button
              onClick={() => setActiveSubTab('receipts')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition ${
                activeSubTab === 'receipts'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              دریافت‌ها ({toPersianDigits(financialTransactions.filter((t) => t.type === 'receipt').length)})
            </button>

            <button
              onClick={() => setActiveSubTab('payments')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition ${
                activeSubTab === 'payments'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              پرداخت‌ها ({toPersianDigits(financialTransactions.filter((t) => t.type === 'payment').length)})
            </button>

            <button
              onClick={() => setActiveSubTab('transfers')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition ${
                activeSubTab === 'transfers'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              انتقال داخلی ({toPersianDigits(financialTransactions.filter((t) => t.type === 'transfer').length)})
            </button>

            <button
              onClick={() => setActiveSubTab('incoming_cheques')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition ${
                activeSubTab === 'incoming_cheques'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              چک‌های دریافتی ({toPersianDigits(cheques.filter((c) => c.type === 'receive').length)})
            </button>

            <button
              onClick={() => setActiveSubTab('outgoing_cheques')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition ${
                activeSubTab === 'outgoing_cheques'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              چک‌های پرداختی ({toPersianDigits(cheques.filter((c) => c.type === 'payment').length)})
            </button>
          </div>

          {/* Search input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در چک‌ها، طرف‌حساب‌ها، شماره صیاد و فیش..."
              className="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-hidden transition"
            />
          </div>
        </div>

        {/* Cheque status filter if cheque tabs selected */}
        {(activeSubTab === 'incoming_cheques' || activeSubTab === 'outgoing_cheques' || activeSubTab === 'all') && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1">
              <Filter className="w-3 h-3" />
              فیلتر وضعیت چک:
            </span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              همه وضعیت‌ها
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              در انتظار وصول / سررسید
            </button>
            <button
              onClick={() => setStatusFilter('passed')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                statusFilter === 'passed' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              وصول / پاس شده
            </button>
            <button
              onClick={() => setStatusFilter('bounced')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                statusFilter === 'bounced' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              برگشتی / واخواست
            </button>
          </div>
        )}
      </div>

      {/* Main Content Table & Lists */}
      <div className="space-y-4">
        {/* Section 1: Financial Transactions (Receipts, Payments, Transfers) */}
        {(activeSubTab === 'all' ||
          activeSubTab === 'receipts' ||
          activeSubTab === 'payments' ||
          activeSubTab === 'transfers') &&
          filteredTransactions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800">
                    تراکنش‌های دریافت، پرداخت و انتقال وجه ({toPersianDigits(filteredTransactions.length)})
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">نوع عملیات</th>
                      <th className="p-3">شماره / تاریخ</th>
                      <th className="p-3">طرف‌حساب</th>
                      <th className="p-3">حساب واریز / برداشت</th>
                      <th className="p-3">شرح تراکنش</th>
                      <th className="p-3">کد پیگیری</th>
                      <th className="p-3 text-left">مبلغ ({settings.currency})</th>
                      <th className="p-3 text-center">سند دوبل</th>
                      <th className="p-3 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((tx) => {
                      const isRec = tx.type === 'receipt';
                      const isPay = tx.type === 'payment';
                      const isTrf = tx.type === 'transfer';

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isRec
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : isPay
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {isRec && <ArrowDownLeft className="w-3 h-3 text-emerald-600" />}
                              {isPay && <ArrowUpRight className="w-3 h-3 text-rose-600" />}
                              {isTrf && <ArrowLeftRight className="w-3 h-3 text-blue-600" />}
                              <span>{isRec ? 'دریافت وجه' : isPay ? 'پرداخت وجه' : 'انتقال داخلی'}</span>
                            </span>
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            <div className="font-bold text-slate-800 font-mono">#{tx.transactionNumber}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{tx.date}</div>
                          </td>

                          <td className="p-3 whitespace-nowrap font-medium text-slate-800">
                            {tx.contactName || (isTrf ? 'انتقال بین حساب‌ها' : 'طرف‌حساب عمومی')}
                          </td>

                          <td className="p-3 whitespace-nowrap text-slate-600">
                            {isTrf ? (
                              <div className="text-[11px]">
                                <span className="text-rose-600">{tx.sourceAccountTitle}</span>
                                <span className="mx-1 text-slate-400">←</span>
                                <span className="text-emerald-600">{tx.destinationAccountTitle}</span>
                              </div>
                            ) : (
                              <span>{tx.destinationAccountTitle || tx.sourceAccountTitle || 'حساب بانکی'}</span>
                            )}
                          </td>

                          <td className="p-3 text-slate-600 max-w-xs truncate" title={tx.description}>
                            {tx.description}
                          </td>

                          <td className="p-3 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                            {tx.trackingNumber || '-'}
                          </td>

                          <td className="p-3 whitespace-nowrap text-left font-bold font-mono text-xs">
                            <span
                              className={
                                isRec ? 'text-emerald-600' : isPay ? 'text-rose-600' : 'text-blue-600'
                              }
                            >
                              {formatCurrency(tx.amount, settings.currency)}
                            </span>
                          </td>

                          <td className="p-3 whitespace-nowrap text-center">
                            {tx.voucherId ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>صادر شد</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">-</span>
                            )}
                          </td>

                          <td className="p-3 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleDeleteTransaction(tx.id)}
                              title="حذف تراکنش و ابطال سند"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        {/* Section 2: Cheques Table (Incoming and Outgoing) */}
        {(activeSubTab === 'all' ||
          activeSubTab === 'incoming_cheques' ||
          activeSubTab === 'outgoing_cheques') &&
          filteredCheques.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-teal-600" />
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800">
                    اسناد دریافتنی و پرداختنی / دسته چک‌ها ({toPersianDigits(filteredCheques.length)})
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">نوع چک</th>
                      <th className="p-3">سریال چک / شناسه صیاد</th>
                      <th className="p-3">بانک و شعبه</th>
                      <th className="p-3">طرف‌حساب</th>
                      <th className="p-3">تاریخ سررسید</th>
                      <th className="p-3 text-left">مبلغ چک ({settings.currency})</th>
                      <th className="p-3 text-center">وضعیت چک</th>
                      <th className="p-3 text-center">عملیات بانکی</th>
                      <th className="p-3 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCheques.map((chq) => {
                      const isRec = chq.type === 'receive';
                      const isPending = chq.status === 'pending';
                      const isPassed = chq.status === 'passed';
                      const isBounced = chq.status === 'bounced';
                      const isReturned = chq.status === 'returned';

                      return (
                        <tr key={chq.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isRec
                                  ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {isRec ? (
                                <>
                                  <FileCheck2 className="w-3 h-3 text-teal-600" />
                                  <span>چک دریافتی</span>
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-3 h-3 text-amber-600" />
                                  <span>چک پرداختی</span>
                                </>
                              )}
                            </span>
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            <div className="font-bold text-slate-800 font-mono">
                              چک {chq.chequeNumber}
                            </div>
                            {chq.sayadId ? (
                              <div className="text-[10px] text-slate-400 font-mono tracking-wider">
                                صیاد: {chq.sayadId}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400">عادی</div>
                            )}
                          </td>

                          <td className="p-3 whitespace-nowrap text-slate-700">
                            <div className="font-medium">{chq.bankName}</div>
                            {chq.branchName && (
                              <div className="text-[10px] text-slate-400">{chq.branchName}</div>
                            )}
                          </td>

                          <td className="p-3 whitespace-nowrap font-medium text-slate-800">
                            <div>{chq.contactName}</div>
                            {chq.drawerName && chq.drawerName !== chq.contactName && (
                              <div className="text-[10px] text-slate-400">امضا: {chq.drawerName}</div>
                            )}
                          </td>

                          <td className="p-3 whitespace-nowrap font-mono">
                            <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                              {chq.dueDate}
                            </span>
                          </td>

                          <td className="p-3 whitespace-nowrap text-left font-bold font-mono text-xs text-indigo-700">
                            {formatCurrency(chq.amount, settings.currency)}
                          </td>

                          <td className="p-3 whitespace-nowrap text-center">
                            {isPending && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>در انتظار سررسید</span>
                              </span>
                            )}
                            {isPassed && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{isRec ? 'وصول شد' : 'پاس شد'}</span>
                              </span>
                            )}
                            {isBounced && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>برگشت خورده</span>
                              </span>
                            )}
                            {isReturned && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                <RotateCcw className="w-3 h-3 text-slate-500" />
                                <span>مسترد شده</span>
                              </span>
                            )}
                          </td>

                          <td className="p-3 whitespace-nowrap text-center">
                            {isPending ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setActiveChequeAction({ cheque: chq, action: 'pass' })}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-lg border border-emerald-200 transition"
                                >
                                  {isRec ? 'وصول چک' : 'پاس شدن'}
                                </button>
                                <button
                                  onClick={() => setActiveChequeAction({ cheque: chq, action: 'bounce' })}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-lg border border-rose-200 transition"
                                >
                                  برگشت
                                </button>
                                <button
                                  onClick={() => setActiveChequeAction({ cheque: chq, action: 'return' })}
                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                  title="استرداد چک"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                {chq.passedDate ? `تاریخ: ${chq.passedDate}` : 'بسته شده'}
                              </span>
                            )}
                          </td>

                          <td className="p-3 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleDeleteCheque(chq.id)}
                              title="حذف چک و اسناد متصل"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        {/* Empty State */}
        {filteredTransactions.length === 0 && filteredCheques.length === 0 && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">هیچ رکورد مالی یا چکی یافت نشد</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              می‌توانید با استفاده از دکمه‌های بالای صفحه، فرم‌های دریافت وجه، پرداخت وجه، انتقال داخلی یا چک‌های صیادی را ثبت کنید.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setIsReceiptModalOpen(true)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition"
              >
                ثبت دریافت وجه
              </button>
              <button
                onClick={() => {
                  setChequeModalType('receive');
                  setIsChequeModalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 transition"
              >
                ثبت چک دریافتی
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isReceiptModalOpen && (
        <ReceiptPaymentModal
          type="receipt"
          onClose={() => setIsReceiptModalOpen(false)}
        />
      )}

      {isPaymentModalOpen && (
        <ReceiptPaymentModal
          type="payment"
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}

      {isTransferModalOpen && (
        <TransferModal onClose={() => setIsTransferModalOpen(false)} />
      )}

      {isChequeModalOpen && (
        <ChequeModal
          type={chequeModalType}
          onClose={() => setIsChequeModalOpen(false)}
        />
      )}

      {activeChequeAction && (
        <ChequeActionModal
          cheque={activeChequeAction.cheque}
          action={activeChequeAction.action}
          onClose={() => setActiveChequeAction(null)}
        />
      )}
    </div>
  );
};
