import {
  AccountCategory,
  Contact,
  BankAccount,
  Product,
  JournalVoucher,
  Invoice,
  Expense,
  FinancialTransaction,
  ChequeRecord
} from '../types/accounting';

export interface ContactCardexRow {
  id: string;
  date: string;
  documentType:
    | 'سند افتتاحیه'
    | 'فاکتور فروش'
    | 'فاکتور خرید'
    | 'مرجوعی فروش'
    | 'مرجوعی خرید'
    | 'دریافت/پرداخت'
    | 'سند حسابداری';
  documentNumber: string | number;
  description: string;
  debit: number;   // بدهکار (افزایش طلب ما از مشتری یا کاهش بدهی ما به تامین‌کننده)
  credit: number;  // بستانکار (کاهش طلب ما یا افزایش بدهی ما)
  balance: number; // مانده متوالی (مثبت = بدهکار، منفی = بستانکار)
  balanceType: 'بدهکار' | 'بستانکار' | 'تسویه';
}

export function calculateContactCardex(
  contact: Contact,
  invoices: Invoice[],
  vouchers: JournalVoucher[],
  expenses: Expense[],
  financialTransactions: FinancialTransaction[] = [],
  cheques: ChequeRecord[] = []
): {
  rows: ContactCardexRow[];
  totalDebit: number;
  totalCredit: number;
  finalBalance: number;
  finalBalanceType: 'بدهکار' | 'بستانکار' | 'تسویه';
} {
  let rows: ContactCardexRow[] = [];

  // 1. Initial balance
  if (contact.initialBalance > 0) {
    const isDebit = contact.initialBalanceType === 'debit';
    rows.push({
      id: 'init-bal',
      date: contact.createdAt || '1403/01/01',
      documentType: 'سند افتتاحیه',
      documentNumber: '-',
      description: `مانده اول دوره شخص (${isDebit ? 'بدهکار' : 'بستانکار'})`,
      debit: isDebit ? contact.initialBalance : 0,
      credit: !isDebit ? contact.initialBalance : 0,
      balance: 0,
      balanceType: isDebit ? 'بدهکار' : 'بستانکار',
    });
  }

  // 2. Invoices related to this contact
  invoices
    .filter((inv) => inv.contactId === contact.id)
    .forEach((inv) => {
      const totalPaidAtInvoice =
        (inv.settlement?.cashPayments || []).reduce((s, c) => s + (c.amount || 0), 0) +
        (inv.settlement?.bankPayments || []).reduce((s, b) => s + (b.amount || 0), 0) +
        (inv.settlement?.chequePayments || []).reduce((s, ch) => s + (ch.amount || 0), 0) +
        (inv.settlement?.discountAmount || 0);

      if (inv.type === 'sales') {
        // فاکتور فروش: مشتری بدهکار می‌شود به کل مبلغ
        rows.push({
          id: `inv-${inv.id}`,
          date: inv.date,
          documentType: 'فاکتور فروش',
          documentNumber: inv.invoiceNumber,
          description: `فاکتور فروش شماره ${inv.invoiceNumber}${inv.notes ? ' - ' + inv.notes : ''}`,
          debit: inv.grandTotal,
          credit: 0,
          balance: 0,
          balanceType: 'بدهکار',
        });

        // تسویه‌های نقدی / بانکی / چک در زمان فاکتور باعث بستانکار شدن مشتری می‌شود
        if (totalPaidAtInvoice > 0) {
          rows.push({
            id: `pay-${inv.id}`,
            date: inv.date,
            documentType: 'دریافت/پرداخت',
            documentNumber: inv.invoiceNumber,
            description: `تسویه وجه فاکتور فروش ${inv.invoiceNumber} (نقد/بانک/چک/تخفیف)`,
            debit: 0,
            credit: totalPaidAtInvoice,
            balance: 0,
            balanceType: 'بستانکار',
          });
        }
      } else if (inv.type === 'purchase') {
        // فاکتور خرید: تامین‌کننده بستانکار می‌شود
        rows.push({
          id: `inv-${inv.id}`,
          date: inv.date,
          documentType: 'فاکتور خرید',
          documentNumber: inv.invoiceNumber,
          description: `فاکتور خرید شماره ${inv.invoiceNumber}${inv.notes ? ' - ' + inv.notes : ''}`,
          debit: 0,
          credit: inv.grandTotal,
          balance: 0,
          balanceType: 'بستانکار',
        });

        // تسویه پرداخت شده به تامین کننده
        if (totalPaidAtInvoice > 0) {
          rows.push({
            id: `pay-${inv.id}`,
            date: inv.date,
            documentType: 'دریافت/پرداخت',
            documentNumber: inv.invoiceNumber,
            description: `پرداخت وجه فاکتور خرید ${inv.invoiceNumber} (بانک/چک/نقد)`,
            debit: totalPaidAtInvoice,
            credit: 0,
            balance: 0,
            balanceType: 'بدهکار',
          });
        }
      } else if (inv.type === 'sales_return') {
        // مرجوعی فروش: بستانکار شدن مشتری
        rows.push({
          id: `ret-${inv.id}`,
          date: inv.date,
          documentType: 'مرجوعی فروش',
          documentNumber: inv.invoiceNumber,
          description: `برگشت از فروش فاکتور ${inv.invoiceNumber}`,
          debit: 0,
          credit: inv.grandTotal,
          balance: 0,
          balanceType: 'بستانکار',
        });

        if (totalPaidAtInvoice > 0) {
          rows.push({
            id: `ret-pay-${inv.id}`,
            date: inv.date,
            documentType: 'دریافت/پرداخت',
            documentNumber: inv.invoiceNumber,
            description: `استرداد وجه مرجوعی فروش ${inv.invoiceNumber}`,
            debit: totalPaidAtInvoice,
            credit: 0,
            balance: 0,
            balanceType: 'بدهکار',
          });
        }
      } else if (inv.type === 'purchase_return') {
        // مرجوعی خرید: بدهکار شدن تامین‌کننده
        rows.push({
          id: `ret-${inv.id}`,
          date: inv.date,
          documentType: 'مرجوعی خرید',
          documentNumber: inv.invoiceNumber,
          description: `برگشت از خرید فاکتور ${inv.invoiceNumber}`,
          debit: inv.grandTotal,
          credit: 0,
          balance: 0,
          balanceType: 'بدهکار',
        });

        if (totalPaidAtInvoice > 0) {
          rows.push({
            id: `ret-pay-${inv.id}`,
            date: inv.date,
            documentType: 'دریافت/پرداخت',
            documentNumber: inv.invoiceNumber,
            description: `دریافت وجه بابت مرجوعی خرید ${inv.invoiceNumber}`,
            debit: 0,
            credit: totalPaidAtInvoice,
            balance: 0,
            balanceType: 'بستانکار',
          });
        }
      }
    });

  // 3. Treasury receipts/payments, standalone cheques, and manual journal vouchers with this contact
  vouchers
    .filter(
      (v) =>
        v.sourceType !== 'invoice' &&
        v.sourceType !== 'stocktaking' &&
        v.type !== 'closing' &&
        v.type !== 'opening'
    )
    .forEach((v) => {
      v.items.forEach((item) => {
        const isMatchedAuto =
          v.isAutoGenerated &&
          (item.contactId === contact.id ||
            item.tafsiliId === contact.id ||
            (item.tafsiliTitle === contact.name &&
              (item.accountCode === '10301' ||
                item.accountCode === '30101' ||
                item.accountCode.startsWith('403'))));

        const isMatchedManual =
          !v.isAutoGenerated &&
          ((item.contactId && item.contactId === contact.id) ||
            (item.tafsiliId && item.tafsiliId === contact.id) ||
            (item.tafsiliTitle && item.tafsiliTitle === contact.name) ||
            (item.description &&
              item.description.includes(contact.name) &&
              (item.accountCode === '10301' ||
                item.accountCode === '30101' ||
                item.accountCode.startsWith('403'))));

        if (isMatchedAuto || isMatchedManual) {
          const docType: ContactCardexRow['documentType'] =
            v.sourceType === 'receipt' || v.sourceType === 'payment' || v.sourceType === 'cheque'
              ? 'دریافت/پرداخت'
              : 'سند حسابداری';

          rows.push({
            id: `vch-${v.id}-${item.id}`,
            date: v.date,
            documentType: docType,
            documentNumber: v.voucherNumber,
            description: item.description || v.description,
            debit: item.debit,
            credit: item.credit,
            balance: 0,
            balanceType: item.debit > item.credit ? 'بدهکار' : 'بستانکار',
          });
        }
      });
    });

  // 4. Fallback for financialTransactions (receipt/payment) if autoGenerateVouchers was disabled
  const voucherSourceIds = new Set(vouchers.map((v) => v.sourceId).filter(Boolean));
  financialTransactions
    .filter((tx) => tx.contactId === contact.id && !voucherSourceIds.has(tx.id))
    .forEach((tx) => {
      if (tx.type === 'receipt') {
        rows.push({
          id: `ftx-${tx.id}`,
          date: tx.date,
          documentType: 'دریافت/پرداخت',
          documentNumber: tx.transactionNumber,
          description: tx.description || tx.title,
          debit: 0,
          credit: tx.amount,
          balance: 0,
          balanceType: 'بستانکار',
        });
      } else if (tx.type === 'payment') {
        rows.push({
          id: `ftx-${tx.id}`,
          date: tx.date,
          documentType: 'دریافت/پرداخت',
          documentNumber: tx.transactionNumber,
          description: tx.description || tx.title,
          debit: tx.amount,
          credit: 0,
          balance: 0,
          balanceType: 'بدهکار',
        });
      }
    });

  // 5. Fallback for standalone cheques ONLY (exclude invoice cheques which were already counted in Step 2!)
  cheques
    .filter(
      (ch) =>
        ch.contactId === contact.id &&
        !ch.invoiceId &&
        !ch.id.startsWith('chq-inv-') &&
        !voucherSourceIds.has(ch.id) &&
        ch.status !== 'returned'
    )
    .forEach((ch) => {
      const isReceivable = ch.type === 'receive';
      rows.push({
        id: `chq-${ch.id}`,
        date: ch.issueDate || ch.dueDate,
        documentType: 'دریافت/پرداخت',
        documentNumber: ch.chequeNumber,
        description: `${isReceivable ? 'چک دریافتی' : 'چک پرداختی'} ش ${ch.chequeNumber} (${ch.bankName})`,
        debit: isReceivable ? 0 : ch.amount,
        credit: isReceivable ? ch.amount : 0,
        balance: 0,
        balanceType: isReceivable ? 'بستانکار' : 'بدهکار',
      });
    });

  // Sort chronologically by date
  rows.sort((a, b) => a.date.localeCompare(b.date));

  // Compute running balance
  let running = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  rows = rows.map((r) => {
    totalDebit += r.debit;
    totalCredit += r.credit;
    running += r.debit - r.credit;
    const balanceType: 'بدهکار' | 'بستانکار' | 'تسویه' =
      running > 0 ? 'بدهکار' : running < 0 ? 'بستانکار' : 'تسویه';
    return {
      ...r,
      balance: Math.abs(running),
      balanceType,
    };
  });

  const finalBalance = Math.abs(running);
  const finalBalanceType: 'بدهکار' | 'بستانکار' | 'تسویه' =
    running > 0 ? 'بدهکار' : running < 0 ? 'بستانکار' : 'تسویه';

  return { rows, totalDebit, totalCredit, finalBalance, finalBalanceType };
}

