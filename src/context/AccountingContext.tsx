import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  AccountCategory,
  JournalVoucher,
  Invoice,
  Contact,
  BankAccount,
  ProductCategory,
  Product,
  Expense,
  CompanySettings,
  VoucherItem,
  BackupSnapshot,
  FinancialYearInfo
} from '../types/accounting';
import {
  defaultCompanySettings,
  defaultChartOfAccounts,
  defaultContacts,
  defaultBankAccounts,
  defaultProductCategories,
  defaultProducts,
  defaultInvoices,
  defaultJournalVouchers,
  defaultExpenses,
  defaultFinancialYears
} from '../utils/defaultData';
import { getCurrentShamsiDate } from '../utils/dateUtils';
import { calculateTrialBalance } from '../utils/financialCalculations';

interface AccountingContextType {
  settings: CompanySettings;
  updateSettings: (newSettings: Partial<CompanySettings>) => void;

  chartOfAccounts: AccountCategory[];
  addAccountCategory: (account: Omit<AccountCategory, 'id'>) => void;
  updateAccountCategory: (id: string, account: Partial<AccountCategory>) => void;
  deleteAccountCategory: (id: string) => boolean;

  contacts: Contact[];
  addContact: (contact: Omit<Contact, 'id' | 'code' | 'createdAt'> & { code?: string }) => Contact;
  updateContact: (id: string, contact: Partial<Contact>) => void;
  deleteContact: (id: string) => boolean;

