import React, { useState, useEffect, useRef } from 'react';
import {
  Invoice,
  InvoiceItem,
  InvoiceType,
  MultiSettlement,
  ChequePayment
} from '../../types/accounting';
import { useAccounting } from '../../context/AccountingContext';
import {
  getCurrentShamsiDate,
  formatCurrency,
  parseNumberFromInput,
  numberToWordsPersian
} from '../../utils/dateUtils';
import {
  X,
  Plus,
  Trash2,
  Receipt,
  ShoppingCart,
  DollarSign,
  Landmark,
  CreditCard,
  FileCheck,
  Percent,
  Calculator,
  UserPlus,
  ArrowLeft,
  ArrowRight,
  CornerDownLeft,
  Split,
  Layers,
  Sparkles,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Tag
} from 'lucide-react';
import { SearchableProductSelect } from '../common/SearchableProductSelect';

interface InvoiceModalProps {
  initialType?: InvoiceType;
  invoiceToEdit?: Invoice | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  initialType = 'sales',
  invoiceToEdit,
  onClose,
}) => {
  const {
    contacts,
    products,
    bankAccounts,
    settings,
    addInvoice,
    updateInvoice,
    invoices,
    addContact
  } = useAccounting();

  // Mobile active tab view
  const [mobileTab, setMobileTab] = useState<'info' | 'items' | 'settlement'>('items');

  // Invoice basic details
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(invoiceToEdit?.type || initialType);
  const [invoiceNumber, setInvoiceNumber] = useState<number>(() => {
    if (invoiceToEdit) return invoiceToEdit.invoiceNumber;
    const max = invoices.length > 0 ? Math.max(...invoices.map((i) => i.invoiceNumber)) : 1000;
    return max + 1;
  });
  const [date, setDate] = useState<string>(invoiceToEdit?.date || getCurrentShamsiDate());
  const [dueDate, setDueDate] = useState<string>(invoiceToEdit?.dueDate || '');
  const [selectedContactId, setSelectedContactId] = useState<string>(invoiceToEdit?.contactId || '');
  const [notes, setNotes] = useState<string>(invoiceToEdit?.notes || '');
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(invoiceToEdit?.totalInvoiceDiscount || 0);

  // Quick contact inline add state
  const [showQuickContact, setShowQuickContact] = useState(false);
  const [quickContactName, setQuickContactName] = useState('');
  const [quickContactPhone, setQuickContactPhone] = useState('');

  // Keyboard shortcut hints toggle
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Invoice Items
  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (invoiceToEdit && invoiceToEdit.items.length > 0) {
      return invoiceToEdit.items;
    }
    return [
      {
        id: `item-${Date.now()}-1`,
        productId: '',
        productTitle: '',
        unit: 'عدد',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: settings.defaultTaxRate ?? 10,
        taxAmount: 0,
        totalPrice: 0,
      },
    ];
  });

  // Multi-Settlement State
  const [cashList, setCashList] = useState<{ cashId: string; cashTitle: string; amount: number }[]>(
    invoiceToEdit?.settlement?.cashPayments || []
  );
  const [bankList, setBankList] = useState<
    { bankId: string; bankTitle: string; amount: number; trackingCode?: string }[]
  >(invoiceToEdit?.settlement?.bankPayments || []);
  const [chequeList, setChequeList] = useState<ChequePayment[]>(
    invoiceToEdit?.settlement?.chequePayments || []
  );
  const [discountSettlement, setDiscountSettlement] = useState<number>(
    invoiceToEdit?.settlement?.discountAmount || 0
  );

  // Filter contacts based on invoice type
  const isPurchaseMode = invoiceType === 'purchase' || invoiceType === 'purchase_return';
  const availableContacts = contacts.filter((c) => {
    if (isPurchaseMode) return c.type === 'supplier' || c.type === 'both';
    return c.type === 'customer' || c.type === 'both' || c.type === 'other';
  });

  // Auto select first contact if none selected
  useEffect(() => {
    if (!selectedContactId && availableContacts.length > 0) {
      setSelectedContactId(availableContacts[0].id);
    }
  }, [invoiceType, availableContacts, selectedContactId]);

  // Recalculate row amounts
  const updateItemField = (index: number, field: keyof InvoiceItem, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: val };

      if (field === 'productId') {
        const prd = products.find((p) => p.id === val);
        if (prd) {
          row.productTitle = prd.title;
          row.unit = prd.unit || 'عدد';
          row.unitPrice = isPurchaseMode ? prd.buyPrice : prd.salePrice;
        }
      }

      // Calculations
      const sub = (row.quantity || 0) * (row.unitPrice || 0);
      const discAmt = row.discountPercent > 0 ? (sub * row.discountPercent) / 100 : (row.discountAmount || 0);
      const afterDisc = Math.max(0, sub - discAmt);
      const taxAmt = row.taxPercent > 0 ? (afterDisc * row.taxPercent) / 100 : 0;
      const total = afterDisc + taxAmt;

      row.discountAmount = Math.round(discAmt);
      row.taxAmount = Math.round(taxAmt);
      row.totalPrice = Math.round(total);

      next[index] = row;
      return next;
    });
  };

  const addItemRow = (focusNewRow = true) => {
    const newId = `item-${Date.now()}-${items.length + 1}`;
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        productId: '',
        productTitle: '',
        unit: 'عدد',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: settings.defaultTaxRate ?? 10,
        taxAmount: 0,
        totalPrice: 0,
      },
    ]);

    if (focusNewRow) {
      setTimeout(() => {
        const el = document.getElementById(`input-item-${items.length}-product`);
        if (el) {
          el.focus();
        }
      }, 60);
    }
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      // Clear single row instead of deleting
      setItems([
        {
          id: `item-${Date.now()}-1`,
          productId: '',
          productTitle: '',
          unit: 'عدد',
          quantity: 1,
          unitPrice: 0,
          discountPercent: 0,
          discountAmount: 0,
          taxPercent: settings.defaultTaxRate ?? 10,
          taxAmount: 0,
          totalPrice: 0,
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Grand Totals Calculation
  const subTotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const totalItemsDiscount = items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  const totalTax = items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
  const grandTotal = Math.max(0, subTotal - totalItemsDiscount - invoiceDiscount + totalTax);

  // Settlement Calculations
  const totalCashPaid = cashList.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalBankPaid = bankList.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalCheques = chequeList.reduce((sum, ch) => sum + (ch.amount || 0), 0);
  const totalPaid = totalCashPaid + totalBankPaid + totalCheques + discountSettlement;
  const isOverpaid = totalPaid > grandTotal;
  const overpaidAmount = isOverpaid ? totalPaid - grandTotal : 0;
  const remainingCredit = isOverpaid ? 0 : grandTotal - totalPaid;
  const isSettlementBalanced = !isOverpaid && totalPaid + remainingCredit === grandTotal;

  // ----------------------------------------------------
  // MULTI-BANK & SETTLEMENT HELPERS
  // ----------------------------------------------------
  // Auto-balance settlement if overpaid or unbalanced
  const handleAutoBalanceSettlement = () => {
    if (!isOverpaid) return;
    let excess = totalPaid - grandTotal;

    // 1. First reduce settlement discount if present
    if (discountSettlement > 0 && excess > 0) {
      const reduce = Math.min(discountSettlement, excess);
      setDiscountSettlement((prev) => Math.max(0, prev - reduce));
      excess -= reduce;
    }

    // 2. Reduce cheque payments
    if (chequeList.length > 0 && excess > 0) {
      setChequeList((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0 && excess > 0; i--) {
          const reduce = Math.min(next[i].amount, excess);
          next[i] = { ...next[i], amount: next[i].amount - reduce };
          excess -= reduce;
        }
        return next;
      });
    }

    // 3. Reduce bank payments
    if (bankList.length > 0 && excess > 0) {
      setBankList((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0 && excess > 0; i--) {
          const reduce = Math.min(next[i].amount, excess);
          next[i] = { ...next[i], amount: next[i].amount - reduce };
          excess -= reduce;
        }
        return next;
      });
    }

    // 4. Reduce cash payments
    if (cashList.length > 0 && excess > 0) {
      setCashList((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0 && excess > 0; i--) {
          const reduce = Math.min(next[i].amount, excess);
          next[i] = { ...next[i], amount: next[i].amount - reduce };
          excess -= reduce;
        }
        return next;
      });
    }
  };

  // Add another bank account row
  const addBankItem = (targetBankId?: string, defaultAmount?: number) => {
    const banks = bankAccounts.filter((b) => b.type === 'bank' || b.type === 'pos');
    const bAcc = targetBankId ? bankAccounts.find((b) => b.id === targetBankId) : (banks[bankList.length % banks.length] || bankAccounts[0]);
    const fillAmount = defaultAmount !== undefined ? defaultAmount : (remainingCredit > 0 ? remainingCredit : 0);

    setBankList((prev) => [
      ...prev,
      {
        bankId: bAcc?.id || 'bank-1',
        bankTitle: bAcc?.title || 'حساب بانکی',
        amount: fillAmount,
        trackingCode: '',
      },
    ]);
  };

  // Assign remaining balance to a specific bank row
  const assignRemainingToBank = (index: number) => {
    setBankList((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          return { ...item, amount: item.amount + remainingCredit };
        }
        return item;
      })
    );
  };

  // Evenly distribute remaining balance across all existing bank rows
  const splitRemainingAcrossBanks = () => {
    if (bankList.length === 0) {
      // Add all registered banks and split grand total
      const availableBanks = bankAccounts.filter((b) => b.type === 'bank' || b.type === 'pos');
      if (availableBanks.length === 0) return;
      const count = availableBanks.length;
      const portion = Math.floor(grandTotal / count);
      const remainder = grandTotal % count;

      setBankList(
        availableBanks.map((b, idx) => ({
          bankId: b.id,
          bankTitle: b.title,
          amount: portion + (idx === 0 ? remainder : 0),
          trackingCode: '',
        }))
      );
      return;
    }

    // Split among existing bank rows
    const count = bankList.length;
    const totalToSplit = totalBankPaid + remainingCredit;
    const portion = Math.floor(totalToSplit / count);
    const remainder = totalToSplit % count;

    setBankList((prev) =>
      prev.map((item, idx) => ({
        ...item,
        amount: portion + (idx === 0 ? remainder : 0),
      }))
    );
  };

  // Add Cash payment item
  const addCashItem = (defaultAmount?: number) => {
    const cashAccounts = bankAccounts.filter((b) => b.type === 'cash');
    const cashAcc = cashAccounts[cashList.length % (cashAccounts.length || 1)] || bankAccounts[0];
    const fillAmount = defaultAmount !== undefined ? defaultAmount : (remainingCredit > 0 ? remainingCredit : 0);

    setCashList((prev) => [
      ...prev,
      {
        cashId: cashAcc?.id || 'cash-1',
        cashTitle: cashAcc?.title || 'صندوق اصلی',
        amount: fillAmount,
      },
    ]);
  };

  // Assign remaining balance to cash row
  const assignRemainingToCash = (index: number) => {
    setCashList((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          return { ...item, amount: item.amount + remainingCredit };
        }
        return item;
      })
    );
  };

  // Add Cheque item
  const addChequeItem = () => {
    setChequeList((prev) => [
      ...prev,
      {
        id: `chq-${Date.now()}-${prev.length + 1}`,
        chequeNumber: '',
        bankName: 'بانک ملت',
        amount: remainingCredit > 0 ? remainingCredit : 0,
        dueDate: getCurrentShamsiDate(),
        sayadNumber: '',
        status: 'pending',
      },
    ]);
  };

  // Quick helper to settle all remaining with POS/Bank or Cash
  const handleQuickSettleAll = (method: 'pos' | 'cash' | 'clear') => {
    if (method === 'clear') {
      setBankList([]);
      setCashList([]);
      setChequeList([]);
      return;
    }

    if (method === 'cash') {
      const primaryCash = bankAccounts.find((b) => b.type === 'cash') || bankAccounts[0];
      if (primaryCash) {
        setCashList([
          {
            cashId: primaryCash.id,
            cashTitle: primaryCash.title,
            amount: grandTotal,
          },
        ]);
        setBankList([]);
        setChequeList([]);
      }
    } else {
      const primaryBank =
        bankAccounts.find((b) => b.type === 'pos' || b.type === 'bank') || bankAccounts[0];
      if (primaryBank) {
        setBankList([
          {
            bankId: primaryBank.id,
            bankTitle: primaryBank.title,
            amount: grandTotal,
            trackingCode: `POS-${Math.floor(100000 + Math.random() * 900000)}`,
          },
        ]);
        setCashList([]);
        setChequeList([]);
      }
    }
  };

  // ----------------------------------------------------
  // KEYBOARD NAVIGATION (Enter to next field / row)
  // ----------------------------------------------------
  const handleKeyDown = (
    e: React.KeyboardEvent,
    nextTargetId?: string,
    isLastOfRow?: boolean,
    rowIndex?: number
  ) => {
    // Submit with Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
      return;
    }

    // Escape closes modal
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    // Enter navigation
    if (e.key === 'Enter') {
      e.preventDefault();

      if (isLastOfRow && rowIndex !== undefined) {
        if (rowIndex === items.length - 1) {
          // Add next row and focus its product input
          addItemRow(true);
        } else {
          // Focus next row product
          const nextRowEl = document.getElementById(`input-item-${rowIndex + 1}-product`);
          if (nextRowEl) {
            nextRowEl.focus();
            if ('select' in nextRowEl && typeof nextRowEl.select === 'function') {
              (nextRowEl as HTMLInputElement).select();
            }
          }
        }
        return;
      }

      if (nextTargetId) {
        const nextEl = document.getElementById(nextTargetId);
        if (nextEl) {
          nextEl.focus();
          if ('select' in nextEl && typeof nextEl.select === 'function') {
            (nextEl as HTMLInputElement).select();
          }
        }
      }
    }
  };

  // Focus and select input on focus
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  // Inline Contact Add
  const handleAddQuickContact = () => {
    if (!quickContactName.trim()) return;
    const newCnt = addContact({
      name: quickContactName.trim(),
      phone: quickContactPhone.trim(),
      mobile: quickContactPhone.trim(),
      type: isPurchaseMode ? 'supplier' : 'customer',
      creditLimit: 100000000,
      initialBalance: 0,
      initialBalanceType: 'debit',
    });
    setSelectedContactId(newCnt.id);
    setQuickContactName('');
    setQuickContactPhone('');
    setShowQuickContact(false);
  };

  // Save invoice handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedContactId) {
      alert('لطفاً طرف حساب فاکتور را مشخص فرمایید.');
      setMobileTab('info');
      return;
    }

    const validItems = items.filter((it) => (it.productTitle.trim() !== '' || it.productId !== '') && it.quantity > 0);
    if (validItems.length === 0) {
      alert('حداقل یک سطر کالا با تعداد معتبر در فاکتور الزامی است.');
      setMobileTab('items');
      return;
    }

    // Settlement Total Validation (جمع نسیه + تخفیف + بانک‌ها + نقد + چک با جمع کل فاکتور حتماً باید همخوانی داشته باشد)
    if (isOverpaid) {
      alert(
        `خطای تراز تسویه فاکتور: مجموع مبالغ تسویه شده (نقد + بانک + چک + تخفیف تسویه = ${formatCurrency(totalPaid, settings.currency)}) مبلغ ${formatCurrency(overpaidAmount, settings.currency)} بیشتر از جمع کل فاکتور (${formatCurrency(grandTotal, settings.currency)}) است.\n\nلطفاً مبالغ تسویه یا تخفیف را اصلاح نمایید یا از دکمه «تراز خودکار تسویه» استفاده فرمایید.`
      );
      setMobileTab('settlement');
      return;
    }

    const contact = contacts.find((c) => c.id === selectedContactId);

    const settlement: MultiSettlement = {
      cashPayments: cashList.filter((c) => (c.amount || 0) > 0),
      bankPayments: bankList.filter((b) => (b.amount || 0) > 0),
      chequePayments: chequeList.filter((ch) => (ch.amount || 0) > 0),
      creditAmount: remainingCredit,
      discountAmount: discountSettlement,
    };

    if (invoiceToEdit) {
      updateInvoice(invoiceToEdit.id, {
        type: invoiceType,
        invoiceNumber,
        date,
        dueDate,
        contactId: selectedContactId,
        contactName: contact?.name || 'مشتری',
        contactPhone: contact?.phone || contact?.mobile,
        contactAddress: contact?.address,
        contactEconomicCode: contact?.economicCode || contact?.nationalCode,
        items: validItems,
        totalItemsDiscount,
        totalInvoiceDiscount: invoiceDiscount,
        totalTax,
        subTotal,
        grandTotal,
        settlement,
        notes,
      });
    } else {
      addInvoice({
        type: invoiceType,
        invoiceNumber,
        date,
        dueDate,
        contactId: selectedContactId,
        contactName: contact?.name || 'مشتری',
        contactPhone: contact?.phone || contact?.mobile,
        contactAddress: contact?.address,
        contactEconomicCode: contact?.economicCode || contact?.nationalCode,
        items: validItems,
        totalItemsDiscount,
        totalInvoiceDiscount: invoiceDiscount,
        totalTax,
        subTotal,
        grandTotal,
        settlement,
        notes,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-3 md:p-4 z-50 overflow-y-auto">
      <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[94vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Modal Header */}
        <div className="px-3 sm:px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-none">
                  {invoiceToEdit ? `ویرایش فاکتور شماره ${invoiceToEdit.invoiceNumber}` : 'ثبت سریع و هوشمند فاکتور'}
                </h3>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200 hidden md:inline-flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" />
                  ورود سریع با اینتر (Enter)
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:inline-block mt-0.5">
                تخصیص همزمان چند واریزی بانکی، پوز، چک و نسیه با صدور اتوماتیک سند دوبل
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
              title="راهنمای کلیدهای میانبر سریع"
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Keyboard navigation quick help strip */}
        {showKeyboardHelp && (
          <div className="bg-indigo-900 text-indigo-100 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-indigo-800 animate-in slide-in-from-top-1">
            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1">
                <kbd className="bg-indigo-800 border border-indigo-700 px-1.5 py-0.5 rounded font-mono text-[10px] text-white">Enter</kbd>
                انتقال به فیلد بعدی / ایجاد خودکار ردیف جدید
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-indigo-800 border border-indigo-700 px-1.5 py-0.5 rounded font-mono text-[10px] text-white">Ctrl + Enter</kbd>
                ثبت قطعی و نهایی فاکتور
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-indigo-800 border border-indigo-700 px-1.5 py-0.5 rounded font-mono text-[10px] text-white">Esc</kbd>
                بستن پنجره
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowKeyboardHelp(false)}
              className="text-[11px] text-indigo-300 hover:text-white"
            >
              بستن راهنما ✕
            </button>
          </div>
        )}

        {/* Mobile Navigation Tabs (Shown on small screens for easy mobile touch) */}
        <div className="sm:hidden flex border-b border-slate-200 bg-slate-100 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMobileTab('info')}
            className={`flex-1 py-2 text-center border-b-2 transition ${
              mobileTab === 'info'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600'
            }`}
          >
            مشخصات طرف‌حساب
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('items')}
            className={`flex-1 py-2 text-center border-b-2 transition ${
              mobileTab === 'items'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600'
            }`}
          >
            اقلام کالا ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('settlement')}
            className={`flex-1 py-2 text-center border-b-2 transition ${
              mobileTab === 'settlement'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600'
            }`}
          >
            تسویه و چندبانک
            {bankList.length > 0 && ` (${bankList.length})`}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {/* SECTION 1: Top Header Info (Type, Number, Date, Customer) */}
          <div className={`${mobileTab === 'info' ? 'block' : 'hidden sm:block'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {/* Invoice Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع فاکتور</label>
                <select
                  id="input-invoice-type"
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                  onKeyDown={(e) => handleKeyDown(e, 'input-invoice-number')}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:border-indigo-500 outline-hidden"
                >
                  <option value="sales">فاکتور فروش کالا</option>
                  <option value="purchase">فاکتور خرید کالا</option>
                  <option value="sales_return">مرجوعی از فروش</option>
                  <option value="purchase_return">مرجوعی از خرید</option>
                </select>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شماره فاکتور</label>
                <input
                  type="number"
                  id="input-invoice-number"
                  value={invoiceNumber}
                  onFocus={handleInputFocus}
                  onChange={(e) => setInvoiceNumber(parseInt(e.target.value) || 0)}
                  onKeyDown={(e) => handleKeyDown(e, 'input-invoice-date')}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:border-indigo-500 outline-hidden text-left"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ فاکتور (شمسی)</label>
                <input
                  type="text"
                  id="input-invoice-date"
                  value={date}
                  onFocus={handleInputFocus}
                  onChange={(e) => setDate(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'select-invoice-contact')}
                  placeholder="1403/05/20"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:border-indigo-500 outline-hidden text-center"
                  required
                />
              </div>

              {/* Contact Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    {isPurchaseMode ? 'تامین‌کننده' : 'مشتری / طرف حساب'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickContact(!showQuickContact)}
                    className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5 font-bold"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>شخص جدید</span>
                  </button>
                </div>
                <select
                  id="select-invoice-contact"
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'input-item-0-product')}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-900 focus:border-indigo-500 outline-hidden"
                  required
                >
                  <option value="">انتخاب طرف حساب...</option>
                  {availableContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.companyName ? `(${c.companyName})` : ''} {c.mobile ? `- ${c.mobile}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Contact Inline Drawer */}
            {showQuickContact && (
              <div className="mt-2 bg-indigo-50/80 p-3 rounded-xl border border-indigo-200 flex flex-wrap items-center gap-2.5 text-xs">
                <span className="font-bold text-indigo-900">تعریف سریع شخص:</span>
                <input
                  type="text"
                  placeholder="نام شخص یا شرکت..."
                  value={quickContactName}
                  onChange={(e) => setQuickContactName(e.target.value)}
                  className="bg-white border border-indigo-300 rounded-lg px-2.5 py-1 text-xs outline-hidden"
                />
                <input
                  type="text"
                  placeholder="شماره تماس..."
                  value={quickContactPhone}
                  onChange={(e) => setQuickContactPhone(e.target.value)}
                  className="bg-white border border-indigo-300 rounded-lg px-2.5 py-1 text-xs outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddQuickContact}
                  className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-indigo-700 transition"
                >
                  ثبت و انتخاب
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: Items Table / Rapid Keyboard Entry */}
          <div className={`${mobileTab === 'items' ? 'block' : 'hidden sm:block'} space-y-2`}>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-indigo-600" />
                <span>اقلام و کالاهای فاکتور</span>
                <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">
                  (با زدن Enter روی هر فیلد، خودکار به فیلد و سطر بعدی می‌رود)
                </span>
              </h4>
              <button
                type="button"
                onClick={() => addItemRow(true)}
                id="btn-add-item-row"
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن ردیف کالا</span>
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs hidden md:block min-h-[180px]">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2 w-8 text-center">#</th>
                    <th className="py-2 px-2 min-w-[220px]">انتخاب یا نام کالا</th>
                    <th className="py-2 px-2 w-20 text-center">واحد</th>
                    <th className="py-2 px-2 w-20 text-center">تعداد</th>
                    <th className="py-2 px-2 w-32 text-left">قیمت واحد ({settings.currency})</th>
                    <th className="py-2 px-2 w-20 text-center">تخفیف %</th>
                    <th className="py-2 px-2 w-20 text-center">مالیات %</th>
                    <th className="py-2 px-3 w-32 text-left">مبلغ کل ({settings.currency})</th>
                    <th className="py-2 px-2 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2 px-2 text-center text-slate-400 font-mono font-bold">{idx + 1}</td>
                      <td className="py-2 px-2">
                        <SearchableProductSelect
                          id={`input-item-${idx}-product`}
                          products={products}
                          selectedProductId={row.productId}
                          value={row.productTitle}
                          currency={settings.currency}
                          isPurchaseMode={isPurchaseMode}
                          placeholder="نام کالا یا جستجو در انبار..."
                          onChange={(pId, pObj, customTitle) => {
                            if (pObj) {
                              updateItemField(idx, 'productId', pObj.id);
                              updateItemField(idx, 'productTitle', pObj.title);
                              updateItemField(idx, 'unit', pObj.unit || 'عدد');
                              const price = isPurchaseMode ? pObj.buyPrice : pObj.salePrice;
                              updateItemField(idx, 'unitPrice', price);
                            } else {
                              updateItemField(idx, 'productId', pId || '');
                              updateItemField(idx, 'productTitle', customTitle !== undefined ? customTitle : '');
                            }
                          }}
                          onEnterNext={() => {
                            setTimeout(() => {
                              const qEl = document.getElementById(`input-item-${idx}-qty`);
                              if (qEl) {
                                qEl.focus();
                                (qEl as HTMLInputElement).select();
                              }
                            }, 50);
                          }}
                          onKeyDown={(e) => handleKeyDown(e, `input-item-${idx}-qty`)}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          id={`input-item-${idx}-unit`}
                          value={row.unit}
                          onFocus={handleInputFocus}
                          onChange={(e) => updateItemField(idx, 'unit', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, `input-item-${idx}-qty`)}
                          className="w-full text-center border border-slate-200 rounded px-1 py-1 text-xs outline-hidden"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          id={`input-item-${idx}-qty`}
                          min="0.01"
                          step="any"
                          value={row.quantity}
                          onFocus={handleInputFocus}
                          onChange={(e) => updateItemField(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          onKeyDown={(e) => handleKeyDown(e, `input-item-${idx}-price`)}
                          className="w-full text-center border border-slate-300 focus:border-indigo-500 rounded px-1 py-1 text-xs font-mono font-bold outline-hidden bg-white"
                          required
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          id={`input-item-${idx}-price`}
                          value={row.unitPrice}
                          onFocus={handleInputFocus}
                          onChange={(e) => updateItemField(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          onKeyDown={(e) => handleKeyDown(e, `input-item-${idx}-discount`)}
                          className="w-full text-left font-mono font-bold border border-slate-300 focus:border-indigo-500 rounded px-2 py-1 text-xs outline-hidden bg-white"
                          required
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          id={`input-item-${idx}-discount`}
                          min="0"
                          max="100"
                          value={row.discountPercent}
                          onFocus={handleInputFocus}
                          onChange={(e) => updateItemField(idx, 'discountPercent', parseFloat(e.target.value) || 0)}
                          onKeyDown={(e) => handleKeyDown(e, `input-item-${idx}-tax`)}
                          className="w-full text-center border border-slate-200 rounded px-1 py-1 text-xs font-mono outline-hidden"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          id={`input-item-${idx}-tax`}
                          min="0"
                          max="100"
                          value={row.taxPercent}
                          onFocus={handleInputFocus}
                          onChange={(e) => updateItemField(idx, 'taxPercent', parseFloat(e.target.value) || 0)}
                          onKeyDown={(e) => handleKeyDown(e, undefined, true, idx)}
                          className="w-full text-center border border-slate-200 rounded px-1 py-1 text-xs font-mono outline-hidden"
                        />
                      </td>
                      <td className="py-2 px-3 text-left font-mono font-bold text-slate-900">
                        {row.totalPrice.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-slate-400 hover:text-rose-600 transition p-1"
                          title="حذف سطر"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch Cards View */}
            <div className="md:hidden space-y-2.5">
              {items.map((row, idx) => (
                <div key={row.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <span>سطر کالا</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 flex items-center gap-1 text-[11px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-700 font-bold block mb-1">نام و جستجوی کالا از انبار:</label>
                    <SearchableProductSelect
                      products={products}
                      selectedProductId={row.productId}
                      value={row.productTitle}
                      currency={settings.currency}
                      isPurchaseMode={isPurchaseMode}
                      placeholder="نام کالا یا انتخاب از لیست..."
                      onChange={(pId, pObj, customTitle) => {
                        if (pObj) {
                          updateItemField(idx, 'productId', pObj.id);
                          updateItemField(idx, 'productTitle', pObj.title);
                          updateItemField(idx, 'unit', pObj.unit || 'عدد');
                          const price = isPurchaseMode ? pObj.buyPrice : pObj.salePrice;
                          updateItemField(idx, 'unitPrice', price);
                        } else {
                          updateItemField(idx, 'productId', pId || '');
                          updateItemField(idx, 'productTitle', customTitle !== undefined ? customTitle : '');
                        }
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-600 font-bold block mb-0.5">تعداد ({row.unit}):</label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={row.quantity}
                        onFocus={handleInputFocus}
                        onChange={(e) => updateItemField(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 font-bold block mb-0.5">قیمت واحد ({settings.currency}):</label>
                      <input
                        type="number"
                        value={row.unitPrice}
                        onFocus={handleInputFocus}
                        onChange={(e) => updateItemField(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-left"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-indigo-50/50 p-2 rounded-lg text-[11px]">
                    <div className="flex gap-3">
                      <span>تخفیف: {row.discountPercent}%</span>
                      <span>مالیات: {row.taxPercent}%</span>
                    </div>
                    <span className="font-bold text-indigo-900 font-mono">
                      مبلغ: {row.totalPrice.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Notes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">توضیحات و شرایط فاکتور</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توضیحات، شماره سفارش، شرایط تحویل یا گارانتی..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-hidden focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>جمع ناخالص اقلام:</span>
                <span className="font-mono font-semibold">{formatCurrency(subTotal, settings.currency)}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>تخفیف ردیف‌ها:</span>
                <span className="font-mono">-{formatCurrency(totalItemsDiscount, settings.currency)}</span>
              </div>
              <div className="flex justify-between items-center text-rose-600">
                <span>تخفیف کلی پای فاکتور:</span>
                <input
                  type="number"
                  value={invoiceDiscount}
                  onFocus={handleInputFocus}
                  onChange={(e) => setInvoiceDiscount(parseFloat(e.target.value) || 0)}
                  className="w-28 text-left bg-white border border-slate-200 rounded px-2 py-0.5 font-mono text-xs outline-hidden font-bold"
                />
              </div>
              <div className="flex justify-between text-slate-600">
                <span>مالیات ارزش افزوده:</span>
                <span className="font-mono">{formatCurrency(totalTax, settings.currency)}</span>
              </div>
              <div className="border-t border-slate-300 pt-1.5 flex justify-between font-bold text-xs sm:text-sm text-slate-900">
                <span>مبلغ قابل پرداخت:</span>
                <span className="font-mono text-sm sm:text-base text-indigo-700">
                  {formatCurrency(grandTotal, settings.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: MULTI-BANK & MULTI-PAYMENT SETTLEMENT ENGINE */}
          <div className={`${mobileTab === 'settlement' ? 'block' : 'hidden sm:block'}`}>
            <div className="border-2 border-indigo-200 bg-indigo-50/40 rounded-2xl p-3 sm:p-4 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                      تسویه و دریافت/پرداخت چندگانه (امکان واریز به چند بانک، پوز و چک)
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      می‌توانید مبالغ مختلف را به صورت همزمان به ۲ یا چند حساب بانکی مختلف، صندوق و چک ثبت نمایید.
                    </span>
                  </div>
                </div>

                {/* Quick distribution buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={splitRemainingAcrossBanks}
                    title="تقسیم مساوی مبلغ بین بانک‌ها"
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold shadow-xs transition"
                  >
                    <Split className="w-3 h-3" />
                    <span>توزیع مساوی بین بانک‌ها</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSettleAll('pos')}
                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                  >
                    تسویه کارتخوان/بانک
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSettleAll('cash')}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                  >
                    تسویه نقدی
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSettleAll('clear')}
                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-[11px] transition"
                  >
                    نسیه کامل
                  </button>
                </div>
              </div>

              {/* Add Payment Type Trigger Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addBankItem()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-300 text-indigo-700 rounded-xl text-xs font-bold shadow-xs transition transform hover:-translate-y-0.5"
                >
                  <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                  <span>+ افزودن واریزی بانکی / پوز (POS)</span>
                </button>
                <button
                  type="button"
                  onClick={() => addCashItem()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-700 rounded-xl text-xs font-bold shadow-xs transition transform hover:-translate-y-0.5"
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+ افزودن دریافت/پرداخت نقد (صندوق)</span>
                </button>
                <button
                  type="button"
                  onClick={addChequeItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-800 rounded-xl text-xs font-bold shadow-xs transition transform hover:-translate-y-0.5"
                >
                  <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>+ ثبت چک صیادی</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (discountSettlement === 0 && remainingCredit > 0) {
                      setDiscountSettlement(remainingCredit);
                    } else if (discountSettlement === 0) {
                      setDiscountSettlement(1000);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 rounded-xl text-xs font-bold shadow-xs transition transform hover:-translate-y-0.5"
                >
                  <Tag className="w-3.5 h-3.5 text-rose-600" />
                  <span>+ تخفیف تسویه پایانی</span>
                </button>
              </div>

              {/* Settlement Discount Row */}
              {discountSettlement > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-rose-50/70 p-2.5 rounded-xl border border-rose-200 text-xs">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <span className="font-bold text-rose-950">تخفیف تسویه پایانی فاکتور:</span>
                      <span className="text-[10px] text-rose-700 block">
                        تخفیف اعطایی هنگام تسویه (به عنوان تخفیف نقدی در سند حسابداری ثبت می‌شود)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={discountSettlement}
                      onFocus={handleInputFocus}
                      onChange={(e) => setDiscountSettlement(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-36 font-mono font-bold text-left bg-white border border-rose-300 focus:border-rose-500 rounded-lg px-2.5 py-1 text-xs outline-hidden text-rose-800"
                    />
                    <span className="text-slate-500 text-xs">{settings.currency}</span>
                    <button
                      type="button"
                      onClick={() => setDiscountSettlement(0)}
                      className="p-1 text-rose-400 hover:text-rose-700 rounded transition"
                      title="حذف تخفیف تسویه"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* 1. Multi-Bank Payments List */}
              {bankList.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                      <span>واریزی‌های بانکی و دستگاه‌های کارتخوان ({bankList.length} ردیف):</span>
                    </span>
                    <span className="font-mono text-indigo-700">
                      مجموع بانک‌ها: {formatCurrency(totalBankPaid, settings.currency)}
                    </span>
                  </div>

                  {bankList.map((b, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-indigo-100 shadow-xs text-xs"
                    >
                      {/* Select Bank */}
                      <div className="sm:col-span-4">
                        <label className="text-[10px] text-slate-500 font-bold block sm:hidden">حساب بانکی:</label>
                        <select
                          value={b.bankId}
                          onChange={(e) => {
                            const bank = bankAccounts.find((bk) => bk.id === e.target.value);
                            setBankList((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, bankId: e.target.value, bankTitle: bank?.title || '' } : item
                              )
                            );
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-hidden"
                        >
                          {bankAccounts
                            .filter((bk) => bk.type === 'bank' || bk.type === 'pos')
                            .map((bk) => (
                              <option key={bk.id} value={bk.id}>
                                {bk.title} ({bk.bankName} - {bk.accountNumber})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Bank Amount */}
                      <div className="sm:col-span-4">
                        <label className="text-[10px] text-slate-500 font-bold block sm:hidden">مبلغ واریزی:</label>
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="مبلغ واریزی..."
                            value={b.amount}
                            onFocus={handleInputFocus}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setBankList((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, amount: val } : item))
                              );
                            }}
                            className="w-full font-mono font-bold text-left bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-500 rounded-lg pl-2 pr-2 py-1.5 text-xs outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Tracking / Reference Code */}
                      <div className="sm:col-span-3">
                        <label className="text-[10px] text-slate-500 font-bold block sm:hidden">شماره پیگیری/ارجاع:</label>
                        <input
                          type="text"
                          placeholder="کد پیگیری / شماره ارجاع..."
                          value={b.trackingCode || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBankList((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, trackingCode: val } : item))
                            );
                          }}
                          className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-500 rounded-lg px-2 py-1.5 text-xs font-mono outline-hidden"
                        />
                      </div>

                      {/* Actions (Assign remainder or Delete) */}
                      <div className="sm:col-span-1 flex items-center justify-end gap-1">
                        {remainingCredit > 0 && (
                          <button
                            type="button"
                            onClick={() => assignRemainingToBank(idx)}
                            title={`افزودن مانده (${formatCurrency(remainingCredit, settings.currency)}) به این بانک`}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition font-mono text-[10px] font-bold"
                          >
                            +مانده
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setBankList((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="حذف این واریزی"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 2. Cash Payments List */}
              {cashList.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-emerald-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>دریافت و پرداخت‌های نقدی (صندوق‌ها):</span>
                    </span>
                    <span className="font-mono text-emerald-700">
                      مجموع نقد: {formatCurrency(totalCashPaid, settings.currency)}
                    </span>
                  </div>

                  {cashList.map((c, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-emerald-100 shadow-xs text-xs"
                    >
                      <div className="sm:col-span-6">
                        <select
                          value={c.cashId}
                          onChange={(e) => {
                            const cash = bankAccounts.find((bk) => bk.id === e.target.value);
                            setCashList((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, cashId: e.target.value, cashTitle: cash?.title || '' } : item
                              )
                            );
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:bg-white outline-hidden"
                        >
                          {bankAccounts
                            .filter((bk) => bk.type === 'cash')
                            .map((bk) => (
                              <option key={bk.id} value={bk.id}>
                                {bk.title}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="sm:col-span-5">
                        <input
                          type="number"
                          placeholder="مبلغ نقد..."
                          value={c.amount}
                          onFocus={handleInputFocus}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setCashList((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, amount: val } : item))
                            );
                          }}
                          className="w-full font-mono font-bold text-left bg-slate-50 border border-slate-300 focus:bg-white rounded-lg px-2.5 py-1.5 text-xs outline-hidden"
                        />
                      </div>
                      <div className="sm:col-span-1 flex items-center justify-end gap-1">
                        {remainingCredit > 0 && (
                          <button
                            type="button"
                            onClick={() => assignRemainingToCash(idx)}
                            title="افزودن مانده به این صندوق"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition font-mono text-[10px] font-bold"
                          >
                            +مانده
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setCashList((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. Cheques List */}
              {chequeList.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-amber-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>اسناد دریافتنی / پرداختنی (چک‌های صیادی):</span>
                    </span>
                    <span className="font-mono text-amber-700">
                      مجموع چک‌ها: {formatCurrency(totalCheques, settings.currency)}
                    </span>
                  </div>

                  {chequeList.map((ch, idx) => (
                    <div
                      key={ch.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-amber-100 shadow-xs text-xs"
                    >
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          placeholder="نام بانک صادرکننده..."
                          value={ch.bankName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setChequeList((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, bankName: val } : item))
                            );
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-hidden"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="شماره چک..."
                          value={ch.chequeNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            setChequeList((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, chequeNumber: val } : item))
                            );
                          }}
                          className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs outline-hidden"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="سررسید (۱۴۰۳/۰۶/۳۰)..."
                          value={ch.dueDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setChequeList((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, dueDate: val } : item))
                            );
                          }}
                          className="w-full font-mono text-center bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs outline-hidden"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="شناسه صیاد..."
                          value={ch.sayadNumber || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setChequeList((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, sayadNumber: val } : item))
                            );
                          }}
                          className="w-full font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 outline-hidden"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          placeholder="مبلغ چک..."
                          value={ch.amount}
                          onFocus={handleInputFocus}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setChequeList((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, amount: val } : item))
                            );
                          }}
                          className="w-full font-mono font-bold text-left bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs outline-hidden"
                        />
                      </div>
                      <div className="sm:col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => setChequeList((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Settlement Summary Real-time Breakdown & Equation */}
              <div className="pt-2.5 text-xs border-t border-indigo-100 bg-white/90 p-3.5 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-800 text-xs">خلاصه اقلام تسویه و حساب نسیه:</span>
                  
                  {isOverpaid ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[11px] border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                        <span>مبالغ تسویه {formatCurrency(overpaidAmount, settings.currency)} بیشتر از فاکتور است!</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleAutoBalanceSettlement}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition"
                      >
                        ⚡ تراز خودکار تسویه
                      </button>
                    </div>
                  ) : remainingCredit === 0 ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px] border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>تراز تسویه ۱۰۰٪ منطبق است (فاکتور کاملاً تسویه شده)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[11px] border border-amber-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>تراز تسویه صحیح است (مانده در حساب نسیه طرف حساب)</span>
                    </span>
                  )}
                </div>

                {/* Mathematical Visual Equation */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded">
                      جمع فاکتور: {formatCurrency(grandTotal, settings.currency)}
                    </span>
                    <span className="font-bold text-slate-400">=</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${remainingCredit > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'}`}>
                      نسیه: {formatCurrency(remainingCredit, settings.currency)}
                    </span>
                    <span className="font-bold text-slate-400">+</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${totalBankPaid > 0 ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'bg-slate-100 text-slate-600'}`}>
                      بانک: {formatCurrency(totalBankPaid, settings.currency)}
                    </span>
                    <span className="font-bold text-slate-400">+</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${totalCashPaid > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                      نقد: {formatCurrency(totalCashPaid, settings.currency)}
                    </span>
                    <span className="font-bold text-slate-400">+</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${totalCheques > 0 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-600'}`}>
                      چک: {formatCurrency(totalCheques, settings.currency)}
                    </span>
                    {discountSettlement > 0 && (
                      <>
                        <span className="font-bold text-slate-400">+</span>
                        <span className="bg-rose-100 text-rose-900 font-bold px-2 py-0.5 rounded">
                          تخفیف تسویه: {formatCurrency(discountSettlement, settings.currency)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer / Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 bg-slate-50 -mx-3 -mb-3 sm:-mx-4 sm:-mb-4 p-3 sm:p-4 rounded-b-2xl sticky bottom-0 z-20">
            <div className="text-xs">
              <span className="text-slate-500 hidden sm:inline">جمع نهایی فاکتور: </span>
              <span className="font-mono font-bold text-sm sm:text-base text-indigo-700">
                {formatCurrency(grandTotal, settings.currency)}
              </span>
              {isOverpaid && (
                <span className="mr-2 text-rose-600 font-bold text-xs">
                  (عدم تراز تسویه: +{formatCurrency(overpaidAmount, settings.currency)})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 sm:px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition"
              >
                انصراف (Esc)
              </button>
              <button
                type="submit"
                id="btn-submit-invoice"
                disabled={isOverpaid}
                className={`flex items-center gap-1.5 px-5 sm:px-6 py-2 text-xs font-bold text-white rounded-xl shadow-md transition transform ${
                  isOverpaid
                    ? 'bg-slate-400 cursor-not-allowed opacity-70'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 hover:-translate-y-0.5'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>{invoiceToEdit ? 'ذخیره فاکتور' : 'ثبت قطعی فاکتور (Ctrl+Enter)'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