export interface BankCardexRow {
  id: string;
  date: string;
  documentType: string;
  documentNumber: string | number;
  description: string;
  inflow: number;  // واریز / بدهکار بانک
  outflow: number; // برداشت / بستانکار بانک
  balance: number; // مانده حساب
}

export function calculateBankCardex(
  bank: BankAccount,
  invoices: Invoice[],
  expenses: Expense[],
  vouchers: JournalVoucher[],
  financialTransactions: FinancialTransaction[] = [],
  cheques: ChequeRecord[] = []
): { rows: BankCardexRow[]; totalInflow: number; totalOutflow: number; currentBalance: number } {
  let rows: BankCardexRow[] = [];

  // Initial balance
  if (bank.initialBalance > 0) {
    rows.push({
      id: 'init-bank',
      date: '1403/01/01',
      documentType: 'موجودی افتتاحیه',
      documentNumber: '-',
      description: `موجودی اولیه ${bank.title}`,
      inflow: bank.initialBalance,
      outflow: 0,
      balance: bank.initialBalance,
    });
  }

  // Bank receipts & payments in Invoices
  invoices.forEach((inv) => {
    const isInflowInvoice = inv.type === 'sales' || inv.type === 'purchase_return';
    if (bank.type === 'cash') {
      (inv.settlement?.cashPayments || [])
        .filter((c) => c.cashId === bank.id || c.cashTitle === bank.title)
        .forEach((c) => {
          rows.push({
            id: `inv-cash-${inv.id}-${c.cashId}`,
            date: inv.date,
            documentType: isInflowInvoice ? 'دریافت نقد فاکتور' : 'پرداخت نقد فاکتور',
            documentNumber: inv.invoiceNumber,
            description: `${isInflowInvoice ? 'دریافت' : 'پرداخت'} نقد فاکتور شماره ${inv.invoiceNumber} - ${inv.contactName}`,
            inflow: isInflowInvoice ? c.amount : 0,
            outflow: isInflowInvoice ? 0 : c.amount,
            balance: 0,
          });
        });
    } else {
      (inv.settlement?.bankPayments || [])
        .filter((b) => b.bankId === bank.id || b.bankTitle === bank.title)
        .forEach((b) => {
          rows.push({
            id: `inv-bank-${inv.id}-${b.bankId}`,
            date: inv.date,
            documentType: isInflowInvoice
              ? bank.type === 'pos'
                ? 'تراکنش کارتخوان'
                : 'واریز بانکی فاکتور'
              : 'حواله بانکی فاکتور',
            documentNumber: inv.invoiceNumber,
            description: `${isInflowInvoice ? 'دریافت' : 'پرداخت'} وجه فاکتور شماره ${inv.invoiceNumber} - ${inv.contactName}${b.trackingCode ? ' (کد: ' + b.trackingCode + ')' : ''}`,
            inflow: isInflowInvoice ? b.amount : 0,
            outflow: isInflowInvoice ? 0 : b.amount,
            balance: 0,
          });
        });
    }
  });

  // Expenses paid from this account
  expenses
    .filter(
      (exp) =>
        exp.sourceAccountId === bank.id ||
        (!exp.sourceAccountId && exp.sourceAccountTitle === bank.title)
    )
    .forEach((exp) => {
      rows.push({
        id: `exp-${exp.id}`,
        date: exp.date,
        documentType: 'ثبت هزینه',
        documentNumber: exp.expenseNumber,
        description: `${exp.accountTitle} - ${exp.description || exp.title || ''}${exp.beneficiary ? ' (به: ' + exp.beneficiary + ')' : ''}`,
        inflow: 0,
        outflow: exp.amount,
        balance: 0,
      });
    });

  // Treasury receipts, payments, transfers, cheque clearances, and manual vouchers involving this bank/cash
  vouchers
    .filter(
      (v) =>
        v.sourceType !== 'invoice' &&
        v.sourceType !== 'expense' &&
        v.sourceType !== 'stocktaking' &&
        v.type !== 'closing' &&
        v.type !== 'opening'
    )
    .forEach((v) => {
      v.items.forEach((item) => {
        const isMatchedAuto =
          v.isAutoGenerated &&
          item.accountCode.startsWith('101') &&
          ((item.tafsiliId && item.tafsiliId === bank.id) ||
            (item.tafsiliTitle && item.tafsiliTitle === bank.title));

        const isMatchedManual =
          !v.isAutoGenerated &&
          item.accountCode.startsWith('101') &&
          ((item.tafsiliId && item.tafsiliId === bank.id) ||
            (item.tafsiliTitle && item.tafsiliTitle === bank.title) ||
            (item.description && item.description.includes(bank.title)));

        if (isMatchedAuto || isMatchedManual) {
          const docLabel =
            v.sourceType === 'receipt'
              ? 'دریافت وجه خزانه‌داری'
              : v.sourceType === 'payment'
              ? 'پرداخت وجه خزانه‌داری'
              : v.sourceType === 'transfer'
              ? 'انتقال داخلی وجه'
              : v.sourceType === 'cheque'
              ? 'وصول / پاس چک'
              : item.debit > 0
              ? 'سند حسابداری (واریز)'
              : 'سند حسابداری (برداشت)';

          if (item.debit > 0) {
            rows.push({
              id: `vch-deb-${v.id}-${item.id}`,
              date: v.date,
              documentType: docLabel,
              documentNumber: v.voucherNumber,
              description: item.description || v.description,
              inflow: item.debit,
              outflow: 0,
              balance: 0,
            });
          }
          if (item.credit > 0) {
            rows.push({
              id: `vch-crd-${v.id}-${item.id}`,
              date: v.date,
              documentType: docLabel,
              documentNumber: v.voucherNumber,
              description: item.description || v.description,
              inflow: 0,
              outflow: item.credit,
              balance: 0,
            });
          }
        }
      });
    });

  // Fallback for financialTransactions if autoGenerateVouchers was disabled
  const bankVoucherSourceIds = new Set(vouchers.map((v) => v.sourceId).filter(Boolean));
  financialTransactions
    .filter((tx) => !bankVoucherSourceIds.has(tx.id))
    .forEach((tx) => {
      if ((tx.type === 'receipt' || tx.type === 'transfer') && tx.destinationAccountId === bank.id) {
        rows.push({
          id: `ftx-in-${tx.id}`,
          date: tx.date,
          documentType: tx.type === 'transfer' ? 'انتقال داخلی وجه' : 'دریافت وجه خزانه‌داری',
          documentNumber: tx.transactionNumber,
          description: tx.description || tx.title,
          inflow: tx.amount,
          outflow: 0,
          balance: 0,
        });
      }
      if ((tx.type === 'payment' || tx.type === 'transfer') && tx.sourceAccountId === bank.id) {
        rows.push({
          id: `ftx-out-${tx.id}`,
          date: tx.date,
          documentType: tx.type === 'transfer' ? 'انتقال داخلی وجه' : 'پرداخت وجه خزانه‌داری',
          documentNumber: tx.transactionNumber,
          description: tx.description || tx.title,
          inflow: 0,
          outflow: tx.amount,
          balance: 0,
        });
      }
    });

  // Fallback for passed cheques if autoGenerateVouchers was disabled
  cheques
    .filter(
      (ch) =>
        ch.status === 'passed' &&
        (ch.passedBankId === bank.id || ch.bankAccountId === bank.id) &&
        !bankVoucherSourceIds.has(ch.id)
    )
    .forEach((ch) => {
      const isReceivable = ch.type === 'receive';
      rows.push({
        id: `chq-pass-${ch.id}`,
        date: ch.passedDate || ch.dueDate,
        documentType: 'وصول / پاس چک',
        documentNumber: ch.chequeNumber,
        description: `وصول چک ${isReceivable ? 'دریافتی' : 'پرداختی'} ش ${ch.chequeNumber}`,
        inflow: isReceivable ? ch.amount : 0,
        outflow: isReceivable ? 0 : ch.amount,
        balance: 0,
      });
    });

  rows.sort((a, b) => a.date.localeCompare(b.date));

  let running = 0;
  let totalInflow = 0;
  let totalOutflow = 0;

  rows = rows.map((r) => {
    totalInflow += r.inflow;
    totalOutflow += r.outflow;
    running += r.inflow - r.outflow;
    return {
      ...r,
      balance: running,
    };
  });

  return { rows, totalInflow, totalOutflow, currentBalance: running };
}

