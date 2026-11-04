import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
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
  FinancialYearInfo,
  ChequeRecord,
  FinancialTransaction
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
  defaultFinancialYears,
  defaultCheques,
  defaultFinancialTransactions
} from '../utils/defaultData';
import { getCurrentShamsiDate } from '../utils/dateUtils';
import { calculateTrialBalance } from '../utils/financialCalculations';
import { dispatchBackupToAllAdmins, BotSendResult } from '../utils/botBackupService';

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
  performStocktaking: (
    adjustments: { productId: string; countedQty: number; reason?: string }[],
    date?: string,
    notes?: string
  ) => JournalVoucher | null;

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

  // Cheque & Treasury Management
  cheques: ChequeRecord[];
  addCheque: (chq: Omit<ChequeRecord, 'id' | 'createdAt'>) => ChequeRecord;
  updateCheque: (id: string, chq: Partial<ChequeRecord>) => void;
  deleteCheque: (id: string) => boolean;
  passCheque: (id: string, bankAccountId: string, date?: string) => boolean;
  bounceCheque: (id: string, date?: string, reason?: string) => boolean;
  returnCheque: (id: string, date?: string) => boolean;

  // Ready Financial Transactions (Receipts, Payments, Transfers)
  financialTransactions: FinancialTransaction[];
  addFinancialTransaction: (
    tx: Omit<FinancialTransaction, 'id' | 'transactionNumber' | 'createdAt'> & { transactionNumber?: number }
  ) => FinancialTransaction;
  deleteFinancialTransaction: (id: string) => boolean;

  // Financial Year Management
  financialYears: FinancialYearInfo[];
  createNewFinancialYear: (year: string, title?: string, startDate?: string, endDate?: string) => FinancialYearInfo;
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
  runSampleAccountingScenario: () => Promise<void>;
  clearAllDataToZero: () => Promise<void>;
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
  triggerBotBackupNow: () => Promise<BotSendResult[]>;

  // Server & Multi-Computer Sync
  serverSyncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastServerSyncTime: string | null;
  syncWithServer: () => Promise<void>;
}

