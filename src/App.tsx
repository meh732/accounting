import React, { useState } from 'react';
import { AccountingProvider, useAccounting } from './context/AccountingContext';
import { Header } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { DashboardView } from './components/dashboard/DashboardView';
import { InvoicesView } from './components/invoices/InvoicesView';
import { JournalVouchersView } from './components/vouchers/JournalVouchersView';
import { ChartOfAccountsView } from './components/accounts/ChartOfAccountsView';
import { ContactsView } from './components/contacts/ContactsView';
import { BankAndCashView } from './components/bank/BankAndCashView';
import { ProductsInventoryView } from './components/products/ProductsInventoryView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { FinancialReportsView } from './components/reports/FinancialReportsView';
import { SettingsView } from './components/settings/SettingsView';

import { InvoiceModal } from './components/invoices/InvoiceModal';
import { VoucherModal } from './components/vouchers/VoucherModal';
import { ExpenseModal } from './components/expenses/ExpenseModal';
import { BackupManagerModal } from './components/backup/BackupManagerModal';

import {
  LayoutDashboard,
  Receipt,
  FileSpreadsheet,
  Users,
  Package,
  Menu,
  Plus
} from 'lucide-react';

const AccountingApp: React.FC = () => {
  const { invoices, vouchers, contacts, products } = useAccounting();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Quick action modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  return (
    <div dir="rtl" className="flex flex-col h-[100dvh] w-full min-h-[100dvh] bg-slate-100 font-sans text-slate-800 overflow-hidden select-none antialiased">
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        onOpenQuickInvoice={() => setIsInvoiceModalOpen(true)}
        onOpenQuickVoucher={() => setIsVoucherModalOpen(true)}
        onOpenQuickContact={() => setActiveTab('contacts')}
        onOpenQuickExpense={() => setIsExpenseModalOpen(true)}
        onOpenBackupManager={() => setIsBackupModalOpen(true)}
        onToggleMobileMenu={() => setIsMobileDrawerOpen(true)}
        onSearchChange={setSearchQuery}
      />

      {/* Main Center Area: Sidebar + Scrollable Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Right Sidebar (in RTL) with Mobile Drawer Support */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          invoicesCount={invoices.length}
          vouchersCount={vouchers.length}
          contactsCount={contacts.length}
          productsCount={products.length}
          isOpenMobile={isMobileDrawerOpen}
          onCloseMobile={() => setIsMobileDrawerOpen(false)}
        />

        {/* Content View Container */}
        <main className="flex-1 overflow-y-auto p-2.5 sm:p-4 md:p-5 bg-slate-50/80 pb-16 lg:pb-5">
          <div className="w-full max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                onNavigate={setActiveTab}
                onOpenInvoiceModal={() => setIsInvoiceModalOpen(true)}
                onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
                onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
              />
            )}

            {activeTab === 'invoices' && <InvoicesView />}
            {activeTab === 'vouchers' && <JournalVouchersView />}
            {activeTab === 'accounts' && <ChartOfAccountsView />}
            {activeTab === 'contacts' && <ContactsView />}
            {activeTab === 'banks' && <BankAndCashView />}
            {activeTab === 'products' && <ProductsInventoryView />}
            {activeTab === 'expenses' && <ExpensesView />}
            {activeTab === 'reports' && <FinancialReportsView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Shown only on small screens for fast thumb navigation) */}
      <nav className="lg:hidden no-print fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 flex items-center justify-around py-1.5 px-2 shadow-lg">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center p-1 text-[10px] font-bold ${
            activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>داشبورد</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex flex-col items-center justify-center p-1 text-[10px] font-bold relative ${
            activeTab === 'invoices' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <Receipt className="w-5 h-5 mb-0.5" />
          <span>فاکتورها</span>
          {invoices.length > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-indigo-600"></span>
          )}
        </button>

        {/* Quick Central Invoice Creation Button */}
        <button
          onClick={() => setIsInvoiceModalOpen(true)}
          className="flex flex-col items-center justify-center -mt-5 bg-indigo-600 text-white rounded-full w-12 h-12 shadow-lg shadow-indigo-600/40 transform active:scale-95 transition"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex flex-col items-center justify-center p-1 text-[10px] font-bold ${
            activeTab === 'contacts' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>طرف‌حساب</span>
        </button>

        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center p-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>منو بیشتر</span>
        </button>
      </nav>

      {/* Bottom Desktop Status Bar */}
      <div className="hidden lg:block">
        <StatusBar onOpenBackupManager={() => setIsBackupModalOpen(true)} />
      </div>

      {/* Modals triggered from quick action header or dashboard */}
      {isInvoiceModalOpen && (
        <InvoiceModal
          initialType="sales"
          onClose={() => setIsInvoiceModalOpen(false)}
        />
      )}

      {isVoucherModalOpen && (
        <VoucherModal
          onClose={() => setIsVoucherModalOpen(false)}
        />
      )}

      {isExpenseModalOpen && (
        <ExpenseModal
          onClose={() => setIsExpenseModalOpen(false)}
        />
      )}

      {isBackupModalOpen && (
        <BackupManagerModal
          onClose={() => setIsBackupModalOpen(false)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AccountingProvider>
      <AccountingApp />
    </AccountingProvider>
  );
}