  bankAccounts: BankAccount[];
  addBankAccount: (bank: Omit<BankAccount, 'id' | 'code'> & { code?: string }) => BankAccount;
  updateBankAccount: (id: string, bank: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => boolean;

  productCategories: ProductCategory[];
  addProductCategory: (cat: Omit<ProductCategory, 'id' | 'code'> & { code?: string }) => ProductCategory;
  updateProductCategory: (id: string, cat: Partial<ProductCategory>) => void;
  deleteProductCategory: (id: string) => boolean;

  products: Product[];
  addProduct: (prd: Omit<Product, 'id' | 'code'> & { code?: string }) => Product;
  updateProduct: (id: string, prd: Partial<Product>) => void;
  deleteProduct: (id: string) => boolean;

  vouchers: JournalVoucher[];
  addVoucher: (vch: Omit<JournalVoucher, 'id' | 'voucherNumber' | 'createdAt'> & { voucherNumber?: number }) => JournalVoucher;
  updateVoucher: (id: string, vch: Partial<JournalVoucher>) => void;
  deleteVoucher: (id: string) => boolean;

  invoices: Invoice[];
  addInvoice: (inv: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'> & { invoiceNumber?: number }) => Invoice;
  updateInvoice: (id: string, inv: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => boolean;

  expenses: Expense[];
  addExpense: (exp: Omit<Expense, 'id' | 'expenseNumber' | 'createdAt'> & { expenseNumber?: number }) => Expense;
  updateExpense: (id: string, exp: Partial<Expense>) => void;
  deleteExpense: (id: string) => boolean;

  // Financial Year Management
  financialYears: FinancialYearInfo[];
  createNewFinancialYear: (year: string, title?: string) => FinancialYearInfo;
  closeFinancialYear: (yearToClose: string, newYear: string) => boolean;
  switchFinancialYear: (year: string) => void;

  // Partners Management
  recordPartnerTransaction: (
    partnerId: string,
    type: 'deposit' | 'withdrawal',
    amount: number,
    bankAccountId: string,
    description: string,
    date?: string
  ) => JournalVoucher;

  resetToDefaultData: () => void;
  exportDatabaseJSON: () => void;
  importDatabaseJSON: (jsonData: string) => boolean;

  // Smart Backup & Snapshot Archive
  autoBackupSnapshots: BackupSnapshot[];
  createBackupSnapshot: (reason?: string) => BackupSnapshot;
  restoreSnapshot: (snapshotId: string) => boolean;
  deleteSnapshot: (snapshotId: string) => void;
  clearAllSnapshots: () => void;
  exportSnapshotJSON: (snapshot: BackupSnapshot) => void;
  lastBackupTime: string | null;
}

const STORAGE_KEYS = {
  SETTINGS: 'acc_settings_v1',
  ACCOUNTS: 'acc_accounts_v1',
  CONTACTS: 'acc_contacts_v1',
  BANKS: 'acc_banks_v1',
  CATEGORIES: 'acc_categories_v1',
  PRODUCTS: 'acc_products_v1',
  VOUCHERS: 'acc_vouchers_v1',
  INVOICES: 'acc_invoices_v1',
  EXPENSES: 'acc_expenses_v1',
  YEARS: 'acc_financial_years_v1',
  BACKUPS: 'acc_backup_snapshots_v1',
  LAST_BACKUP: 'acc_last_backup_time_v1',
};

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Settings
  const [settings, setSettings] = useState<CompanySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : defaultCompanySettings;
    } catch {
      return defaultCompanySettings;
    }
  });

  // 2. Chart of Accounts
  const [chartOfAccounts, setChartOfAccounts] = useState<AccountCategory[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      return saved ? JSON.parse(saved) : defaultChartOfAccounts;
    } catch {
      return defaultChartOfAccounts;
    }
  });

  // 3. Contacts
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONTACTS);
      return saved ? JSON.parse(saved) : defaultContacts;
    } catch {
      return defaultContacts;
    }
  });

  // 4. Banks & Cash
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BANKS);
      return saved ? JSON.parse(saved) : defaultBankAccounts;
    } catch {
      return defaultBankAccounts;
    }
  });

  // 5. Product Categories
  const [productCategories, setProductCategories] = useState<ProductCategory[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return saved ? JSON.parse(saved) : defaultProductCategories;
    } catch {
      return defaultProductCategories;
    }
  });

  // 6. Products
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : defaultProducts;
    } catch {
      return defaultProducts;
    }
  });

  // 7. Invoices
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
      return saved ? JSON.parse(saved) : defaultInvoices;
    } catch {
      return defaultInvoices;
    }
  });

  // 8. Journal Vouchers
  const [vouchers, setVouchers] = useState<JournalVoucher[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VOUCHERS);
      return saved ? JSON.parse(saved) : defaultJournalVouchers;
    } catch {
      return defaultJournalVouchers;
    }
  });

  // 9. Expenses
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return saved ? JSON.parse(saved) : defaultExpenses;
    } catch {
      return defaultExpenses;
    }
  });

  // 10. Financial Years
  const [financialYears, setFinancialYears] = useState<FinancialYearInfo[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.YEARS);
      return saved ? JSON.parse(saved) : defaultFinancialYears;
    } catch {
      return defaultFinancialYears;
    }
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) { console.error('Error saving settings', e); }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(chartOfAccounts));
    } catch (e) { console.error('Error saving accounts', e); }
  }, [chartOfAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
    } catch (e) { console.error('Error saving contacts', e); }
  }, [contacts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(bankAccounts));
    } catch (e) { console.error('Error saving bankAccounts', e); }
  }, [bankAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(productCategories));
    } catch (e) { console.error('Error saving categories', e); }
  }, [productCategories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) { console.error('Error saving products', e); }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    } catch (e) { console.error('Error saving invoices', e); }
  }, [invoices]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(vouchers));
    } catch (e) { console.error('Error saving vouchers', e); }
  }, [vouchers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (e) { console.error('Error saving expenses', e); }
  }, [expenses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.YEARS, JSON.stringify(financialYears));
    } catch (e) { console.error('Error saving financialYears', e); }
  }, [financialYears]);

  // Methods
  const updateSettings = (newSettings: Partial<CompanySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const addAccountCategory = (account: Omit<AccountCategory, 'id'>) => {
    const newAccount: AccountCategory = {
      ...account,
      id: `acc-${Date.now()}`,
    };
    setChartOfAccounts((prev) => [...prev, newAccount]);
  };

  const updateAccountCategory = (id: string, account: Partial<AccountCategory>) => {
    setChartOfAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...account } : a)));
  };

  const deleteAccountCategory = (id: string) => {
    const acc = chartOfAccounts.find((a) => a.id === id);
    if (acc?.isSystem) return false;
    setChartOfAccounts((prev) => prev.filter((a) => a.id !== id));
    return true;
  };

  const addContact = (contactData: Omit<Contact, 'id' | 'code' | 'createdAt'> & { code?: string }) => {
    const nextCode = contactData.code || `${1000 + contacts.length + 1}`;
    const newContact: Contact = {
      ...contactData,
      id: `cnt-${Date.now()}`,
      code: nextCode,
      createdAt: getCurrentShamsiDate(),
    };
    setContacts((prev) => [...prev, newContact]);
    return newContact;
  };

  const updateContact = (id: string, contactData: Partial<Contact>) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...contactData } : c)));
  };

  const deleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  const addBankAccount = (bankData: Omit<BankAccount, 'id' | 'code'> & { code?: string }) => {
    const nextCode = bankData.code || `B-${bankAccounts.length + 1 < 10 ? '0' : ''}${bankAccounts.length + 1}`;
    const newBank: BankAccount = {
      ...bankData,
      id: `bank-${Date.now()}`,
      code: nextCode,
    };
    setBankAccounts((prev) => [...prev, newBank]);
    return newBank;
  };

  const updateBankAccount = (id: string, bankData: Partial<BankAccount>) => {
    setBankAccounts((prev) => prev.map((b) => (b.id === id ? { ...b, ...bankData } : b)));
  };

  const deleteBankAccount = (id: string) => {
    setBankAccounts((prev) => prev.filter((b) => b.id !== id));
    return true;
  };

  const addProductCategory = (catData: Omit<ProductCategory, 'id' | 'code'> & { code?: string }) => {
    const nextCode = catData.code || `CAT-${productCategories.length + 1 < 10 ? '0' : ''}${productCategories.length + 1}`;
    const newCat: ProductCategory = {
      ...catData,
      id: `cat-${Date.now()}`,
      code: nextCode,
    };
    setProductCategories((prev) => [...prev, newCat]);
    return newCat;
  };

  const updateProductCategory = (id: string, catData: Partial<ProductCategory>) => {
    setProductCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...catData } : c)));
  };

  const deleteProductCategory = (id: string) => {
    setProductCategories((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  const addProduct = (prdData: Omit<Product, 'id' | 'code'> & { code?: string }) => {
    const nextCode = prdData.code || `PRD-${100 + products.length + 1}`;
    const newProduct: Product = {
      ...prdData,
      id: `prd-${Date.now()}`,
      code: nextCode,
      stockQuantity: prdData.initialStock || prdData.stockQuantity || 0,
    };
    setProducts((prev) => [...prev, newProduct]);
    return newProduct;
  };

  const updateProduct = (id: string, prdData: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...prdData } : p)));
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    return true;
  };

  const addVoucher = (vchData: Omit<JournalVoucher, 'id' | 'voucherNumber' | 'createdAt'> & { voucherNumber?: number }) => {
    const maxVoucherNumber = vouchers.length > 0 ? Math.max(...vouchers.map((v) => v.voucherNumber)) : 100;
    const newVoucherNumber = vchData.voucherNumber || maxVoucherNumber + 1;
    const newVoucher: JournalVoucher = {
      gregorianDate: new Date().toISOString().split('T')[0],
      status: 'permanent',
      isAutoGenerated: false,
      ...vchData,
      id: `vch-${Date.now()}`,
      voucherNumber: newVoucherNumber,
      createdAt: getCurrentShamsiDate(),
    };
    setVouchers((prev) => [newVoucher, ...prev]);
    return newVoucher;
  };

  const updateVoucher = (id: string, vchData: Partial<JournalVoucher>) => {
    setVouchers((prev) => prev.map((v) => (v.id === id ? { ...v, ...vchData } : v)));
  };

  const deleteVoucher = (id: string) => {
    setVouchers((prev) => prev.filter((v) => v.id !== id));
    return true;
  };

  // Automatic voucher builder for Invoice
  const generateVoucherForInvoice = (inv: Invoice): JournalVoucher | null => {
    const items: VoucherItem[] = [];
    const invoiceTypeTitle =
      inv.type === 'sales'
        ? 'فروش'
        : inv.type === 'purchase'
        ? 'خرید'
        : inv.type === 'sales_return'
        ? 'برگشت از فروش'
        : 'برگشت از خرید';

    const maxVoucherNumber = vouchers.length > 0 ? Math.max(...vouchers.map((v) => v.voucherNumber)) : 100;
    const nextVoucherNo = maxVoucherNumber + 1;

    if (inv.type === 'sales') {
      // 1. Debit Cash / Bank / Cheque / Credit Customer
      inv.settlement.cashPayments.forEach((c) => {
        if (c.amount > 0) {
          items.push({
            id: `vi-${Date.now()}-${Math.random()}`,
            accountCode: '10101',
            accountTitle: 'صندوق‌ها',
            tafsiliTitle: c.cashTitle,
            description: `دریافت نقدی فاکتور فروش شماره ${inv.invoiceNumber}`,
            debit: c.amount,
            credit: 0,
          });
        }
      });

      inv.settlement.bankPayments.forEach((b) => {
        if (b.amount > 0) {
          const bank = bankAccounts.find((bk) => bk.id === b.bankId);
          const isPos = bank?.type === 'pos';
          items.push({
            id: `vi-${Date.now()}-${Math.random()}`,
            accountCode: isPos ? '10104' : '10102',
            accountTitle: isPos ? 'دستگاه‌های کارتخوان (POS)' : 'حساب‌های بانکی ریالی',
            tafsiliTitle: b.bankTitle,
            description: `دریافت بانکی فاکتور فروش ${inv.invoiceNumber}${b.trackingCode ? ' (کد پیگیری: ' + b.trackingCode + ')' : ''}`,
            debit: b.amount,
            credit: 0,
          });
        }
      });

      inv.settlement.chequePayments.forEach((ch) => {
        if (ch.amount > 0) {
          items.push({
            id: `vi-${Date.now()}-${Math.random()}`,
            accountCode: '10201',
            accountTitle: 'چک‌های دریافتی نزد صندوق',
            tafsiliTitle: `چک ${ch.bankName} به شماره ${ch.chequeNumber}`,
            description: `دریافت چک سررسید ${ch.dueDate} بابت فاکتور فروش ${inv.invoiceNumber}`,
            debit: ch.amount,
            credit: 0,
          });
        }
      });

      if (inv.settlement.creditAmount > 0) {
        items.push({
          id: `vi-${Date.now()}-${Math.random()}`,
          accountCode: '10301',
          accountTitle: 'مشتریان تجاری داخلی',
          tafsiliId: inv.contactId,
          tafsiliTitle: inv.contactName,
          description: `مانده نسیه فاکتور فروش شماره ${inv.invoiceNumber}`,
          debit: inv.settlement.creditAmount,
          credit: 0,
        });
      }

      const totalDiscounts =
        inv.totalItemsDiscount + inv.totalInvoiceDiscount + inv.settlement.discountAmount;
      if (totalDiscounts > 0) {
        items.push({
          id: `vi-${Date.now()}-${Math.random()}`,
          accountCode: '50202',
          accountTitle: 'تخفیفات نقدی اعطایی فروش',
          tafsiliTitle: inv.contactName,
          description: `تخفیفات اعطایی فاکتور فروش ${inv.invoiceNumber}`,
          debit: totalDiscounts,
          credit: 0,
        });
      }

      // 2. Credit Sales Revenue
      items.push({
        id: `vi-${Date.now()}-${Math.random()}`,
        accountCode: '50101',
        accountTitle: 'فروش کالای بازرگانی',
        tafsiliTitle: 'فروش تجاری',
        description: `مبلغ ناخالص فروش فاکتور ${inv.invoiceNumber}`,
        debit: 0,
        credit: inv.subTotal,
      });

      // 3. Credit VAT Payable (if any)
      if (inv.totalTax > 0) {
        items.push({
          id: `vi-${Date.now()}-${Math.random()}`,
          accountCode: '30301',
          accountTitle: 'مالیات و عوارض بر ارزش افزوده پرداختنی',
          tafsiliTitle: 'مالیات ارزش افزوده ۱۰٪',
          description: `مالیات بر ارزش افزوده فاکتور فروش ${inv.invoiceNumber}`,
          debit: 0,
          credit: inv.totalTax,
        });
      }
    } else if (inv.type === 'purchase') {
      // Debit Purchase and VAT
      items.push({
        id: `vi-${Date.now()}-${Math.random()}`,
        accountCode: '60201',
        accountTitle: 'خرید کالای بازرگانی',
        tafsiliTitle: 'خرید انبار',
        description: `خرید فاکتور شماره ${inv.invoiceNumber}`,
        debit: inv.subTotal,
        credit: 0,
      });

      if (inv.totalTax > 0) {
        items.push({
          id: `vi-${Date.now()}-${Math.random()}`,
          accountCode: '10501',
          accountTitle: 'پیش‌پرداخت‌ها و علی‌الحساب‌ها',
          tafsiliTitle: 'اعتبار ارزش افزوده خرید',
          description: `مالیات ارزش افزوده فاکتور خرید ${inv.invoiceNumber}`,
          debit: inv.totalTax,
          credit: 0,
        });
      }

      // Credit Cash / Bank / Cheque / Payable
      inv.settlement.cashPayments.forEach((c) => {
        if (c.amount > 0) {
          items.push({
            id: `vi-${Date.now()}-${Math.random()}`,
            accountCode: '10101',
            accountTitle: 'صندوق‌ها',
            tafsiliTitle: c.cashTitle,
            description: `پرداخت نقدی فاکتور خرید ${inv.invoiceNumber}`,
            debit: 0,
            credit: c.amount,
          });
        }
      });

      inv.settlement.bankPayments.forEach((b) => {
        if (b.amount > 0) {
          items.push({
            id: `vi-${Date.now()}-${Math.random()}`,
            accountCode: '10102',
            accountTitle: 'حساب‌های بانکی ریالی',
            tafsiliTitle: b.bankTitle,
            description: `پرداخت بانکی فاکتور خرید ${inv.invoiceNumber}`,
            debit: 0,
            credit: b.amount,
          });
        }
      });

      inv.settlement.chequePayments.forEach((ch) => {
        if (ch.amount > 0) {
          items.push({
            id: `vi-${Date.now()}-${Math.random()}`,
            accountCode: '30201',
            accountTitle: 'چک‌های پرداختنی عهده بانک‌ها',
            tafsiliTitle: `چک عهده ${ch.bankName} به شماره ${ch.chequeNumber}`,
            description: `صدور چک سررسید ${ch.dueDate} بابت فاکتور خرید ${inv.invoiceNumber}`,
            debit: 0,
            credit: ch.amount,
          });
        }
      });

      if (inv.settlement.creditAmount > 0) {
        items.push({
          id: `vi-${Date.now()}-${Math.random()}`,
          accountCode: '30101',
          accountTitle: 'تامین‌کنندگان کالا و خدمات',
          tafsiliId: inv.contactId,
          tafsiliTitle: inv.contactName,
          description: `مانده نسیه فاکتور خرید ${inv.invoiceNumber}`,
          debit: 0,
          credit: inv.settlement.creditAmount,
        });
      }

      const totalDiscounts =
        inv.totalItemsDiscount + inv.totalInvoiceDiscount + inv.settlement.discountAmount;
      if (totalDiscounts > 0) {
        items.push({
          id: `vi-${Date.now()}-${Math.random()}`,
          accountCode: '60302',
          accountTitle: 'تخفیفات نقدی کسب شده خرید',
          tafsiliTitle: inv.contactName,
          description: `تخفیف دریافتی فاکتور خرید ${inv.invoiceNumber}`,
          debit: 0,
          credit: totalDiscounts,
        });
      }
    } else if (inv.type === 'sales_return') {
      items.push({
        id: `vi-${Date.now()}-${Math.random()}`,
        accountCode: '50201',
        accountTitle: 'برگشت از فروش کالا',
        tafsiliTitle: inv.contactName,
        description: `برگشت از فروش فاکتور شماره ${inv.invoiceNumber}`,
        debit: inv.subTotal,
        credit: 0,
      });
      if (inv.totalTax > 0) {
        items.push({
          id: `vi-${Date.now()}-${Math.random()}`,
          accountCode: '30301',
          accountTitle: 'مالیات و عوارض بر ارزش افزوده پرداختنی',
          tafsiliTitle: 'اصلاح ارزش افزوده برگشتی',
          description: `اصلاح ارزش افزوده فاکتور برگشت از فروش ${inv.invoiceNumber}`,
          debit: inv.totalTax,
          credit: 0,
        });
      }
      items.push({
        id: `vi-${Date.now()}-${Math.random()}`,
        accountCode: '10301',
        accountTitle: 'مشتریان تجاری داخلی',
        tafsiliId: inv.contactId,
        tafsiliTitle: inv.contactName,
        description: `بستانکار شدن مشتری بابت برگشت از فروش ${inv.invoiceNumber}`,
        debit: 0,
        credit: inv.grandTotal,
      });
    } else if (inv.type === 'purchase_return') {
      items.push({
        id: `vi-${Date.now()}-${Math.random()}`,
        accountCode: '30101',
        accountTitle: 'تامین‌کنندگان کالا و خدمات',
        tafsiliId: inv.contactId,
        tafsiliTitle: inv.contactName,
        description: `بدهکار شدن تامین کننده بابت برگشت از خرید ${inv.invoiceNumber}`,
        debit: inv.grandTotal,
        credit: 0,
      });
      items.push({
        id: `vi-${Date.now()}-${Math.random()}`,
        accountCode: '60301',
        accountTitle: 'برگشت از خرید کالا',
        tafsiliTitle: 'برگشت کالا به تامین‌کننده',
        description: `برگشت از خرید فاکتور شماره ${inv.invoiceNumber}`,
        debit: 0,
        credit: inv.subTotal,
      });
      if (inv.totalTax > 0) {
        items.push({
          id: `vi-${Date.now()}-${Math.random()}`,
          accountCode: '10501',
          accountTitle: 'پیش‌پرداخت‌ها و علی‌الحساب‌ها',
          tafsiliTitle: 'اصلاح اعتبار ارزش افزوده خرید',
          description: `اصلاح مالیات ارزش افزوده فاکتور برگشت از خرید ${inv.invoiceNumber}`,
          debit: 0,
          credit: inv.totalTax,
        });
      }
    }

    const autoVoucher: JournalVoucher = {
      id: `vch-auto-${Date.now()}`,
      voucherNumber: nextVoucherNo,
      date: inv.date,
      gregorianDate: new Date().toISOString().split('T')[0],
      description: `صدور خودکار سند فاکتور ${invoiceTypeTitle} شماره ${inv.invoiceNumber} - ${inv.contactName}`,
      items,
      status: 'permanent',
      isAutoGenerated: true,
      sourceType: 'invoice',
      sourceId: inv.id,
      createdAt: getCurrentShamsiDate(),
    };

    return autoVoucher;
  };

  const addInvoice = (invData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'> & { invoiceNumber?: number }) => {
    const maxInvNumber = invoices.length > 0 ? Math.max(...invoices.map((i) => i.invoiceNumber)) : 1000;
    const newInvoiceNumber = invData.invoiceNumber || maxInvNumber + 1;
    const newInvoiceId = `inv-${Date.now()}`;

    const createdInvoice: Invoice = {
      ...invData,
      id: newInvoiceId,
      invoiceNumber: newInvoiceNumber,
      createdAt: getCurrentShamsiDate(),
    };

    // Update Product stock quantity
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const item = createdInvoice.items.find((i) => i.productId === p.id);
        if (!item) return p;

        let delta = 0;
        if (createdInvoice.type === 'sales') {
          delta = -item.quantity;
        } else if (createdInvoice.type === 'purchase') {
          delta = +item.quantity;
        } else if (createdInvoice.type === 'sales_return') {
          delta = +item.quantity;
        } else if (createdInvoice.type === 'purchase_return') {
          delta = -item.quantity;
        }
        return {
          ...p,
          stockQuantity: Math.max(0, p.stockQuantity + delta),
        };
      })
    );

    // Auto generate voucher if configured
    if (settings.autoGenerateVouchers) {
      const autoVch = generateVoucherForInvoice(createdInvoice);
      if (autoVch) {
        createdInvoice.voucherId = autoVch.id;
        setVouchers((prev) => [autoVch, ...prev]);
      }
    }

    setInvoices((prev) => [createdInvoice, ...prev]);
    return createdInvoice;
  };

  const updateInvoice = (id: string, invData: Partial<Invoice>) => {
    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, ...invData } : i)));
  };

  const deleteInvoice = (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return false;

    // Revert product quantities
    setProducts((prev) =>
      prev.map((p) => {
        const item = inv.items.find((i) => i.productId === p.id);
        if (!item) return p;
        let delta = 0;
        if (inv.type === 'sales') delta = +item.quantity;
        else if (inv.type === 'purchase') delta = -item.quantity;
        else if (inv.type === 'sales_return') delta = -item.quantity;
        else if (inv.type === 'purchase_return') delta = +item.quantity;
        return {
          ...p,
          stockQuantity: Math.max(0, p.stockQuantity + delta),
        };
      })
    );

    // Remove connected auto voucher if any
    if (inv.voucherId) {
      setVouchers((prev) => prev.filter((v) => v.id !== inv.voucherId));
    }

    setInvoices((prev) => prev.filter((i) => i.id !== id));
    return true;
  };

  const addExpense = (expData: Omit<Expense, 'id' | 'expenseNumber' | 'createdAt'> & { expenseNumber?: number }) => {
    const maxExpNumber = expenses.length > 0 ? Math.max(...expenses.map((e) => e.expenseNumber)) : 100;
    const newExpNumber = expData.expenseNumber || maxExpNumber + 1;
    const expId = `exp-${Date.now()}`;

    const createdExpense: Expense = {
      ...expData,
      id: expId,
      expenseNumber: newExpNumber,
      createdAt: getCurrentShamsiDate(),
    };

    // Auto generate voucher for expense
    if (settings.autoGenerateVouchers) {
      const maxVoucherNumber = vouchers.length > 0 ? Math.max(...vouchers.map((v) => v.voucherNumber)) : 100;
      const nextVoucherNo = maxVoucherNumber + 1;

      let creditAccountCode = '10101';
      let creditAccountTitle = 'صندوق‌ها';
      if (createdExpense.paymentType === 'bank') {
        creditAccountCode = '10102';
        creditAccountTitle = 'حساب‌های بانکی ریالی';
      } else if (createdExpense.paymentType === 'credit') {
        creditAccountCode = '30101';
        creditAccountTitle = 'حساب‌های پرداختنی تجاری';
      }

      const autoVch: JournalVoucher = {
        id: `vch-auto-${Date.now()}`,
        voucherNumber: nextVoucherNo,
        date: createdExpense.date,
        gregorianDate: new Date().toISOString().split('T')[0],
        description: `ثبت هزینه شماره ${createdExpense.expenseNumber} - ${createdExpense.accountTitle}: ${createdExpense.description}`,
        items: [
          {
            id: `vi-exp-deb-${Date.now()}`,
            accountCode: createdExpense.accountCode,
            accountTitle: createdExpense.accountTitle,
            tafsiliTitle: createdExpense.beneficiary || 'مرکز هزینه',
            description: createdExpense.description,
            debit: createdExpense.amount,
            credit: 0,
          },
          {
            id: `vi-exp-crd-${Date.now()}`,
            accountCode: creditAccountCode,
            accountTitle: creditAccountTitle,
            tafsiliTitle: createdExpense.sourceAccountTitle || 'حساب پرداخت',
            description: `پرداخت بابت ${createdExpense.accountTitle}${createdExpense.trackingNumber ? ' (کد: ' + createdExpense.trackingNumber + ')' : ''}`,
            debit: 0,
            credit: createdExpense.amount,
          },
        ],
        status: 'permanent',
        isAutoGenerated: true,
        sourceType: 'expense',
        sourceId: expId,
        createdAt: getCurrentShamsiDate(),
      };

      createdExpense.voucherId = autoVch.id;
      setVouchers((prev) => [autoVch, ...prev]);
    }

    setExpenses((prev) => [createdExpense, ...prev]);
    return createdExpense;
  };

  const updateExpense = (id: string, expData: Partial<Expense>) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...expData } : e)));
  };

  const deleteExpense = (id: string) => {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return false;
    if (exp.voucherId) {
      setVouchers((prev) => prev.filter((v) => v.id !== exp.voucherId));
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    return true;
  };

  // 10. Auto-Backup Snapshots & Archive
  const [autoBackupSnapshots, setAutoBackupSnapshots] = useState<BackupSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BACKUPS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
    } catch {
      return null;
    }
  });

  // Sync snapshots to storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(autoBackupSnapshots));
    } catch (e) {
      console.error('Error saving backup snapshots', e);
    }
  }, [autoBackupSnapshots]);

  const createBackupSnapshot = (reason: string = 'پشتیبان خودکار'): BackupSnapshot => {
    const data = {
      settings,
      chartOfAccounts,
      contacts,
      bankAccounts,
      productCategories,
      products,
      invoices,
      vouchers,
      expenses,
      exportDate: new Date().toISOString(),
      shamsiDate: getCurrentShamsiDate(),
      version: '1.0.0',
    };

    const payload = JSON.stringify(data, null, 2);
    const now = new Date();
    const shamsiTime = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formattedDate = getCurrentShamsiDate();

    const snapshot: BackupSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: Date.now(),
      shamsiDate: formattedDate,
      shamsiTime,
      reason,
      sizeBytes: new Blob([payload]).size,
      counts: {
        invoices: invoices.length,
        vouchers: vouchers.length,
        accounts: chartOfAccounts.length,
        contacts: contacts.length,
        products: products.length,
        expenses: expenses.length,
        banks: bankAccounts.length,
      },
      payload,
    };

    setAutoBackupSnapshots((prev) => [snapshot, ...prev.slice(0, 14)]);
    const timeStr = `${formattedDate} - ${shamsiTime}`;
    setLastBackupTime(timeStr);
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, timeStr);
    } catch {}

    return snapshot;
  };

  // Automatic Backup on Close / Unload / Page Hide
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const data = {
          settings,
          chartOfAccounts,
          contacts,
          bankAccounts,
          productCategories,
          products,
          invoices,
          vouchers,
          expenses,
          exportDate: new Date().toISOString(),
          shamsiDate: getCurrentShamsiDate(),
          version: '1.0.0',
        };

        const payload = JSON.stringify(data, null, 2);
        const now = new Date();
        const shamsiTime = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const formattedDate = getCurrentShamsiDate();

        const snapshot: BackupSnapshot = {
          id: `snap-${Date.now()}`,
          timestamp: Date.now(),
          shamsiDate: formattedDate,
          shamsiTime,
          reason: 'پشتیبان خودکار هنگام خروج از سامانه',
          sizeBytes: new Blob([payload]).size,
          counts: {
            invoices: invoices.length,
            vouchers: vouchers.length,
            accounts: chartOfAccounts.length,
            contacts: contacts.length,
            products: products.length,
            expenses: expenses.length,
            banks: bankAccounts.length,
          },
          payload,
        };

        const existingStr = localStorage.getItem(STORAGE_KEYS.BACKUPS);
        const existing: BackupSnapshot[] = existingStr ? JSON.parse(existingStr) : [];
        const updated = [snapshot, ...existing.slice(0, 14)];
        localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, `${formattedDate} - ${shamsiTime}`);
      } catch (err) {
        console.error('Error during auto-backup on close', err);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [settings, chartOfAccounts, contacts, bankAccounts, productCategories, products, invoices, vouchers, expenses]);

  const restoreSnapshot = (snapshotId: string): boolean => {
    const found = autoBackupSnapshots.find((s) => s.id === snapshotId);
    if (!found) return false;
    return importDatabaseJSON(found.payload);
  };

  const deleteSnapshot = (snapshotId: string) => {
    setAutoBackupSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
  };

  const clearAllSnapshots = () => {
    setAutoBackupSnapshots([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.BACKUPS);
    } catch {}
  };

  const exportSnapshotJSON = (snapshot: BackupSnapshot) => {
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(snapshot.payload);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute(
      'download',
      `Hesabdari_Backup_${snapshot.shamsiDate.replace(/\//g, '-')}_${snapshot.shamsiTime.replace(/:/g, '-')}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const createNewFinancialYear = (year: string, title?: string): FinancialYearInfo => {
    const existing = financialYears.find((y) => y.year === year);
    if (existing) return existing;

    const newYearInfo: FinancialYearInfo = {
      year,
      title: title || `سال مالی ${year}`,
      startDate: `${year}/01/01`,
      endDate: `${year}/12/29`,
      isClosed: false,
      notes: `سال مالی ایجاد شده در سامانه`,
    };

    setFinancialYears((prev) => [newYearInfo, ...prev]);
    return newYearInfo;
  };

  const switchFinancialYear = (year: string) => {
    setSettings((prev) => ({ ...prev, financialYear: year }));
  };

  const closeFinancialYear = (yearToClose: string, newYear: string): boolean => {
    createBackupSnapshot(`پشتیبان خودکار قبل از بستن سال مالی ${yearToClose}`);

    const currentDate = getCurrentShamsiDate();
    const trial = calculateTrialBalance(chartOfAccounts, vouchers);

    // 1. Temporary Accounts: Revenues (5) vs Costs & Expenses (6, 7)
    const revItems = trial.items.filter(
      (item) => item.code.startsWith('5') && item.level === 'moein' && item.turnoverCredit > item.turnoverDebit
    );
    const expItems = trial.items.filter(
      (item) => (item.code.startsWith('6') || item.code.startsWith('7')) && item.level === 'moein' && item.turnoverDebit > item.turnoverCredit
    );

    const totalRev = revItems.reduce((s, it) => s + (it.turnoverCredit - it.turnoverDebit), 0);
    const totalExp = expItems.reduce((s, it) => s + (it.turnoverDebit - it.turnoverCredit), 0);
    const netIncome = totalRev - totalExp;

    // Step 1: بستن حساب‌های موقت به خلاصه سود و زیان (۸۰۱۰۱)
    const tempClosingItems: VoucherItem[] = [];
    revItems.forEach((it) => {
      const amt = it.turnoverCredit - it.turnoverDebit;
      if (amt > 0) {
        tempClosingItems.push({
          id: `tci-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          accountCode: it.code,
          accountTitle: it.title,
          debit: amt,
          credit: 0,
          description: `بستن حساب درآمد به خلاصه سود و زیان سال ${yearToClose}`,
        });
      }
    });

    expItems.forEach((it) => {
      const amt = it.turnoverDebit - it.turnoverCredit;
      if (amt > 0) {
        tempClosingItems.push({
          id: `tci-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          accountCode: it.code,
          accountTitle: it.title,
          debit: 0,
          credit: amt,
          description: `بستن حساب هزینه به خلاصه سود و زیان سال ${yearToClose}`,
        });
      }
    });

    if (netIncome >= 0) {
      tempClosingItems.push({
        id: `tci-summary`,
        accountCode: '80101',
        accountTitle: 'خلاصه سود و زیان (بستن حساب‌های موقت)',
        debit: 0,
        credit: netIncome,
        description: `شناسایی سود ویژه عملکرد سال مالی ${yearToClose}`,
      });
    } else {
      tempClosingItems.push({
        id: `tci-summary`,
        accountCode: '80101',
        accountTitle: 'خلاصه سود و زیان (بستن حساب‌های موقت)',
        debit: Math.abs(netIncome),
        credit: 0,
        description: `شناسایی زیان ویژه عملکرد سال مالی ${yearToClose}`,
      });
    }

    addVoucher({
      date: `${yearToClose}/12/29`,
      referenceNumber: `CLOSE-TEMP-${yearToClose}`,
      description: `سند بستن حساب‌های موقت (سود و زیانی) به خلاصه سود و زیان سال مالی ${yearToClose}`,
      type: 'closing',
      items: tempClosingItems,
    });

    // Step 2: بستن خلاصه سود و زیان به سود و زیان انباشته (۴۰۲۰۱)
    const retainedEarningsItems: VoucherItem[] = [
      {
        id: `rei-1`,
        accountCode: '80101',
        accountTitle: 'خلاصه سود و زیان (بستن حساب‌های موقت)',
        debit: netIncome >= 0 ? netIncome : 0,
        credit: netIncome < 0 ? Math.abs(netIncome) : 0,
        description: `بستن حساب خلاصه سود و زیان سال مالی ${yearToClose}`,
      },
      {
        id: `rei-2`,
        accountCode: '40201',
        accountTitle: 'سود/زیان انباشته سنواتی',
        debit: netIncome < 0 ? Math.abs(netIncome) : 0,
        credit: netIncome >= 0 ? netIncome : 0,
        description: `انتقال سود/زیان ویژه سال ${yearToClose} به سود انباشته سنواتی`,
      },
    ];

    addVoucher({
      date: `${yearToClose}/12/29`,
      referenceNumber: `CLOSE-RETAINED-${yearToClose}`,
      description: `سند انتقال عملکرد سال مالی ${yearToClose} به سود/زیان انباشته سنواتی`,
      type: 'closing',
      items: retainedEarningsItems,
    });

    // Step 3: سند اختتامیه حساب‌های دائمی (ترازنامه‌ای)
    const permAssets = trial.items.filter(
      (it) => (it.code.startsWith('1') || it.code.startsWith('2')) && it.level === 'moein' && it.finalDebit > 0
    );
    const permLiabEq = trial.items.filter(
      (it) => (it.code.startsWith('3') || it.code.startsWith('4')) && it.level === 'moein' && it.finalCredit > 0
    );

    const closingPermItems: VoucherItem[] = [];
    permAssets.forEach((it) => {
      closingPermItems.push({
        id: `cpi-a-${it.code}`,
        accountCode: it.code,
        accountTitle: it.title,
        debit: 0,
        credit: it.finalDebit,
        description: `سند اختتامیه - بستن دارایی سال ${yearToClose}`,
      });
    });

    permLiabEq.forEach((it) => {
      closingPermItems.push({
        id: `cpi-l-${it.code}`,
        accountCode: it.code,
        accountTitle: it.title,
        debit: it.finalCredit,
        credit: 0,
        description: `سند اختتامیه - بستن بدهی/حقوق مالکانه سال ${yearToClose}`,
      });
    });

    const totDeb = closingPermItems.reduce((s, it) => s + it.debit, 0);
    const totCred = closingPermItems.reduce((s, it) => s + it.credit, 0);
    if (totDeb > totCred) {
      closingPermItems.push({
        id: `cpi-bal`,
        accountCode: '80201',
        accountTitle: 'تراز اختتامیه / افتتاحیه انتقالی',
        debit: 0,
        credit: totDeb - totCred,
        description: `موازنه تراز اختتامیه سال ${yearToClose}`,
      });
    } else if (totCred > totDeb) {
      closingPermItems.push({
        id: `cpi-bal`,
        accountCode: '80201',
        accountTitle: 'تراز اختتامیه / افتتاحیه انتقالی',
        debit: totCred - totDeb,
        credit: 0,
        description: `موازنه تراز اختتامیه سال ${yearToClose}`,
      });
    }

    const closingVoucher = addVoucher({
      date: `${yearToClose}/12/29`,
      referenceNumber: `CLOSING-${yearToClose}`,
      description: `سند اختتامیه کلیه حساب‌های ترازنامه‌ای سال مالی ${yearToClose}`,
      type: 'closing',
      items: closingPermItems,
    });

    // Step 4: سند افتتاحیه سال مالی جدید
    const openingItems: VoucherItem[] = [];
    permAssets.forEach((it) => {
      openingItems.push({
        id: `opi-a-${it.code}`,
        accountCode: it.code,
        accountTitle: it.title,
        debit: it.finalDebit,
        credit: 0,
        description: `سند افتتاحیه سال مالی ${newYear} - مانده انتقالی از سال ${yearToClose}`,
      });
    });

    permLiabEq.forEach((it) => {
      openingItems.push({
        id: `opi-l-${it.code}`,
        accountCode: it.code,
        accountTitle: it.title,
        debit: 0,
        credit: it.finalCredit,
        description: `سند افتتاحیه سال مالی ${newYear} - مانده انتقالی از سال ${yearToClose}`,
      });
    });

    const opDeb = openingItems.reduce((s, it) => s + it.debit, 0);
    const opCred = openingItems.reduce((s, it) => s + it.credit, 0);
    if (opDeb > opCred) {
      openingItems.push({
        id: `opi-bal`,
        accountCode: '80201',
        accountTitle: 'تراز اختتامیه / افتتاحیه انتقالی',
        debit: 0,
        credit: opDeb - opCred,
        description: `موازنه تراز افتتاحیه سال ${newYear}`,
      });
    } else if (opCred > opDeb) {
      openingItems.push({
        id: `opi-bal`,
        accountCode: '80201',
        accountTitle: 'تراز اختتامیه / افتتاحیه انتقالی',
        debit: opCred - opDeb,
        credit: 0,
        description: `موازنه تراز افتتاحیه سال ${newYear}`,
      });
    }

    const openingVoucher = addVoucher({
      date: `${newYear}/01/01`,
      referenceNumber: `OPENING-${newYear}`,
      description: `سند افتتاحیه سال مالی جدید ${newYear} (مانده‌های ترازنامه‌ای انتقالی از سال ${yearToClose})`,
      type: 'opening',
      items: openingItems,
    });

    // Update Financial Years state
    setFinancialYears((prev) => {
      const updated = prev.map((y) =>
        y.year === yearToClose
          ? {
              ...y,
              isClosed: true,
              closedAt: currentDate,
              closingVoucherId: closingVoucher.id,
              closingVoucherNumber: closingVoucher.voucherNumber,
              nextYear: newYear,
            }
          : y
      );

      const existsNew = updated.some((y) => y.year === newYear);
      if (!existsNew) {
        updated.unshift({
          year: newYear,
          title: `سال مالی ${newYear} (جاری)`,
          startDate: `${newYear}/01/01`,
          endDate: `${newYear}/12/29`,
          isClosed: false,
          openingVoucherId: openingVoucher.id,
          openingVoucherNumber: openingVoucher.voucherNumber,
          notes: `ایجاد شده بر اساس بستن سال مالی ${yearToClose}`,
        });
      }

      return updated;
    });

    // Update settings active year
    setSettings((prev) => ({
      ...prev,
      financialYear: newYear,
    }));

    createBackupSnapshot(`پشتیبان خودکار پس از بستن موفق سال مالی ${yearToClose}`);
    return true;
  };

  // Partner Transactions: Deposit or Withdrawal
  const recordPartnerTransaction = (
    partnerId: string,
    type: 'deposit' | 'withdrawal',
    amount: number,
    bankAccountId: string,
    description: string,
    date?: string
  ): JournalVoucher => {
    const partner = contacts.find((c) => c.id === partnerId);
    const bank = bankAccounts.find((b) => b.id === bankAccountId);
    const partnerName = partner ? partner.name : 'شریک';
    const bankTitle = bank ? bank.title : 'بانک ریالی';
    const docDate = date || getCurrentShamsiDate();

    let items: VoucherItem[] = [];

    if (type === 'deposit') {
      // شریک پول واریز کرده به شرکت (بانک بدهکار، جاری شرکا بستانکار)
      items = [
        {
          id: `pt-${Date.now()}-1`,
          accountCode: '10102',
          accountTitle: 'حساب‌های بانکی ریالی',
          debit: amount,
          credit: 0,
          description: `واریز به ${bankTitle} توسط شریک: ${partnerName}`,
          contactId: partnerId,
        },
        {
          id: `pt-${Date.now()}-2`,
          accountCode: '40303',
          accountTitle: 'واریز و آورده شرکا (جاری شرکا)',
          debit: 0,
          credit: amount,
          description: `${description || `واریز و آورده نقدی شریک (${partnerName})`}`,
          contactId: partnerId,
        },
      ];
    } else {
      // شریک پول برداشت کرده از شرکت (جاری شرکا بدهکار، بانک بستانکار)
      items = [
        {
          id: `pt-${Date.now()}-1`,
          accountCode: '40302',
          accountTitle: 'برداشت‌های جاری شرکا',
          debit: amount,
          credit: 0,
          description: `${description || `برداشت نقدی از حساب توسط شریک (${partnerName})`}`,
          contactId: partnerId,
        },
        {
          id: `pt-${Date.now()}-2`,
          accountCode: '10102',
          accountTitle: 'حساب‌های بانکی ریالی',
          debit: 0,
          credit: amount,
          description: `پرداخت از ${bankTitle} بابت برداشت جاری شریک: ${partnerName}`,
          contactId: partnerId,
        },
      ];
    }

    const voucher = addVoucher({
      date: docDate,
      referenceNumber: `PRT-${Date.now().toString().slice(-6)}`,
      description: `سند ${type === 'deposit' ? 'واریز و آورده' : 'برداشت نقدی'} جاری شرکا - ${partnerName}`,
      type: 'manual',
      items,
    });

    return voucher;
  };

  const resetToDefaultData = () => {
    // Save safety snapshot first!
    createBackupSnapshot('پیش از بازنشانی به پیش‌فرض کارخانه');

    setSettings(defaultCompanySettings);
    setChartOfAccounts(defaultChartOfAccounts);
    setContacts(defaultContacts);
    setBankAccounts(defaultBankAccounts);
    setProductCategories(defaultProductCategories);
    setProducts(defaultProducts);
    setInvoices(defaultInvoices);
    setVouchers(defaultJournalVouchers);
    setExpenses(defaultExpenses);
    setFinancialYears(defaultFinancialYears);
  };

  const exportDatabaseJSON = () => {
    const data = {
      settings,
      chartOfAccounts,
      contacts,
      bankAccounts,
      productCategories,
      products,
      invoices,
      vouchers,
      expenses,
      financialYears,
      exportDate: new Date().toISOString(),
      shamsiDate: getCurrentShamsiDate(),
      version: '1.0.0',
    };
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `Hesabdari_Meh_Backup_${getCurrentShamsiDate().replace(/\//g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    createBackupSnapshot('خروجی دستی فایل JSON');
  };

  const importDatabaseJSON = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.chartOfAccounts && parsed.invoices && parsed.vouchers) {
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.chartOfAccounts) setChartOfAccounts(parsed.chartOfAccounts);
        if (parsed.contacts) setContacts(parsed.contacts);
        if (parsed.bankAccounts) setBankAccounts(parsed.bankAccounts);
        if (parsed.productCategories) setProductCategories(parsed.productCategories);
        if (parsed.products) setProducts(parsed.products);
        if (parsed.invoices) setInvoices(parsed.invoices);
        if (parsed.vouchers) setVouchers(parsed.vouchers);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.financialYears) setFinancialYears(parsed.financialYears);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AccountingContext.Provider
      value={{
        settings,
        updateSettings,
        chartOfAccounts,
        addAccountCategory,
        updateAccountCategory,
        deleteAccountCategory,
        contacts,
        addContact,
        updateContact,
        deleteContact,
        bankAccounts,
        addBankAccount,
        updateBankAccount,
        deleteBankAccount,
        productCategories,
        addProductCategory,
        updateProductCategory,
        deleteProductCategory,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        vouchers,
        addVoucher,
        updateVoucher,
        deleteVoucher,
        invoices,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        financialYears,
        createNewFinancialYear,
        closeFinancialYear,
        switchFinancialYear,
        recordPartnerTransaction,
        resetToDefaultData,
        exportDatabaseJSON,
        importDatabaseJSON,
        autoBackupSnapshots,
        createBackupSnapshot,
        restoreSnapshot,
        deleteSnapshot,
        clearAllSnapshots,
        exportSnapshotJSON,
        lastBackupTime,
      }}
    >
      {children}
    </AccountingContext.Provider>
  );
};

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return context;
};