export interface ProductCardexRow {
  id: string;
  date: string;
  documentType: string;
  documentNumber: string | number;
  contactName: string;
  notes?: string;
  inQuantity: number;
  inUnitPrice: number;
  inTotalPrice: number;
  outQuantity: number;
  outUnitPrice: number;
  outTotalPrice: number;
  remainingQuantity: number;
  remainingValue: number;
}

export function calculateProductCardex(
  product: Product,
  invoices: Invoice[]
): {
  rows: ProductCardexRow[];
  totalInQty: number;
  totalOutQty: number;
  currentStock: number;
  currentStockValue: number;
} {
  let rows: ProductCardexRow[] = [];

  // Calculate net movement from invoices and stockAdjustments to handle legacy products where initialStock wasn't explicitly set
  let invoiceAndAdjDelta = 0;
  invoices.forEach((inv) => {
    const item = inv.items.find((i) => i.productId === product.id);
    if (!item) return;
    if (inv.type === 'purchase' || inv.type === 'sales_return') {
      invoiceAndAdjDelta += item.quantity;
    } else if (inv.type === 'sales' || inv.type === 'purchase_return') {
      invoiceAndAdjDelta -= item.quantity;
    }
  });
  (product.stockAdjustments || []).forEach((adj) => {
    invoiceAndAdjDelta += adj.diffQty;
  });

  const effectiveInitialStock =
    product.initialStock !== undefined && product.initialStock !== null
      ? product.initialStock
      : Math.max(0, product.stockQuantity - invoiceAndAdjDelta);

  // 1. Initial stock
  if (effectiveInitialStock > 0) {
    rows.push({
      id: 'init-stock',
      date: '1403/01/01',
      documentType: 'موجودی اول دوره',
      documentNumber: '-',
      contactName: 'انبار مرکزی',
      inQuantity: effectiveInitialStock,
      inUnitPrice: product.buyPrice,
      inTotalPrice: effectiveInitialStock * product.buyPrice,
      outQuantity: 0,
      outUnitPrice: 0,
      outTotalPrice: 0,
      remainingQuantity: effectiveInitialStock,
      remainingValue: effectiveInitialStock * product.buyPrice,
    });
  }

  // 2. Purchases, Sales, and Returns
  invoices.forEach((inv) => {
    const item = inv.items.find((i) => i.productId === product.id);
    if (!item) return;

    if (inv.type === 'purchase') {
      rows.push({
        id: `inv-pur-${inv.id}`,
        date: inv.date,
        documentType: 'فاکتور خرید',
        documentNumber: inv.invoiceNumber,
        contactName: inv.contactName,
        inQuantity: item.quantity,
        inUnitPrice: item.unitPrice,
        inTotalPrice: item.quantity * item.unitPrice,
        outQuantity: 0,
        outUnitPrice: 0,
        outTotalPrice: 0,
        remainingQuantity: 0,
        remainingValue: 0,
      });
    } else if (inv.type === 'sales') {
      rows.push({
        id: `inv-sale-${inv.id}`,
        date: inv.date,
        documentType: 'فاکتور فروش',
        documentNumber: inv.invoiceNumber,
        contactName: inv.contactName,
        inQuantity: 0,
        inUnitPrice: 0,
        inTotalPrice: 0,
        outQuantity: item.quantity,
        outUnitPrice: item.unitPrice,
        outTotalPrice: item.quantity * item.unitPrice,
        remainingQuantity: 0,
        remainingValue: 0,
      });
    } else if (inv.type === 'sales_return') {
      rows.push({
        id: `inv-ret-sale-${inv.id}`,
        date: inv.date,
        documentType: 'مرجوعی از فروش',
        documentNumber: inv.invoiceNumber,
        contactName: inv.contactName,
        inQuantity: item.quantity,
        inUnitPrice: item.unitPrice,
        inTotalPrice: item.quantity * item.unitPrice,
        outQuantity: 0,
        outUnitPrice: 0,
        outTotalPrice: 0,
        remainingQuantity: 0,
        remainingValue: 0,
      });
    } else if (inv.type === 'purchase_return') {
      rows.push({
        id: `inv-ret-pur-${inv.id}`,
        date: inv.date,
        documentType: 'مرجوعی از خرید',
        documentNumber: inv.invoiceNumber,
        contactName: inv.contactName,
        inQuantity: 0,
        inUnitPrice: 0,
        inTotalPrice: 0,
        outQuantity: item.quantity,
        outUnitPrice: item.unitPrice,
        outTotalPrice: item.quantity * item.unitPrice,
        remainingQuantity: 0,
        remainingValue: 0,
      });
    }
  });

  // 3. Stocktaking Adjustments (انبارگردانی - اضافه و کسری انبار)
  (product.stockAdjustments || []).forEach((adj, idx) => {
    const isSurplus = adj.diffQty > 0;
    const absQty = Math.abs(adj.diffQty);
    if (absQty === 0) return;
    const unitPrice = adj.unitPrice || adj.unitCost || product.buyPrice || 0;

    rows.push({
      id: `adj-${adj.id || idx}`,
      date: adj.date,
      documentType: isSurplus ? 'انبارگردانی (اضافه انبار)' : 'انبارگردانی (کسری انبار)',
      documentNumber: adj.voucherId ? adj.voucherId.replace('vch-', '') : `ADJ-${idx + 1}`,
      contactName: adj.reason || 'شمارش فیزیکی انبار',
      notes: adj.reason,
      inQuantity: isSurplus ? absQty : 0,
      inUnitPrice: isSurplus ? unitPrice : 0,
      inTotalPrice: isSurplus ? absQty * unitPrice : 0,
      outQuantity: !isSurplus ? absQty : 0,
      outUnitPrice: !isSurplus ? unitPrice : 0,
      outTotalPrice: !isSurplus ? absQty * unitPrice : 0,
      remainingQuantity: 0,
      remainingValue: 0,
    });
  });

  rows.sort((a, b) => a.date.localeCompare(b.date));

  let runningQty = 0;
  let totalInQty = 0;
  let totalOutQty = 0;

  rows = rows.map((r) => {
    totalInQty += r.inQuantity;
    totalOutQty += r.outQuantity;
    runningQty += r.inQuantity - r.outQuantity;
    const remainingValue = runningQty * product.buyPrice;
    return {
      ...r,
      remainingQuantity: runningQty,
      remainingValue,
    };
  });

  return {
    rows,
    totalInQty,
    totalOutQty,
    currentStock: runningQty,
    currentStockValue: runningQty * product.buyPrice,
  };
}

