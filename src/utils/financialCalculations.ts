import {
  AccountCategory,
  Contact,
  BankAccount,
  Product,
  JournalVoucher,
  Invoice,
  Expense
} from '../types/accounting';

export interface ContactCardexRow {
  id: string;
  date: string;
  documentType: 'سند افتتاحیه' | 'فاکتور فروش' | 'فاکتور خرید' | 'مرجوعی فروش' | 'مرجوعی خرید' | 'دریافت/پرداخت' | 'سند حسابداری';
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
  expenses: Expense[]
): { rows: ContactCardexRow[]; totalDebit: number; totalCredit: number; finalBalance: number; finalBalanceType: 'بدهکار' | 'بستانکار' | 'تسویه' } {
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
        const totalPaidAtInvoice =
          inv.settlement.cashPayments.reduce((s, c) => s + c.amount, 0) +
          inv.settlement.bankPayments.reduce((s, b) => s + b.amount, 0) +
          inv.settlement.chequePayments.reduce((s, ch) => s + ch.amount, 0) +
          inv.settlement.discountAmount;

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
        const totalPaidToSupplier =
          inv.settlement.cashPayments.reduce((s, c) => s + c.amount, 0) +
          inv.settlement.bankPayments.reduce((s, b) => s + b.amount, 0) +
          inv.settlement.chequePayments.reduce((s, ch) => s + ch.amount, 0) +
          inv.settlement.discountAmount;

        if (totalPaidToSupplier > 0) {
          rows.push({
            id: `pay-${inv.id}`,
            date: inv.date,
            documentType: 'دریافت/پرداخت',
            documentNumber: inv.invoiceNumber,
            description: `پرداخت وجه فاکتور خرید ${inv.invoiceNumber} (بانک/چک/نقد)`,
            debit: totalPaidToSupplier,
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
      }
    });

  // 3. Manual journal vouchers with this contact
  vouchers
    .filter((v) => !v.isAutoGenerated)
    .forEach((v) => {
      v.items.forEach((item) => {
        if (
          (item.tafsiliId && item.tafsiliId === contact.id) ||
          (item.tafsiliTitle && item.tafsiliTitle.includes(contact.name)) ||
          item.description.includes(contact.name)
        ) {
          rows.push({
            id: `vch-${v.id}-${item.id}`,
            date: v.date,
            documentType: 'سند حسابداری',
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
  vouchers: JournalVoucher[]
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

  // Bank receipts in Sales invoices
  invoices.forEach((inv) => {
    if (inv.type === 'sales') {
      if (bank.type === 'cash') {
        inv.settlement.cashPayments
          .filter((c) => c.cashId === bank.id)
          .forEach((c) => {
            rows.push({
              id: `sale-cash-${inv.id}`,
              date: inv.date,
              documentType: 'فروش نقدی',
              documentNumber: inv.invoiceNumber,
              description: `دریافت نقد فاکتور فروش شماره ${inv.invoiceNumber} - ${inv.contactName}`,
              inflow: c.amount,
              outflow: 0,
              balance: 0,
            });
          });
      } else {
        inv.settlement.bankPayments
          .filter((b) => b.bankId === bank.id)
          .forEach((b) => {
            rows.push({
              id: `sale-bank-${inv.id}`,
              date: inv.date,
              documentType: bank.type === 'pos' ? 'تراکنش کارتخوان' : 'واریز بانکی',
              documentNumber: inv.invoiceNumber,
              description: `دریافت وجه فاکتور فروش شماره ${inv.invoiceNumber} - ${inv.contactName}${b.trackingCode ? ' (کد: ' + b.trackingCode + ')' : ''}`,
              inflow: b.amount,
              outflow: 0,
              balance: 0,
            });
          });
      }
    } else if (inv.type === 'purchase') {
      if (bank.type === 'cash') {
        inv.settlement.cashPayments
          .filter((c) => c.cashId === bank.id)
          .forEach((c) => {
            rows.push({
              id: `pur-cash-${inv.id}`,
              date: inv.date,
              documentType: 'پرداخت نقد خرید',
              documentNumber: inv.invoiceNumber,
              description: `پرداخت نقد فاکتور خرید شماره ${inv.invoiceNumber} - ${inv.contactName}`,
              inflow: 0,
              outflow: c.amount,
              balance: 0,
            });
          });
      } else {
        inv.settlement.bankPayments
          .filter((b) => b.bankId === bank.id)
          .forEach((b) => {
            rows.push({
              id: `pur-bank-${inv.id}`,
              date: inv.date,
              documentType: 'حواله خرید',
              documentNumber: inv.invoiceNumber,
              description: `پرداخت حواله فاکتور خرید شماره ${inv.invoiceNumber} - ${inv.contactName}${b.trackingCode ? ' (کد: ' + b.trackingCode + ')' : ''}`,
              inflow: 0,
              outflow: b.amount,
              balance: 0,
            });
          });
      }
    }
  });

  // Expenses paid from this account
  expenses
    .filter((exp) => exp.sourceAccountId === bank.id)
    .forEach((exp) => {
      rows.push({
        id: `exp-${exp.id}`,
        date: exp.date,
        documentType: 'ثبت هزینه',
        documentNumber: exp.expenseNumber,
        description: `${exp.accountTitle} - ${exp.description}${exp.beneficiary ? ' (به: ' + exp.beneficiary + ')' : ''}`,
        inflow: 0,
        outflow: exp.amount,
        balance: 0,
      });
    });

  // Manual vouchers involving this bank/cash
  vouchers
    .filter((v) => !v.isAutoGenerated)
    .forEach((v) => {
      v.items.forEach((item) => {
        const matches =
          (item.tafsiliId && item.tafsiliId === bank.id) ||
          (item.tafsiliTitle && item.tafsiliTitle.includes(bank.bankName)) ||
          item.description.includes(bank.title);

        if (matches) {
          if (item.debit > 0) {
            rows.push({
              id: `vch-deb-${v.id}-${item.id}`,
              date: v.date,
              documentType: 'سند دستی (واریز)',
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
              documentType: 'سند دستی (برداشت)',
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
): { rows: ProductCardexRow[]; totalInQty: number; totalOutQty: number; currentStock: number; currentStockValue: number } {
  let rows: ProductCardexRow[] = [];

  // Initial stock
  if (product.initialStock > 0) {
    rows.push({
      id: 'init-stock',
      date: '1403/01/01',
      documentType: 'موجودی اول دوره',
      documentNumber: '-',
      contactName: 'انبار مرکزی',
      inQuantity: product.initialStock,
      inUnitPrice: product.buyPrice,
      inTotalPrice: product.initialStock * product.buyPrice,
      outQuantity: 0,
      outUnitPrice: 0,
      outTotalPrice: 0,
      remainingQuantity: product.initialStock,
      remainingValue: product.initialStock * product.buyPrice,
    });
  }

  // Purchases, Sales, and Returns
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
  const salesReturns = salesReturnInvoices.reduce((sum, inv) => sum + inv.subTotal, 0);

  // 3. Sales Discounts
  const salesDiscounts = salesInvoices.reduce(
    (sum, inv) => sum + inv.totalItemsDiscount + inv.totalInvoiceDiscount + inv.settlement.discountAmount,
    0
  );

  // 4. Net Sales
  const netSales = Math.max(0, grossSales - salesReturns - salesDiscounts);

  // 5. Cost of Goods Sold (COGS)
  let cogs = 0;
  salesInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const prd = products.find((p) => p.id === item.productId);
      const buyPrice = prd ? prd.buyPrice : item.unitPrice * 0.75;
      cogs += item.quantity * buyPrice;
    });
  });
  salesReturnInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const prd = products.find((p) => p.id === item.productId);
      const buyPrice = prd ? prd.buyPrice : item.unitPrice * 0.75;
      cogs -= item.quantity * buyPrice;
    });
  });

  // 6. Gross Profit
  const grossProfit = netSales - cogs;

  // 7. Operating Expenses
  const expCategoryMap = new Map<string, number>();
  expenses.forEach((exp) => {
    expCategoryMap.set(exp.accountTitle, (expCategoryMap.get(exp.accountTitle) || 0) + exp.amount);
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
    grossProfit,
    totalOperatingExpenses,
    expenseDetails,
    netProfit,
  };
}