const STORAGE_KEYS = {
  SETTINGS: 'acc_settings_v3',
  ACCOUNTS: 'acc_accounts_v3',
  CONTACTS: 'acc_contacts_v3',
  BANKS: 'acc_banks_v3',
  CATEGORIES: 'acc_categories_v3',
  PRODUCTS: 'acc_products_v3',
  VOUCHERS: 'acc_vouchers_v3',
  INVOICES: 'acc_invoices_v3',
  EXPENSES: 'acc_expenses_v3',
  YEARS: 'acc_financial_years_v3',
  BACKUPS: 'acc_backup_snapshots_v3',
  LAST_BACKUP: 'acc_last_backup_time_v3',
  CHEQUES: 'acc_cheques_v3',
  FIN_TX: 'acc_fin_tx_v3',
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

  // 11. Cheques (Treasury)
  const [cheques, setCheques] = useState<ChequeRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CHEQUES);
      return saved ? JSON.parse(saved) : defaultCheques;
    } catch {
      return defaultCheques;
    }
  });

  // 12. Financial Transactions
  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FIN_TX);
      return saved ? JSON.parse(saved) : defaultFinancialTransactions;
    } catch {
      return defaultFinancialTransactions;
    }
  });

  // 13. Auto-Backup Snapshots & Archive
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

  // Server Synchronization State
  const [serverSyncStatus, setServerSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastServerSyncTime, setLastServerSyncTime] = useState<string | null>(() => 
    new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  
  const clientIdRef = useRef<string>(
    typeof window !== 'undefined'
      ? 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now()
      : 'server_client'
  );
  const serverVersionRef = useRef<number>(1);
  const isInitialLoadedRef = useRef<boolean>(false);
  const isSavingToServerRef = useRef<boolean>(false);
  const isApplyingRemoteUpdateRef = useRef<boolean>(false);
  const consecutiveFailuresRef = useRef<number>(0);

  // Sync to local storage as offline cache
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(cheques));
    } catch (e) { console.error('Error saving cheques', e); }
  }, [cheques]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FIN_TX, JSON.stringify(financialTransactions));
    } catch (e) { console.error('Error saving financialTransactions', e); }
  }, [financialTransactions]);

  // Apply server-provided state without triggering save loop
  const applyServerDatabase = (serverDb: any) => {
    if (!serverDb || typeof serverDb !== 'object') return;
    isApplyingRemoteUpdateRef.current = true;

    if (serverDb.settings) setSettings(serverDb.settings);
    if (serverDb.accounts && Array.isArray(serverDb.accounts) && serverDb.accounts.length > 0) {
      setChartOfAccounts(serverDb.accounts);
    }
    if (Array.isArray(serverDb.contacts)) setContacts(serverDb.contacts);
    if (Array.isArray(serverDb.bankAccounts)) setBankAccounts(serverDb.bankAccounts);
    if (Array.isArray(serverDb.categories)) setProductCategories(serverDb.categories);
    if (Array.isArray(serverDb.products)) setProducts(serverDb.products);
    if (Array.isArray(serverDb.invoices)) setInvoices(serverDb.invoices);
    if (Array.isArray(serverDb.vouchers)) setVouchers(serverDb.vouchers);
    if (Array.isArray(serverDb.expenses)) setExpenses(serverDb.expenses);
    if (Array.isArray(serverDb.financialYears)) setFinancialYears(serverDb.financialYears);
    if (Array.isArray(serverDb.cheques)) setCheques(serverDb.cheques);
    if (Array.isArray(serverDb.financialTransactions)) setFinancialTransactions(serverDb.financialTransactions);
    if (Array.isArray(serverDb.backups)) setAutoBackupSnapshots(serverDb.backups);

    if (serverDb.version) {
      serverVersionRef.current = serverDb.version;
    }
    consecutiveFailuresRef.current = 0;
    setLastServerSyncTime(new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setServerSyncStatus('synced');

    setTimeout(() => {
      isApplyingRemoteUpdateRef.current = false;
      isInitialLoadedRef.current = true;
    }, 550);
  };

  // Load from Central Linux Server on initial mount or manual click (Server is always the Single Source of Truth)
  const syncWithServer = async () => {
    try {
      setServerSyncStatus('syncing');
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (res.ok) {
        const serverDb = await res.json();
        if (serverDb && typeof serverDb === 'object') {
          applyServerDatabase(serverDb);
        } else {
          isInitialLoadedRef.current = true;
        }
        consecutiveFailuresRef.current = 0;
        setServerSyncStatus('synced');
      } else {
        isInitialLoadedRef.current = true;
        consecutiveFailuresRef.current += 1;
        if (consecutiveFailuresRef.current > 2) {
          setServerSyncStatus('offline');
        }
      }
    } catch (err) {
      console.warn('Central server sync connection attempt:', err);
      isInitialLoadedRef.current = true;
      consecutiveFailuresRef.current += 1;
      if (consecutiveFailuresRef.current > 2) {
        setServerSyncStatus('offline');
      }
    }
  };

  // 1. Initial Load & Real-time Live SSE connection across all computers
  useEffect(() => {
    syncWithServer();

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/events');

        eventSource.addEventListener('connected', () => {
          consecutiveFailuresRef.current = 0;
          setServerSyncStatus('synced');
        });

        eventSource.addEventListener('sync', (e: MessageEvent) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload && payload.data && payload.version) {
              // If this client sent it, skip re-applying state
              if (payload.senderClientId === clientIdRef.current) {
                serverVersionRef.current = payload.version;
                setLastServerSyncTime(new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                setServerSyncStatus('synced');
                return;
              }

              // Apply live update from other clients/computers immediately
              if (payload.version >= serverVersionRef.current) {
                applyServerDatabase(payload.data);
              }
            }
          } catch (err) {
            console.error('Error parsing SSE sync data:', err);
          }
        });

        eventSource.onopen = () => {
          consecutiveFailuresRef.current = 0;
          setServerSyncStatus('synced');
        };

        eventSource.onerror = () => {
          // SSE auto-reconnects, fallback to polling
        };
      } catch (err) {
        console.warn('EventSource setup notice:', err);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // 2. Save to Central Server whenever local changes happen
  useEffect(() => {
    if (!isInitialLoadedRef.current || isApplyingRemoteUpdateRef.current) return;

    const timer = setTimeout(async () => {
      if (isSavingToServerRef.current || isApplyingRemoteUpdateRef.current) return;
      isSavingToServerRef.current = true;

      try {
        const payload = {
          settings,
          accounts: chartOfAccounts,
          contacts,
          bankAccounts,
          categories: productCategories,
          products,
          invoices,
          vouchers,
          expenses,
          financialYears,
          cheques,
          financialTransactions,
          backups: autoBackupSnapshots,
          senderClientId: clientIdRef.current
        };

        const res = await fetch('/api/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Client-Id': clientIdRef.current
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const resData = await res.json();
          serverVersionRef.current = resData.version;
          consecutiveFailuresRef.current = 0;
          setLastServerSyncTime(new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          setServerSyncStatus('synced');
        } else {
          consecutiveFailuresRef.current += 1;
          if (consecutiveFailuresRef.current > 2) {
            setServerSyncStatus('error');
          }
        }
      } catch (err) {
        consecutiveFailuresRef.current += 1;
        if (consecutiveFailuresRef.current > 2) {
          setServerSyncStatus('offline');
        }
      } finally {
        isSavingToServerRef.current = false;
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [
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
    cheques,
    financialTransactions,
    autoBackupSnapshots
  ]);

  // 3. Fallback polling for backup & window focus check
  useEffect(() => {
    const checkServerVersion = async () => {
      if (!isInitialLoadedRef.current || isSavingToServerRef.current || isApplyingRemoteUpdateRef.current) return;
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (res.ok) {
          const { version } = await res.json();
          if (version && version > serverVersionRef.current) {
            await syncWithServer();
          } else {
            consecutiveFailuresRef.current = 0;
            setServerSyncStatus('synced');
          }
        }
      } catch {
        // silent
      }
    };

    const interval = setInterval(checkServerVersion, 4000);
    window.addEventListener('focus', checkServerVersion);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkServerVersion);
    };
  }, []);

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
    const initialQty = prdData.initialStock ?? prdData.stockQuantity ?? 0;
    const stockQty = prdData.stockQuantity ?? prdData.initialStock ?? 0;
    const cat = productCategories.find((c) => c.id === prdData.categoryId);
    const newProduct: Product = {
      ...prdData,
      id: `prd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: nextCode,
      categoryTitle: prdData.categoryTitle || cat?.title || 'کالای عمومی',
      initialStock: initialQty,
      stockQuantity: stockQty,
      stockAdjustments: prdData.stockAdjustments || [],
    };
    setProducts((prev) => [...prev, newProduct]);
    return newProduct;
  };

  const updateProduct = (id: string, prdData: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const cat = prdData.categoryId
          ? productCategories.find((c) => c.id === prdData.categoryId)
          : undefined;

        // Calculate net movements from invoices and stocktaking for this product
        let netMovement = 0;
        invoices.forEach((inv) => {
          const item = inv.items.find((i) => i.productId === p.id);
          if (!item) return;
          if (inv.type === 'purchase' || inv.type === 'sales_return') netMovement += item.quantity;
          else if (inv.type === 'sales' || inv.type === 'purchase_return') netMovement -= item.quantity;
        });
        (prdData.stockAdjustments || p.stockAdjustments || []).forEach((adj) => {
          netMovement += adj.diffQty;
        });

        let nextInitialStock = p.initialStock ?? Math.max(0, p.stockQuantity - netMovement);
        let nextStockQuantity = p.stockQuantity;

        if (prdData.initialStock !== undefined) {
          nextInitialStock = Math.max(0, Number(prdData.initialStock) || 0);
          nextStockQuantity =
            prdData.stockQuantity !== undefined
              ? Math.max(0, Number(prdData.stockQuantity) || 0)
              : Math.max(0, nextInitialStock + netMovement);
        } else if (prdData.stockQuantity !== undefined) {
          nextStockQuantity = Math.max(0, Number(prdData.stockQuantity) || 0);
          nextInitialStock = Math.max(0, nextStockQuantity - netMovement);
        }

        return {
          ...p,
          ...prdData,
          initialStock: nextInitialStock,
          stockQuantity: nextStockQuantity,
          categoryTitle: prdData.categoryTitle || cat?.title || p.categoryTitle,
        };
      })
    );
  };

  // Auto-heal products with buyPrice=0 if purchase invoices exist, and auto-sync System Opening Balance Voucher
  useEffect(() => {
    if (!isInitialLoadedRef.current || isApplyingRemoteUpdateRef.current) return;

    // 1. Heal product buyPrice if 0 but purchased in an invoice
    let needsProductHeal = false;
    const healedProducts = products.map((p) => {
      let latestPurPrice = 0;
      let netMove = 0;
      invoices.forEach((inv) => {
        const it = inv.items.find((i) => i.productId === p.id);
        if (!it) return;
        if (inv.type === 'purchase' || inv.type === 'sales_return') {
          netMove += it.quantity;
          if (inv.type === 'purchase' && it.unitPrice > 0) {
            latestPurPrice = it.unitPrice;
          }
        } else if (inv.type === 'sales' || inv.type === 'purchase_return') {
          netMove -= it.quantity;
        }
      });
      (p.stockAdjustments || []).forEach((adj) => {
        netMove += adj.diffQty;
      });

      const impliedInit = Math.max(0, (Number(p.stockQuantity) || 0) - netMove);
      const shouldHealBuyPrice = (!p.buyPrice || p.buyPrice <= 0) && latestPurPrice > 0;
      const shouldHealInitStock = (p.initialStock === undefined || p.initialStock === null || (p.initialStock === 0 && impliedInit > 0)) && impliedInit > 0;

      if (shouldHealBuyPrice || shouldHealInitStock) {
        needsProductHeal = true;
        return {
          ...p,
          buyPrice: shouldHealBuyPrice ? latestPurPrice : p.buyPrice,
          initialStock: shouldHealInitStock ? impliedInit : p.initialStock,
        };
      }
      return p;
    });

    if (needsProductHeal) {
      setProducts(healedProducts);
      return;
    }

    // 2. Sync Opening Balance Voucher (سند افتتاحیه اول دوره) for all non-zero initial balances in Banks, Products, and Contacts
    if (settings.autoGenerateVouchers === false) return;

    const openingItems: VoucherItem[] = [];

    bankAccounts.forEach((b) => {
      const initBal = Number(b.initialBalance) || 0;
      if (initBal > 0) {
        const accCode = b.type === 'cash' ? '10101' : b.type === 'pos' ? '10104' : '10102';
        const accTitle =
          b.type === 'cash'
            ? 'صندوق‌ها'
            : b.type === 'pos'
            ? 'دستگاه‌های کارتخوان (POS)'
            : 'حساب‌های بانکی ریالی';
        openingItems.push({
          id: `vi-open-bank-${b.id}`,
          accountCode: accCode,
          accountTitle: accTitle,
          tafsiliId: b.id,
          tafsiliTitle: b.title,
          description: `موجودی اول دوره ${b.title}`,
          debit: initBal,
          credit: 0,
        });
      }
    });

    products.forEach((p) => {
      let netMove = 0;
      invoices.forEach((inv) => {
        const it = inv.items.find((i) => i.productId === p.id);
        if (!it) return;
        if (inv.type === 'purchase' || inv.type === 'sales_return') netMove += it.quantity;
        else if (inv.type === 'sales' || inv.type === 'purchase_return') netMove -= it.quantity;
      });
      (p.stockAdjustments || []).forEach((adj) => {
        netMove += adj.diffQty;
      });
      const impliedInit = Math.max(0, (Number(p.stockQuantity) || 0) - netMove);
      const initStock = (Number(p.initialStock) || 0) > 0 ? Number(p.initialStock) : impliedInit;
      const unitCost = Number(p.buyPrice) || 0;
      const totalVal = Math.round(initStock * unitCost);
      if (totalVal > 0) {
        openingItems.push({
          id: `vi-open-prd-${p.id}`,
          accountCode: '10401',
          accountTitle: 'موجودی کالای انبار مرکزی',
          tafsiliId: p.id,
          tafsiliTitle: p.title,
          description: `موجودی اول دوره انبار: ${p.title} (${initStock} ${p.unit})`,
          debit: totalVal,
          credit: 0,
        });
      }
    });

    contacts.forEach((c) => {
      const initBal = Number(c.initialBalance) || 0;
      if (initBal > 0) {
        const isCredit = c.initialBalanceType === 'credit';
        openingItems.push({
          id: `vi-open-cnt-${c.id}`,
          accountCode: isCredit ? '30101' : '10301',
          accountTitle: isCredit
            ? 'حساب‌های پرداختنی تجاری (تامین‌کنندگان)'
            : 'حساب‌های دریافتنی تجاری (مشتریان)',
          tafsiliId: c.id,
          contactId: c.id,
          tafsiliTitle: c.name,
          description: `مانده ${isCredit ? 'بستانکار' : 'بدهکار'} اول دوره طرف‌حساب (${c.name})`,
          debit: isCredit ? 0 : initBal,
          credit: isCredit ? initBal : 0,
        });
      }
    });

    const totalOpenDeb = openingItems.reduce((s, i) => s + i.debit, 0);
    const totalOpenCrd = openingItems.reduce((s, i) => s + i.credit, 0);
    const diff = totalOpenDeb - totalOpenCrd;

    if (openingItems.length > 0 && Math.abs(diff) > 0) {
      openingItems.push({
        id: 'vi-open-capital',
        accountCode: '40101',
        accountTitle: 'سرمایه اولیه',
        tafsiliTitle: 'حساب سرمایه و تراز افتتاحیه',
        description: 'تراز سند افتتاحیه و سرمایه اولیه اول دوره',
        debit: diff < 0 ? Math.abs(diff) : 0,
        credit: diff > 0 ? diff : 0,
      });
    }

    const existingOpening = vouchers.find(
      (v) =>
        v.id === 'vch-101' ||
        v.id === 'vch-opening-auto' ||
        (v.type === 'opening' && !v.referenceNumber?.startsWith('OPENING-'))
    );

    const serializeItems = (arr: VoucherItem[]) =>
      arr.map((i) => `${i.accountCode}:${i.tafsiliId || i.tafsiliTitle}:${i.debit}:${i.credit}`).join('|');

    if (openingItems.length === 0) {
      if (existingOpening && existingOpening.isAutoGenerated) {
        setVouchers((prev) => prev.filter((v) => v.id !== existingOpening.id));
      }
      return;
    }

    const currentSig = existingOpening ? serializeItems(existingOpening.items) : '';
    const nextSig = serializeItems(openingItems);

    if (currentSig !== nextSig) {
      const activeYear = settings.financialYear || '1403';
      const updatedOpeningVoucher: JournalVoucher = {
        id: existingOpening?.id || 'vch-opening-auto',
        voucherNumber: existingOpening?.voucherNumber || 101,
        date: existingOpening?.date || `${activeYear}/01/01`,
        gregorianDate: existingOpening?.gregorianDate || new Date().toISOString().split('T')[0],
        referenceNumber: existingOpening?.referenceNumber || 'OPEN-INIT',
        description: `سند افتتاحیه اتوماتیک اول دوره (بانک‌ها، صندوق، موجودی اول دوره انبار و اشخاص)`,
        type: 'opening',
        status: 'permanent',
        isAutoGenerated: true,
        sourceType: 'manual',
        createdAt: existingOpening?.createdAt || getCurrentShamsiDate(),
        items: openingItems,
      };

      setVouchers((prev) => {
        const exists = prev.some((v) => v.id === updatedOpeningVoucher.id);
        if (exists) {
          return prev.map((v) => (v.id === updatedOpeningVoucher.id ? updatedOpeningVoucher : v));
        }
        return [...prev, updatedOpeningVoucher];
      });
    }
  }, [bankAccounts, products, contacts, invoices, settings.autoGenerateVouchers]);

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    return true;
  };

  const performStocktaking = (
    adjustments: { productId: string; countedQty: number; reason?: string }[],
    date?: string,
    notes?: string
  ): JournalVoucher | null => {
    const opDate = date || getCurrentShamsiDate();
    const maxVoucherNumber = vouchers.length > 0 ? Math.max(...vouchers.map((v) => v.voucherNumber)) : 100;
    const nextVoucherNo = maxVoucherNumber + 1;
    const voucherId = `vch-stk-${Date.now()}`;

    let netValueDiff = 0; // positive = surplus (اضافه انبار), negative = deficit (کسری انبار)
    const changedItemsSummary: string[] = [];

    const validAdjustments = adjustments.filter((adj) => {
      const p = products.find((prd) => prd.id === adj.productId);
      return p && adj.countedQty !== p.stockQuantity && adj.countedQty >= 0;
    });

    if (validAdjustments.length === 0) return null;

    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const adj = validAdjustments.find((a) => a.productId === p.id);
        if (!adj) return p;

        const diffQty = adj.countedQty - p.stockQuantity;
        const unitCost = p.buyPrice || 0;
        netValueDiff += diffQty * unitCost;
        changedItemsSummary.push(
          `${p.title} (${diffQty > 0 ? '+' + diffQty + ' اضافه' : diffQty + ' کسری'})`
        );

        const newAdjRecord = {
          id: `stk-adj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          date: opDate,
          systemQty: p.stockQuantity,
          countedQty: adj.countedQty,
          diffQty,
          unitCost,
          reason: adj.reason || notes || 'تعدیل موجودی در انبارگردانی دوره',
          voucherId: settings.autoGenerateVouchers && Math.abs(diffQty * unitCost) > 0 ? voucherId : undefined,
          voucherNumber: settings.autoGenerateVouchers && Math.abs(diffQty * unitCost) > 0 ? nextVoucherNo : undefined,
        };

        return {
          ...p,
          stockQuantity: adj.countedQty,
          stockAdjustments: [...(p.stockAdjustments || []), newAdjRecord],
        };
      })
    );

    if (settings.autoGenerateVouchers && Math.abs(netValueDiff) > 0) {
      const absVal = Math.abs(netValueDiff);
      const isSurplus = netValueDiff > 0;

      const stockVoucher: JournalVoucher = {
        id: voucherId,
        voucherNumber: nextVoucherNo,
        date: opDate,
        gregorianDate: new Date().toISOString().split('T')[0],
        referenceNumber: `STK-${nextVoucherNo}`,
        description: `سند تعدیل موجودی انبارگردانی: ${changedItemsSummary.join('، ')}${notes ? ' - ' + notes : ''}`,
        type: 'stocktaking',
        status: 'permanent',
        isAutoGenerated: true,
        sourceType: 'stocktaking',
        createdAt: getCurrentShamsiDate(),
        items: isSurplus
          ? [
              {
                id: `vi-stk-deb-${Date.now()}`,
                accountCode: '10401',
                accountTitle: 'موجودی کالای انبار مرکزی',
                tafsiliTitle: 'افزایش موجودی انبارگردانی',
                description: `ثبت اضافه انبارگردانی (${changedItemsSummary.join('، ')})`,
                debit: absVal,
                credit: 0,
              },
              {
                id: `vi-stk-crd-${Date.now()}`,
                accountCode: '60101',
                accountTitle: 'بهای تمام شده کالای فروش رفته',
                tafsiliTitle: 'کسری و اضافات انبارگردانی',
                description: `کاهش بهای تمام شده بابت اضافه انبارگردانی`,
                debit: 0,
                credit: absVal,
              },
            ]
          : [
              {
                id: `vi-stk-deb-${Date.now()}`,
                accountCode: '60101',
                accountTitle: 'بهای تمام شده کالای فروش رفته',
                tafsiliTitle: 'کسری و اضافات انبارگردانی',
                description: `ثبت کسری انبارگردانی (${changedItemsSummary.join('، ')})`,
                debit: absVal,
                credit: 0,
              },
              {
                id: `vi-stk-crd-${Date.now()}`,
                accountCode: '10401',
                accountTitle: 'موجودی کالای انبار مرکزی',
                tafsiliTitle: 'کاهش موجودی انبارگردانی',
                description: `کاهش موجودی انبار مرکزی طبق صورتجلسه انبارگردانی`,
                debit: 0,
                credit: absVal,
              },
            ],
      };

      setVouchers((prev) => [stockVoucher, ...prev]);
      return stockVoucher;
    }

    return null;
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
            tafsiliId: c.cashId,
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
            tafsiliId: b.bankId,
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
          contactId: inv.contactId,
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
            tafsiliId: c.cashId,
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
            tafsiliId: b.bankId,
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
          contactId: inv.contactId,
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
      const totalDiscounts =
        inv.totalItemsDiscount + inv.totalInvoiceDiscount + (inv.settlement?.discountAmount || 0);
      if (totalDiscounts > 0) {
        items.push({
          id: `vi-${Date.now()}-${Math.random()}`,
          accountCode: '50202',
          accountTitle: 'تخفیفات نقدی اعطایی فروش',
          tafsiliTitle: inv.contactName,
          description: `اصلاح تخفیفات فاکتور برگشت از فروش ${inv.invoiceNumber}`,
          debit: 0,
          credit: totalDiscounts,
        });
      }
      inv.settlement.cashPayments.forEach((c) => {
        if (c.amount > 0) {
          items.push({
            id: `vi-${Date.now()}-${Math.random()}`,
            accountCode: '10101',
            accountTitle: 'صندوق‌ها',
            tafsiliId: c.cashId,
            tafsiliTitle: c.cashTitle,
            description: `استرداد نقدی بابت برگشت از فروش ${inv.invoiceNumber}`,
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
            tafsiliId: b.bankId,
            tafsiliTitle: b.bankTitle,
            description: `استرداد بانکی بابت برگشت از فروش ${inv.invoiceNumber}`,
            debit: 0,
            credit: b.amount,
          });
        }
      });
      const paidOnReturn =
        inv.settlement.cashPayments.reduce((s, c) => s + (c.amount || 0), 0) +
        inv.settlement.bankPayments.reduce((s, b) => s + (b.amount || 0), 0);
      const remainingCreditCustomer = Math.max(0, inv.grandTotal - paidOnReturn);
      if (remainingCreditCustomer > 0) {
        items.push({
          id: `vi-${Date.now()}-${Math.random()}`,
          accountCode: '10301',
          accountTitle: 'مشتریان تجاری داخلی',
          tafsiliId: inv.contactId,
          contactId: inv.contactId,
          tafsiliTitle: inv.contactName,
          description: `بستانکار شدن مشتری بابت برگشت از فروش ${inv.invoiceNumber}`,
          debit: 0,
          credit: remainingCreditCustomer,
        });
      }
    } else if (inv.type === 'purchase_return') {
      inv.settlement.cashPayments.forEach((c) => {
        if (c.amount > 0) {
          items.push({
            id: `vi-${Date.now()}-${Math.random()}`,
            accountCode: '10101',
            accountTitle: 'صندوق‌ها',
            tafsiliId: c.cashId,
            tafsiliTitle: c.cashTitle,
            description: `دریافت نقدی بابت برگشت از خرید ${inv.invoiceNumber}`,
            debit: c.amount,
            credit: 0,
          });
        }
      });
      inv.settlement.bankPayments.forEach((b) => {
        if (b.amount > 0) {
          items.push({
            id: `vi-${Date.now()}-${Math.random()}`,
            accountCode: '10102',
            accountTitle: 'حساب‌های بانکی ریالی',
            tafsiliId: b.bankId,
            tafsiliTitle: b.bankTitle,
            description: `دریافت بانکی بابت برگشت از خرید ${inv.invoiceNumber}`,
            debit: b.amount,
            credit: 0,
          });
        }
      });
      const receivedOnReturn =
        inv.settlement.cashPayments.reduce((s, c) => s + (c.amount || 0), 0) +
        inv.settlement.bankPayments.reduce((s, b) => s + (b.amount || 0), 0);
      const remainingDebitSupplier = Math.max(0, inv.grandTotal - receivedOnReturn);
      if (remainingDebitSupplier > 0) {
        items.push({
          id: `vi-${Date.now()}-${Math.random()}`,
          accountCode: '30101',
          accountTitle: 'تامین‌کنندگان کالا و خدمات',
          tafsiliId: inv.contactId,
          contactId: inv.contactId,
          tafsiliTitle: inv.contactName,
          description: `بدهکار شدن تامین کننده بابت برگشت از خرید ${inv.invoiceNumber}`,
          debit: remainingDebitSupplier,
          credit: 0,
        });
      }
      const totalDiscounts =
        inv.totalItemsDiscount + inv.totalInvoiceDiscount + (inv.settlement?.discountAmount || 0);
      if (totalDiscounts > 0) {
        items.push({
          id: `vi-${Date.now()}-${Math.random()}`,
          accountCode: '60302',
          accountTitle: 'تخفیفات نقدی کسب شده خرید',
          tafsiliTitle: inv.contactName,
          description: `اصلاح تخفیف فاکتور برگشت از خرید ${inv.invoiceNumber}`,
          debit: totalDiscounts,
          credit: 0,
        });
      }
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
      referenceNumber: `INV-${inv.invoiceNumber}`,
      description: `صدور خودکار سند فاکتور ${invoiceTypeTitle} شماره ${inv.invoiceNumber} - ${inv.contactName}`,
      type: inv.type === 'sales' || inv.type === 'sales_return' ? 'sales' : 'purchase',
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

    // Update Product stock quantity and weighted average purchase cost on purchase invoices
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const item = createdInvoice.items.find((i) => i.productId === p.id);
        if (!item) return p;

        let delta = 0;
        let updatedBuyPrice = p.buyPrice;
        if (createdInvoice.type === 'sales') {
          delta = -item.quantity;
        } else if (createdInvoice.type === 'purchase') {
          delta = +item.quantity;
          if (item.unitPrice > 0) {
            const currentStock = Math.max(0, p.stockQuantity);
            if (currentStock === 0 || !p.buyPrice || p.buyPrice <= 0) {
              updatedBuyPrice = item.unitPrice;
            } else {
              updatedBuyPrice = Math.round(
                (currentStock * p.buyPrice + item.quantity * item.unitPrice) /
                  (currentStock + item.quantity)
              );
            }
          }
        } else if (createdInvoice.type === 'sales_return') {
          delta = +item.quantity;
        } else if (createdInvoice.type === 'purchase_return') {
          delta = -item.quantity;
        }
        return {
          ...p,
          buyPrice: updatedBuyPrice,
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

    // Auto-sync cheques from invoice into central treasury cheques
    if (createdInvoice.settlement?.chequePayments && createdInvoice.settlement.chequePayments.length > 0) {
      const isSales = createdInvoice.type === 'sales' || createdInvoice.type === 'sales_return';
      const newChequeRecords: ChequeRecord[] = createdInvoice.settlement.chequePayments
        .filter((cp) => cp.amount > 0)
        .map((cp, idx) => ({
          id: `chq-inv-${createdInvoice.id}-${idx}`,
          type: isSales ? 'receive' : 'payment',
          chequeNumber: cp.chequeNumber,
          sayadId: cp.sayadId || '',
          bankName: cp.bankName || 'بانک',
          branchName: cp.branchName || '',
          amount: cp.amount,
          issueDate: createdInvoice.date,
          dueDate: cp.dueDate,
          contactId: createdInvoice.contactId,
          contactName: createdInvoice.contactName,
          drawerName: cp.drawerName || createdInvoice.contactName,
          status: 'pending',
          voucherId: createdInvoice.voucherId,
          invoiceId: createdInvoice.id,
          createdAt: getCurrentShamsiDate(),
        }));

      if (newChequeRecords.length > 0) {
        setCheques((prev) => [...newChequeRecords, ...prev]);
      }
    }

    setInvoices((prev) => [createdInvoice, ...prev]);
    return createdInvoice;
  };

  const updateInvoice = (id: string, invData: Partial<Invoice>) => {
    const oldInv = invoices.find((i) => i.id === id);
    if (!oldInv) return;

    const updatedInv: Invoice = { ...oldInv, ...invData };

    // Sync product stock quantities (revert old, apply new) and buyPrice on purchase
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        let stock = p.stockQuantity;
        let updatedBuyPrice = p.buyPrice;
        const oldItem = oldInv.items.find((i) => i.productId === p.id);
        if (oldItem) {
          if (oldInv.type === 'sales') stock += oldItem.quantity;
          else if (oldInv.type === 'purchase') stock -= oldItem.quantity;
          else if (oldInv.type === 'sales_return') stock -= oldItem.quantity;
          else if (oldInv.type === 'purchase_return') stock += oldItem.quantity;
        }
        const newItem = updatedInv.items.find((i) => i.productId === p.id);
        if (newItem) {
          if (updatedInv.type === 'sales') stock -= newItem.quantity;
          else if (updatedInv.type === 'purchase') {
            stock += newItem.quantity;
            if (newItem.unitPrice > 0) {
              updatedBuyPrice = newItem.unitPrice;
            }
          } else if (updatedInv.type === 'sales_return') stock += newItem.quantity;
          else if (updatedInv.type === 'purchase_return') stock -= newItem.quantity;
        }
        return { ...p, buyPrice: updatedBuyPrice, stockQuantity: Math.max(0, stock) };
      })
    );

    // Regenerate auto voucher if enabled
    if (settings.autoGenerateVouchers) {
      const newVch = generateVoucherForInvoice(updatedInv);
      if (newVch) {
        if (oldInv.voucherId) {
          newVch.id = oldInv.voucherId;
          const existingVch = vouchers.find((v) => v.id === oldInv.voucherId);
          if (existingVch) newVch.voucherNumber = existingVch.voucherNumber;
          setVouchers((prev) => prev.map((v) => (v.id === oldInv.voucherId ? newVch : v)));
        } else {
          updatedInv.voucherId = newVch.id;
          setVouchers((prev) => [newVch, ...prev]);
        }
      }
    }

    setInvoices((prev) => prev.map((i) => (i.id === id ? updatedInv : i)));
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

    // Remove connected cheques if any
    setCheques((prev) => prev.filter((c) => c.invoiceId !== id));

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
        referenceNumber: `EXP-${createdExpense.expenseNumber}`,
        description: `ثبت هزینه شماره ${createdExpense.expenseNumber} - ${createdExpense.accountTitle}: ${createdExpense.description}`,
        type: 'expense',
        items: [
          {
            id: `vi-exp-deb-${Date.now()}`,
            accountCode: createdExpense.accountCode,
            accountTitle: createdExpense.accountTitle,
            tafsiliTitle: createdExpense.beneficiary || 'مرکز هزینه',
            description: createdExpense.description || createdExpense.title || createdExpense.accountTitle,
            debit: createdExpense.amount,
            credit: 0,
          },
          {
            id: `vi-exp-crd-${Date.now()}`,
            accountCode: creditAccountCode,
            accountTitle: creditAccountTitle,
            tafsiliId: createdExpense.sourceAccountId,
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
    const oldExp = expenses.find((e) => e.id === id);
    if (!oldExp) return;
    const updatedExp: Expense = { ...oldExp, ...expData };

    if (settings.autoGenerateVouchers && updatedExp.voucherId) {
      let creditAccountCode = '10101';
      let creditAccountTitle = 'صندوق‌ها';
      if (updatedExp.paymentType === 'bank') {
        creditAccountCode = '10102';
        creditAccountTitle = 'حساب‌های بانکی ریالی';
      } else if (updatedExp.paymentType === 'credit') {
        creditAccountCode = '30101';
        creditAccountTitle = 'حساب‌های پرداختنی تجاری';
      }

      setVouchers((prev) =>
        prev.map((v) =>
          v.id === updatedExp.voucherId
            ? {
                ...v,
                date: updatedExp.date,
                description: `ثبت هزینه شماره ${updatedExp.expenseNumber} - ${updatedExp.accountTitle}: ${updatedExp.description}`,
                items: [
                  {
                    id: `vi-exp-deb-${Date.now()}`,
                    accountCode: updatedExp.accountCode,
                    accountTitle: updatedExp.accountTitle,
                    tafsiliTitle: updatedExp.beneficiary || 'مرکز هزینه',
                    description: updatedExp.description || updatedExp.title || updatedExp.accountTitle,
                    debit: updatedExp.amount,
                    credit: 0,
                  },
                  {
                    id: `vi-exp-crd-${Date.now()}`,
                    accountCode: creditAccountCode,
                    accountTitle: creditAccountTitle,
                    tafsiliId: updatedExp.sourceAccountId,
                    tafsiliTitle: updatedExp.sourceAccountTitle || 'حساب پرداخت',
                    description: `پرداخت بابت ${updatedExp.accountTitle}${updatedExp.trackingNumber ? ' (کد: ' + updatedExp.trackingNumber + ')' : ''}`,
                    debit: 0,
                    credit: updatedExp.amount,
                  },
                ],
              }
            : v
        )
      );
    }

    setExpenses((prev) => prev.map((e) => (e.id === id ? updatedExp : e)));
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

  // 10. Cheques & Treasury Management
  const addCheque = (chqData: Omit<ChequeRecord, 'id' | 'createdAt'>): ChequeRecord => {
    const chqId = `chq-${Date.now()}`;
    const createdCheque: ChequeRecord = {
      ...chqData,
      id: chqId,
      createdAt: getCurrentShamsiDate(),
    };

    // Auto generate voucher for cheque if enabled
    if (settings.autoGenerateVouchers) {
      const maxVoucherNumber = vouchers.length > 0 ? Math.max(...vouchers.map((v) => v.voucherNumber)) : 100;
      const nextVoucherNo = maxVoucherNumber + 1;

      if (createdCheque.type === 'receive') {
        // دریافت چک: بدهکار اسناد دریافتنی (10201) / بستانکار حساب‌های دریافتنی (10301)
        const autoVch: JournalVoucher = {
          id: `vch-chq-rec-${Date.now()}`,
          voucherNumber: nextVoucherNo,
          date: createdCheque.issueDate || getCurrentShamsiDate(),
          gregorianDate: new Date().toISOString().split('T')[0],
          description: `دریافت چک شماره ${createdCheque.chequeNumber} (سررسید: ${createdCheque.dueDate}) از ${createdCheque.contactName}`,
          items: [
            {
              id: `vi-chq-rec-deb-${Date.now()}`,
              accountCode: '10201',
              accountTitle: 'اسناد دریافتنی تجاری (چک‌های نزد صندوق)',
              tafsiliTitle: `چک ${createdCheque.bankName} - ${createdCheque.chequeNumber}`,
              description: `دریافت چک صیادی شماره ${createdCheque.chequeNumber} از ${createdCheque.contactName}`,
              debit: createdCheque.amount,
              credit: 0,
            },
            {
              id: `vi-chq-rec-crd-${Date.now()}`,
              accountCode: '10301',
              accountTitle: 'حساب‌های دریافتنی تجاری (مشتریان)',
              tafsiliTitle: createdCheque.contactName,
              contactId: createdCheque.contactId,
              description: `تسویه حساب بابت دریافت چک سررسید ${createdCheque.dueDate}`,
              debit: 0,
              credit: createdCheque.amount,
            },
          ],
          type: 'cheque_receive',
          status: 'permanent',
          isAutoGenerated: true,
          sourceType: 'cheque',
          sourceId: chqId,
          createdAt: getCurrentShamsiDate(),
        };

        createdCheque.voucherId = autoVch.id;
        setVouchers((prev) => [autoVch, ...prev]);
      } else {
        // صدور/پرداخت چک: بدهکار حساب‌های پرداختنی (30101) / بستانکار اسناد پرداختنی تجاری (30201)
        const autoVch: JournalVoucher = {
          id: `vch-chq-pay-${Date.now()}`,
          voucherNumber: nextVoucherNo,
          date: createdCheque.issueDate || getCurrentShamsiDate(),
          gregorianDate: new Date().toISOString().split('T')[0],
          description: `صدور چک شماره ${createdCheque.chequeNumber} (سررسید: ${createdCheque.dueDate}) در وجه ${createdCheque.contactName}`,
          items: [
            {
              id: `vi-chq-pay-deb-${Date.now()}`,
              accountCode: '30101',
              accountTitle: 'حساب‌های پرداختنی تجاری (تامین‌کنندگان)',
              tafsiliTitle: createdCheque.contactName,
              contactId: createdCheque.contactId,
              description: `پرداخت بابت تسویه بدهی با چک شماره ${createdCheque.chequeNumber}`,
              debit: createdCheque.amount,
              credit: 0,
            },
            {
              id: `vi-chq-pay-crd-${Date.now()}`,
              accountCode: '30201',
              accountTitle: 'اسناد پرداختنی تجاری (چک‌های صادره)',
              tafsiliTitle: createdCheque.bankAccountTitle || `چک ${createdCheque.bankName}`,
              description: `صدور چک صیادی سررسید ${createdCheque.dueDate} در وجه ${createdCheque.contactName}`,
              debit: 0,
              credit: createdCheque.amount,
            },
          ],
          type: 'cheque_payment',
          status: 'permanent',
          isAutoGenerated: true,
          sourceType: 'cheque',
          sourceId: chqId,
          createdAt: getCurrentShamsiDate(),
        };

        createdCheque.voucherId = autoVch.id;
        setVouchers((prev) => [autoVch, ...prev]);
      }
    }

    setCheques((prev) => [createdCheque, ...prev]);
    return createdCheque;
  };

  const updateCheque = (id: string, chqData: Partial<ChequeRecord>) => {
    setCheques((prev) => prev.map((c) => (c.id === id ? { ...c, ...chqData } : c)));
  };

  const deleteCheque = (id: string) => {
    const chq = cheques.find((c) => c.id === id);
    if (!chq) return false;

    // Delete linked vouchers
    const voucherIdsToDelete = [chq.voucherId, chq.passedVoucherId, chq.bouncedVoucherId].filter(Boolean) as string[];
    if (voucherIdsToDelete.length > 0) {
      setVouchers((prev) => prev.filter((v) => !voucherIdsToDelete.includes(v.id)));
    }

    setCheques((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  const passCheque = (id: string, bankAccountId: string, passDate?: string): boolean => {
    const chq = cheques.find((c) => c.id === id);
    if (!chq) return false;

    const bank = bankAccounts.find((b) => b.id === bankAccountId);
    const bankTitle = bank ? bank.title : 'حساب بانکی';
    const opDate = passDate || getCurrentShamsiDate();

    const maxVoucherNumber = vouchers.length > 0 ? Math.max(...vouchers.map((v) => v.voucherNumber)) : 100;
    const nextVoucherNo = maxVoucherNumber + 1;

    let passVoucher: JournalVoucher | null = null;

    if (chq.type === 'receive') {
      // وصول چک دریافتی: بدهکار بانک (10102) / بستانکار اسناد دریافتنی (10201)
      passVoucher = {
        id: `vch-chq-pass-${Date.now()}`,
        voucherNumber: nextVoucherNo,
        date: opDate,
        gregorianDate: new Date().toISOString().split('T')[0],
        description: `وصول چک شماره ${chq.chequeNumber} (${chq.contactName}) و واریز به ${bankTitle}`,
        items: [
          {
            id: `vi-pass-deb-${Date.now()}`,
            accountCode: '10102',
            accountTitle: 'حساب‌های بانکی ریالی',
            tafsiliId: bankAccountId,
            tafsiliTitle: bankTitle,
            description: `واریز وصولی چک شماره ${chq.chequeNumber} به ${bankTitle}`,
            debit: chq.amount,
            credit: 0,
          },
          {
            id: `vi-pass-crd-${Date.now()}`,
            accountCode: '10201',
            accountTitle: 'اسناد دریافتنی تجاری (چک‌های نزد صندوق)',
            tafsiliTitle: `چک ${chq.bankName} - ${chq.chequeNumber}`,
            description: `خروج چک شماره ${chq.chequeNumber} از اسناد دریافتنی بابت وصول`,
            debit: 0,
            credit: chq.amount,
          },
        ],
        type: 'cheque_pass',
        status: 'permanent',
        isAutoGenerated: true,
        sourceType: 'cheque',
        sourceId: chq.id,
        createdAt: getCurrentShamsiDate(),
      };
    } else {
      // پاس شدن چک پرداختی: بدهکار اسناد پرداختنی (30201) / بستانکار بانک (10102)
      passVoucher = {
        id: `vch-chq-pay-pass-${Date.now()}`,
        voucherNumber: nextVoucherNo,
        date: opDate,
        gregorianDate: new Date().toISOString().split('T')[0],
        description: `پاس شدن چک شماره ${chq.chequeNumber} در وجه ${chq.contactName} از حساب ${bankTitle}`,
        items: [
          {
            id: `vi-paypass-deb-${Date.now()}`,
            accountCode: '30201',
            accountTitle: 'اسناد پرداختنی تجاری (چک‌های صادره)',
            tafsiliTitle: chq.bankAccountTitle || bankTitle,
            description: `پاس شدن چک صادره شماره ${chq.chequeNumber}`,
            debit: chq.amount,
            credit: 0,
          },
          {
            id: `vi-paypass-crd-${Date.now()}`,
            accountCode: '10102',
            accountTitle: 'حساب‌های بانکی ریالی',
            tafsiliId: bankAccountId,
            tafsiliTitle: bankTitle,
            description: `برداشت از ${bankTitle} بابت پاس شدن چک شماره ${chq.chequeNumber}`,
            debit: chq.amount > 0 ? 0 : 0,
            credit: chq.amount,
          },
        ],
        type: 'cheque_pass',
        status: 'permanent',
        isAutoGenerated: true,
        sourceType: 'cheque',
        sourceId: chq.id,
        createdAt: getCurrentShamsiDate(),
      };
    }

    if (passVoucher) {
      setVouchers((prev) => [passVoucher!, ...prev]);
    }

    setCheques((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'passed',
              passedDate: opDate,
              passedBankId: bankAccountId,
              passedBankTitle: bankTitle,
              passedVoucherId: passVoucher?.id,
            }
          : c
      )
    );

    return true;
  };

  const bounceCheque = (id: string, bounceDate?: string, reason?: string): boolean => {
    const chq = cheques.find((c) => c.id === id);
    if (!chq) return false;

    const opDate = bounceDate || getCurrentShamsiDate();
    const maxVoucherNumber = vouchers.length > 0 ? Math.max(...vouchers.map((v) => v.voucherNumber)) : 100;
    const nextVoucherNo = maxVoucherNumber + 1;

    let bounceVoucher: JournalVoucher | null = null;

    if (chq.type === 'receive') {
      // برگشت چک دریافتی: بدهکار حساب‌های دریافتنی (10301) / بستانکار اسناد دریافتنی (10201)
      bounceVoucher = {
        id: `vch-chq-bounce-${Date.now()}`,
        voucherNumber: nextVoucherNo,
        date: opDate,
        gregorianDate: new Date().toISOString().split('T')[0],
        description: `برگشت/واخواست چک شماره ${chq.chequeNumber} طرف‌حساب ${chq.contactName}${reason ? ' (علت: ' + reason + ')' : ''}`,
        items: [
          {
            id: `vi-bnc-deb-${Date.now()}`,
            accountCode: '10301',
            accountTitle: 'حساب‌های دریافتنی تجاری (مشتریان)',
            tafsiliId: chq.contactId,
            tafsiliTitle: chq.contactName,
            contactId: chq.contactId,
            description: `احیای بدهی مشتری بابت برگشت چک شماره ${chq.chequeNumber}`,
            debit: chq.amount,
            credit: 0,
          },
          {
            id: `vi-bnc-crd-${Date.now()}`,
            accountCode: '10201',
            accountTitle: 'اسناد دریافتنی تجاری (چک‌های نزد صندوق)',
            tafsiliTitle: `چک ${chq.bankName} - ${chq.chequeNumber}`,
            description: `خروج چک برگشتی شماره ${chq.chequeNumber} از اسناد در جریان وصول`,
            debit: 0,
            credit: chq.amount,
          },
        ],
        type: 'cheque_bounce',
        status: 'permanent',
        isAutoGenerated: true,
        sourceType: 'cheque',
        sourceId: chq.id,
        createdAt: getCurrentShamsiDate(),
      };
    } else {
      // برگشت چک پرداختی: بدهکار اسناد پرداختنی (30201) / بستانکار حساب‌های پرداختنی (30101)
      bounceVoucher = {
        id: `vch-chq-pay-bounce-${Date.now()}`,
        voucherNumber: nextVoucherNo,
        date: opDate,
        gregorianDate: new Date().toISOString().split('T')[0],
        description: `برگشت چک پرداختی شماره ${chq.chequeNumber} در وجه ${chq.contactName}${reason ? ' (علت: ' + reason + ')' : ''}`,
        items: [
          {
            id: `vi-pbnc-deb-${Date.now()}`,
            accountCode: '30201',
            accountTitle: 'اسناد پرداختنی تجاری (چک‌های صادره)',
            tafsiliTitle: chq.bankAccountTitle || `چک ${chq.bankName}`,
            description: `خروج چک پرداختی برگشتی شماره ${chq.chequeNumber}`,
            debit: chq.amount,
            credit: 0,
          },
          {
            id: `vi-pbnc-crd-${Date.now()}`,
            accountCode: '30101',
            accountTitle: 'حساب‌های پرداختنی تجاری (تامین‌کنندگان)',
            tafsiliId: chq.contactId,
            tafsiliTitle: chq.contactName,
            contactId: chq.contactId,
            description: `احیای بدهی به تامین‌کننده بابت برگشت چک شماره ${chq.chequeNumber}`,
            debit: 0,
            credit: chq.amount,
          },
        ],
        type: 'cheque_bounce',
        status: 'permanent',
        isAutoGenerated: true,
        sourceType: 'cheque',
        sourceId: chq.id,
        createdAt: getCurrentShamsiDate(),
      };
    }

    if (bounceVoucher) {
      setVouchers((prev) => [bounceVoucher!, ...prev]);
    }

    setCheques((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'bounced',
              notes: `${c.notes ? c.notes + ' | ' : ''}برگشت خورده در تاریخ ${opDate}${reason ? ': ' + reason : ''}`,
              bouncedVoucherId: bounceVoucher?.id,
            }
          : c
      )
    );

    return true;
  };

  const returnCheque = (id: string, returnDate?: string): boolean => {
    const chq = cheques.find((c) => c.id === id);
    if (!chq) return false;

    const opDate = returnDate || getCurrentShamsiDate();

    // If standalone cheque voucher existed (not an invoice voucher), remove it; if from invoice, issue reversal
    if (chq.voucherId && !chq.invoiceId && !chq.id.startsWith('chq-inv-')) {
      setVouchers((prev) => prev.filter((v) => v.id !== chq.voucherId));
    } else if (chq.invoiceId || chq.id.startsWith('chq-inv-')) {
      const maxVoucherNumber = vouchers.length > 0 ? Math.max(...vouchers.map((v) => v.voucherNumber)) : 100;
      const nextVoucherNo = maxVoucherNumber + 1;
      const revVch: JournalVoucher = {
        id: `vch-chq-ret-${Date.now()}`,
        voucherNumber: nextVoucherNo,
        date: opDate,
        gregorianDate: new Date().toISOString().split('T')[0],
        description: `استرداد چک شماره ${chq.chequeNumber} طرف‌حساب ${chq.contactName}`,
        items:
          chq.type === 'receive'
            ? [
                {
                  id: `vi-ret-deb-${Date.now()}`,
                  accountCode: '10301',
                  accountTitle: 'مشتریان تجاری داخلی',
                  tafsiliId: chq.contactId,
                  contactId: chq.contactId,
                  tafsiliTitle: chq.contactName,
                  description: `بدهکار شدن مشتری بابت استرداد چک شماره ${chq.chequeNumber}`,
                  debit: chq.amount,
                  credit: 0,
                },
                {
                  id: `vi-ret-crd-${Date.now()}`,
                  accountCode: '10201',
                  accountTitle: 'چک‌های دریافتی نزد صندوق',
                  tafsiliTitle: `چک ${chq.bankName} - ${chq.chequeNumber}`,
                  description: `استرداد لاشه چک شماره ${chq.chequeNumber}`,
                  debit: 0,
                  credit: chq.amount,
                },
              ]
            : [
                {
                  id: `vi-ret-deb-${Date.now()}`,
                  accountCode: '30201',
                  accountTitle: 'چک‌های پرداختنی عهده بانک‌ها',
                  tafsiliTitle: `چک ${chq.bankName} - ${chq.chequeNumber}`,
                  description: `دریافت لاشه چک استردادی شماره ${chq.chequeNumber}`,
                  debit: chq.amount,
                  credit: 0,
                },
                {
                  id: `vi-ret-crd-${Date.now()}`,
                  accountCode: '30101',
                  accountTitle: 'تامین‌کنندگان کالا و خدمات',
                  tafsiliId: chq.contactId,
                  contactId: chq.contactId,
                  tafsiliTitle: chq.contactName,
                  description: `بستانکار شدن تامین‌کننده بابت استرداد چک ${chq.chequeNumber}`,
                  debit: 0,
                  credit: chq.amount,
                },
              ],
        type: 'cheque_bounce',
        status: 'permanent',
        isAutoGenerated: true,
        sourceType: 'cheque',
        sourceId: chq.id,
        createdAt: getCurrentShamsiDate(),
      };
      setVouchers((prev) => [revVch, ...prev]);
    }

    setCheques((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'returned',
              notes: `${c.notes ? c.notes + ' | ' : ''}استرداد شده در تاریخ ${opDate}`,
            }
          : c
      )
    );

    return true;
  };

  // 11. Ready Financial Transactions (Receipt, Payment, Transfer)
  const addFinancialTransaction = (
    txData: Omit<FinancialTransaction, 'id' | 'transactionNumber' | 'createdAt'> & { transactionNumber?: number }
  ): FinancialTransaction => {
    const maxTxNumber = financialTransactions.length > 0 ? Math.max(...financialTransactions.map((t) => t.transactionNumber)) : 1000;
    const newTxNumber = txData.transactionNumber || maxTxNumber + 1;
    const txId = `ftx-${Date.now()}`;

    const createdTx: FinancialTransaction = {
      ...txData,
      id: txId,
      transactionNumber: newTxNumber,
      createdAt: getCurrentShamsiDate(),
    };

    // Auto generate voucher for ready financial transaction
    if (settings.autoGenerateVouchers) {
      const maxVoucherNumber = vouchers.length > 0 ? Math.max(...vouchers.map((v) => v.voucherNumber)) : 100;
      const nextVoucherNo = maxVoucherNumber + 1;

      if (createdTx.type === 'receipt') {
        // دریافت وجه: بدهکار صندوق/بانک مقصد | بستانکار طرف‌حساب/مشتری
        const destAccountCode = createdTx.paymentMethod === 'cash' ? '10101' : createdTx.paymentMethod === 'pos' ? '10104' : '10102';
        const destAccountTitle = createdTx.paymentMethod === 'cash' ? 'صندوق‌ها' : createdTx.paymentMethod === 'pos' ? 'دستگاه‌های کارتخوان (POS)' : 'حساب‌های بانکی ریالی';

        const autoVch: JournalVoucher = {
          id: `vch-tx-rec-${Date.now()}`,
          voucherNumber: nextVoucherNo,
          date: createdTx.date || getCurrentShamsiDate(),
          gregorianDate: new Date().toISOString().split('T')[0],
          description: `دریافت وجه (شماره ${createdTx.transactionNumber}) - ${createdTx.title}: ${createdTx.description}`,
          items: [
            {
              id: `vi-tx-rec-deb-${Date.now()}`,
              accountCode: destAccountCode,
              accountTitle: destAccountTitle,
              tafsiliId: createdTx.destinationAccountId,
              tafsiliTitle: createdTx.destinationAccountTitle || 'حساب دریافت',
              description: `واریز وجه از ${createdTx.contactName || 'مشتری'}${createdTx.trackingNumber ? ' (پیگیری: ' + createdTx.trackingNumber + ')' : ''}`,
              debit: createdTx.amount,
              credit: 0,
            },
            {
              id: `vi-tx-rec-crd-${Date.now()}`,
              accountCode: '10301',
              accountTitle: 'حساب‌های دریافتنی تجاری (مشتریان)',
              tafsiliId: createdTx.contactId,
              tafsiliTitle: createdTx.contactName || 'طرف‌حساب',
              contactId: createdTx.contactId,
              description: createdTx.description || `تسویه حساب بابت دریافت وجه`,
              debit: 0,
              credit: createdTx.amount,
            },
          ],
          type: 'receipt',
          status: 'permanent',
          isAutoGenerated: true,
          sourceType: 'receipt',
          sourceId: txId,
          createdAt: getCurrentShamsiDate(),
        };

        createdTx.voucherId = autoVch.id;
        setVouchers((prev) => [autoVch, ...prev]);
      } else if (createdTx.type === 'payment') {
        // پرداخت وجه: بدهکار طرف‌حساب/تامین‌کننده | بستانکار بانک/صندوق مبدا
        const srcAccountCode = createdTx.paymentMethod === 'cash' ? '10101' : '10102';
        const srcAccountTitle = createdTx.paymentMethod === 'cash' ? 'صندوق‌ها' : 'حساب‌های بانکی ریالی';

        const autoVch: JournalVoucher = {
          id: `vch-tx-pay-${Date.now()}`,
          voucherNumber: nextVoucherNo,
          date: createdTx.date || getCurrentShamsiDate(),
          gregorianDate: new Date().toISOString().split('T')[0],
          description: `پرداخت وجه (شماره ${createdTx.transactionNumber}) - ${createdTx.title}: ${createdTx.description}`,
          items: [
            {
              id: `vi-tx-pay-deb-${Date.now()}`,
              accountCode: '30101',
              accountTitle: 'حساب‌های پرداختنی تجاری (تامین‌کنندگان)',
              tafsiliId: createdTx.contactId,
              tafsiliTitle: createdTx.contactName || 'طرف‌حساب',
              contactId: createdTx.contactId,
              description: createdTx.description || `پرداخت به طرف‌حساب`,
              debit: createdTx.amount,
              credit: 0,
            },
            {
              id: `vi-tx-pay-crd-${Date.now()}`,
              accountCode: srcAccountCode,
              accountTitle: srcAccountTitle,
              tafsiliId: createdTx.sourceAccountId,
              tafsiliTitle: createdTx.sourceAccountTitle || 'حساب پرداخت',
              description: `پرداخت به ${createdTx.contactName || 'طرف‌حساب'}${createdTx.trackingNumber ? ' (پیگیری: ' + createdTx.trackingNumber + ')' : ''}`,
              debit: 0,
              credit: createdTx.amount,
            },
          ],
          type: 'payment',
          status: 'permanent',
          isAutoGenerated: true,
          sourceType: 'payment',
          sourceId: txId,
          createdAt: getCurrentShamsiDate(),
        };

        createdTx.voucherId = autoVch.id;
        setVouchers((prev) => [autoVch, ...prev]);
      } else if (createdTx.type === 'transfer') {
        // انتقال داخلی: بدهکار حساب مقصد | بستانکار حساب مبدا
        const autoVch: JournalVoucher = {
          id: `vch-tx-trf-${Date.now()}`,
          voucherNumber: nextVoucherNo,
          date: createdTx.date || getCurrentShamsiDate(),
          gregorianDate: new Date().toISOString().split('T')[0],
          description: `انتقال داخلی وجه: از ${createdTx.sourceAccountTitle} به ${createdTx.destinationAccountTitle}`,
          items: [
            {
              id: `vi-tx-trf-deb-${Date.now()}`,
              accountCode: '10102',
              accountTitle: 'حساب‌های بانکی و صندوق',
              tafsiliId: createdTx.destinationAccountId,
              tafsiliTitle: createdTx.destinationAccountTitle || 'حساب مقصد',
              description: `واریز انتقالی از ${createdTx.sourceAccountTitle}${createdTx.trackingNumber ? ' (پیگیری: ' + createdTx.trackingNumber + ')' : ''}`,
              debit: createdTx.amount,
              credit: 0,
            },
            {
              id: `vi-tx-trf-crd-${Date.now()}`,
              accountCode: '10102',
              accountTitle: 'حساب‌های بانکی و صندوق',
              tafsiliId: createdTx.sourceAccountId,
              tafsiliTitle: createdTx.sourceAccountTitle || 'حساب مبدا',
              description: `برداشت بابت انتقال به ${createdTx.destinationAccountTitle}`,
              debit: 0,
              credit: createdTx.amount,
            },
          ],
          type: 'transfer',
          status: 'permanent',
          isAutoGenerated: true,
          sourceType: 'transfer',
          sourceId: txId,
          createdAt: getCurrentShamsiDate(),
        };

        createdTx.voucherId = autoVch.id;
        setVouchers((prev) => [autoVch, ...prev]);
      }
    }

    setFinancialTransactions((prev) => [createdTx, ...prev]);
    return createdTx;
  };

  const deleteFinancialTransaction = (id: string) => {
    const tx = financialTransactions.find((t) => t.id === id);
    if (!tx) return false;
    if (tx.voucherId) {
      setVouchers((prev) => prev.filter((v) => v.id !== tx.voucherId));
    }
    setFinancialTransactions((prev) => prev.filter((t) => t.id !== id));
    return true;
  };

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
      financialYears,
      cheques,
      financialTransactions,
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

  // Dispatch backup to bots (Telegram / Bale)
  const triggerBotBackupNow = async (): Promise<BotSendResult[]> => {
    const config = settings.botBackup;
    if (!config) return [];

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
      cheques,
      financialTransactions,
      exportDate: new Date().toISOString(),
      shamsiDate: getCurrentShamsiDate(),
      version: '1.0.0',
    };

    const payload = JSON.stringify(data, null, 2);
    const results = await dispatchBackupToAllAdmins(
      {
        enabled: config.enabled,
        intervalHours: config.intervalHours || 6,
        telegramEnabled: config.telegramEnabled,
        telegramBotToken: config.telegramBotToken,
        telegramAdminChatIds: config.telegramAdminChatIds,
        baleEnabled: config.baleEnabled,
        baleBotToken: config.baleBotToken,
        baleAdminChatIds: config.baleAdminChatIds,
      },
      payload,
      settings.companyName || 'حسابداری مه'
    );

    // Update lastSentTimestamp in settings
    setSettings((prev) => ({
      ...prev,
      botBackup: {
        ...(prev.botBackup || config),
        lastSentTimestamp: Date.now(),
      },
    }));

    return results;
  };

  // Hourly check for auto bot backup dispatch
  useEffect(() => {
    if (!settings.botBackup?.enabled) return;

    const checkAndSend = async () => {
      const botCfg = settings.botBackup;
      if (!botCfg || !botCfg.enabled) return;

      const intervalMs = (botCfg.intervalHours || 6) * 60 * 60 * 1000;
      const lastSent = botCfg.lastSentTimestamp || 0;
      const now = Date.now();

      if (now - lastSent >= intervalMs) {
        await triggerBotBackupNow();
      }
    };

    // Check on startup after 10s, then every 5 minutes
    const initialTimer = setTimeout(checkAndSend, 10000);
    const intervalTimer = setInterval(checkAndSend, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [settings.botBackup]);

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
          financialYears,
          cheques,
          financialTransactions,
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

  const createNewFinancialYear = (year: string, title?: string, startDate?: string, endDate?: string): FinancialYearInfo => {
    const existing = financialYears.find((y) => y.year === year);
    if (existing) {
      if (!settings.financialYear) {
        setSettings((prev) => ({ ...prev, financialYear: year }));
      }
      return existing;
    }

    const newYearInfo: FinancialYearInfo = {
      year,
      title: title || `سال مالی ${year}`,
      startDate: startDate || `${year}/01/01`,
      endDate: endDate || `${year}/12/29`,
      isClosed: false,
      notes: `سال مالی ایجاد شده در سامانه`,
    };

    setFinancialYears((prev) => [newYearInfo, ...prev]);
    if (!settings.financialYear) {
      setSettings((prev) => ({ ...prev, financialYear: year }));
    }
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

  const runSampleAccountingScenario = async () => {
    createBackupSnapshot('پیش از اجرای چرخه کامل نمونه حسابداری');

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
    setCheques(defaultCheques);
    setFinancialTransactions(defaultFinancialTransactions);

    try {
      const payload = {
        settings: defaultCompanySettings,
        accounts: defaultChartOfAccounts,
        contacts: defaultContacts,
        bankAccounts: defaultBankAccounts,
        categories: defaultProductCategories,
        products: defaultProducts,
        invoices: defaultInvoices,
        vouchers: defaultJournalVouchers,
        expenses: defaultExpenses,
        financialYears: defaultFinancialYears,
        cheques: defaultCheques,
        financialTransactions: defaultFinancialTransactions,
        backups: autoBackupSnapshots,
        senderClientId: clientIdRef.current,
      };
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientIdRef.current,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const resData = await res.json();
        serverVersionRef.current = resData.version;
        setServerSyncStatus('synced');
        setLastServerSyncTime(new Date().toLocaleTimeString('fa-IR'));
      }
    } catch (err) {
      console.error('Failed to sync sample scenario on server:', err);
    }
  };

  const clearAllDataToZero = async () => {
    createBackupSnapshot('پیش از صفر کردن دیتابیس (شروع از صفر)');

    setChartOfAccounts(defaultChartOfAccounts);
    setContacts([]);
    setBankAccounts([]);
    setProductCategories([]);
    setProducts([]);
    setInvoices([]);
    setVouchers([]);
    setExpenses([]);
    setFinancialYears(defaultFinancialYears);
    setCheques([]);
    setFinancialTransactions([]);

    try {
      await fetch('/api/reset', { method: 'POST' });
      setServerSyncStatus('synced');
      setLastServerSyncTime(new Date().toLocaleTimeString('fa-IR'));
    } catch (err) {
      console.error('Failed to reset on server:', err);
    }
  };

  const resetToDefaultData = async () => {
    await runSampleAccountingScenario();
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
      cheques,
      financialTransactions,
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
      const accountsList = parsed.chartOfAccounts || parsed.accounts;
      const categoriesList = parsed.productCategories || parsed.categories;
      if (parsed && typeof parsed === 'object' && (accountsList || parsed.invoices || parsed.contacts)) {
        if (parsed.settings) setSettings(parsed.settings);
        if (Array.isArray(accountsList) && accountsList.length > 0) setChartOfAccounts(accountsList);
        if (Array.isArray(parsed.contacts)) setContacts(parsed.contacts);
        if (Array.isArray(parsed.bankAccounts)) setBankAccounts(parsed.bankAccounts);
        if (Array.isArray(categoriesList)) setProductCategories(categoriesList);
        if (Array.isArray(parsed.products)) setProducts(parsed.products);
        if (Array.isArray(parsed.invoices)) setInvoices(parsed.invoices);
        if (Array.isArray(parsed.vouchers)) setVouchers(parsed.vouchers);
        if (Array.isArray(parsed.expenses)) setExpenses(parsed.expenses);
        if (Array.isArray(parsed.financialYears)) setFinancialYears(parsed.financialYears);
        if (Array.isArray(parsed.cheques)) setCheques(parsed.cheques);
        if (Array.isArray(parsed.financialTransactions)) setFinancialTransactions(parsed.financialTransactions);
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
        performStocktaking,
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
        cheques,
        addCheque,
        updateCheque,
        deleteCheque,
        passCheque,
        bounceCheque,
        returnCheque,
        financialTransactions,
        addFinancialTransaction,
        deleteFinancialTransaction,
        financialYears,
        createNewFinancialYear,
        closeFinancialYear,
        switchFinancialYear,
        recordPartnerTransaction,
        resetToDefaultData,
        runSampleAccountingScenario,
        clearAllDataToZero,
        exportDatabaseJSON,
        importDatabaseJSON,
        autoBackupSnapshots,
        createBackupSnapshot,
        restoreSnapshot,
        deleteSnapshot,
        clearAllSnapshots,
        exportSnapshotJSON,
        lastBackupTime,
        triggerBotBackupNow,
        serverSyncStatus,
        lastServerSyncTime,
        syncWithServer,
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