export interface TrialBalanceItem {
  code: string;
  title: string;
  level: string;
  parentCode?: string;
  initialDebit: number;
  initialCredit: number;
  turnoverDebit: number;
  turnoverCredit: number;
  finalDebit: number;
  finalCredit: number;
}

export function calculateTrialBalance(
  chartOfAccounts: AccountCategory[],
  vouchers: JournalVoucher[]
): {
  items: TrialBalanceItem[];
  totalTurnoverDebit: number;
  totalTurnoverCredit: number;
  totalFinalDebit: number;
  totalFinalCredit: number;
  isBalanced: boolean;
} {
  // Aggregate debit and credit turnover per accountCode from all permanent or draft vouchers
  const debitMap = new Map<string, number>();
  const creditMap = new Map<string, number>();

  vouchers.forEach((v) => {
    v.items.forEach((item) => {
      const code = item.accountCode;
      debitMap.set(code, (debitMap.get(code) || 0) + item.debit);
      creditMap.set(code, (creditMap.get(code) || 0) + item.credit);
    });
  });

  // Calculate totals for each account level (moein, kol, group)
  const items: TrialBalanceItem[] = chartOfAccounts.map((acc) => {
    // Find all matching items that start with or equal this code
    let turnoverDebit = 0;
    let turnoverCredit = 0;

    for (const [code, deb] of debitMap.entries()) {
      if (code === acc.code || code.startsWith(acc.code)) {
        turnoverDebit += deb;
      }
    }
    for (const [code, crd] of creditMap.entries()) {
      if (code === acc.code || code.startsWith(acc.code)) {
        turnoverCredit += crd;
      }
    }

    const net = turnoverDebit - turnoverCredit;
    const finalDebit = net > 0 ? net : 0;
    const finalCredit = net < 0 ? Math.abs(net) : 0;

    return {
      code: acc.code,
      title: acc.title,
      level: acc.level,
      parentCode: acc.parentCode,
      initialDebit: 0,
      initialCredit: 0,
      turnoverDebit,
      turnoverCredit,
      finalDebit,
      finalCredit,
    };
  });

  // Calculate totals across group levels
  const groupItems = items.filter((i) => i.level === 'group');
  const totalTurnoverDebit = groupItems.reduce((s, i) => s + i.turnoverDebit, 0);
  const totalTurnoverCredit = groupItems.reduce((s, i) => s + i.turnoverCredit, 0);
  const totalFinalDebit = groupItems.reduce((s, i) => s + i.finalDebit, 0);
  const totalFinalCredit = groupItems.reduce((s, i) => s + i.finalCredit, 0);
  const isBalanced = Math.abs(totalTurnoverDebit - totalTurnoverCredit) < 1;

  return {
    items,
    totalTurnoverDebit,
    totalTurnoverCredit,
    totalFinalDebit,
    totalFinalCredit,
    isBalanced,
  };
}

export function calculateProfitAndLoss(
  invoices: Invoice[],
  expenses: Expense[],
  products: Product[]
): {
  grossSales: number;
  salesReturns: number;
  salesDiscounts: number;
  netSales: number;
  cogs: number;
  inventoryAdjustmentNet: number; // مثبت = اضافه انبار (کاهش بهای تمام شده)، منفی = کسری انبار (افزایش هزینه)
  grossProfit: number;
  totalOperatingExpenses: number;
  expenseDetails: { category: string; amount: number }[];
  netProfit: number;
} {
  // 1. Gross Sales
  const salesInvoices = invoices.filter((i) => i.type === 'sales');
  const grossSales = salesInvoices.reduce((sum, inv) => sum + inv.subTotal, 0);

  // 2. Sales Returns
  const salesReturnInvoices = invoices.filter((i) => i.type === 'sales_return');
  const salesReturns = salesReturnInvoices.reduce(
    (sum, inv) =>
      sum +
      Math.max(
        0,
        inv.subTotal -
          (inv.totalItemsDiscount || 0) -
          (inv.totalInvoiceDiscount || 0) -
          (inv.settlement?.discountAmount || 0)
      ),
    0
  );

  // 3. Sales Discounts
  const salesDiscounts = salesInvoices.reduce(
    (sum, inv) =>
      sum +
      (inv.totalItemsDiscount || 0) +
      (inv.totalInvoiceDiscount || 0) +
      (inv.settlement?.discountAmount || 0),
    0
  );

  // 4. Net Sales
  const netSales = Math.max(0, grossSales - salesReturns - salesDiscounts);

  // 5. Cost of Goods Sold (COGS)
  let cogs = 0;
  salesInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const prd = products.find((p) => p.id === item.productId);
      const buyPrice = prd && prd.buyPrice > 0 ? prd.buyPrice : item.unitPrice * 0.75;
      cogs += item.quantity * buyPrice;
    });
  });
  salesReturnInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const prd = products.find((p) => p.id === item.productId);
      const buyPrice = prd && prd.buyPrice > 0 ? prd.buyPrice : item.unitPrice * 0.75;
      cogs = Math.max(0, cogs - item.quantity * buyPrice);
    });
  });

  // 5b. Stocktaking Adjustments (اضافات و کسری انبارگردانی)
  let inventoryAdjustmentNet = 0;
  products.forEach((prd) => {
    (prd.stockAdjustments || []).forEach((adj) => {
      inventoryAdjustmentNet += adj.diffQty * (adj.unitPrice || adj.unitCost || prd.buyPrice || 0);
    });
  });

  // 6. Gross Profit (شامل اثر تعدیلات انبارگردانی)
  const grossProfit = netSales - cogs + inventoryAdjustmentNet;

  // 7. Operating Expenses
  const expCategoryMap = new Map<string, number>();
  expenses.forEach((exp) => {
    const catTitle = exp.accountTitle || 'هزینه‌های عمومی';
    expCategoryMap.set(catTitle, (expCategoryMap.get(catTitle) || 0) + exp.amount);
  });

  const expenseDetails = Array.from(expCategoryMap.entries()).map(([category, amount]) => ({
    category,
    amount,
  }));
  const totalOperatingExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // 8. Net Profit
  const netProfit = grossProfit - totalOperatingExpenses;

  return {
    grossSales,
    salesReturns,
    salesDiscounts,
    netSales,
    cogs,
    inventoryAdjustmentNet,
    grossProfit,
    totalOperatingExpenses,
    expenseDetails,
    netProfit,
  };
}
