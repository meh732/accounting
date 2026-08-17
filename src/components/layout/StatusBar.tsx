import React from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { calculateTrialBalance, calculateProfitAndLoss } from '../../utils/financialCalculations';
import { formatCurrency } from '../../utils/dateUtils';
import { CheckCircle2, AlertCircle, ShieldCheck, Database, HardDrive } from 'lucide-react';

interface StatusBarProps {
  onOpenBackupManager?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ onOpenBackupManager }) => {
  const { chartOfAccounts, vouchers, invoices, expenses, products, settings, autoBackupSnapshots, lastBackupTime } = useAccounting();

  const trial = calculateTrialBalance(chartOfAccounts, vouchers);
  const pnl = calculateProfitAndLoss(invoices, expenses, products);

  return (
    <footer className="no-print bg-slate-900 border-t border-slate-800 text-slate-300 px-3 sm:px-4 py-1 text-xs flex items-center justify-between z-20 shrink-0 select-none">
      {/* Left status items */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* System Balance status */}
        <div className="flex items-center gap-1.5">
          {trial.isBalanced ? (
            <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>دفاتر تراز است</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-rose-400 font-bold text-[11px]">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>اختلاف تراز دفاتر!</span>
            </div>
          )}
        </div>

        <div className="h-3 w-px bg-slate-700"></div>

        {/* Total Debit vs Credit */}
        <div className="hidden md:flex items-center gap-1.5 text-slate-400 text-[11px]">
          <span>گردش دفاتر:</span>
          <span className="font-mono font-bold text-slate-200">
            {formatCurrency(trial.totalTurnoverDebit, settings.currency)}
          </span>
        </div>

        <div className="h-3 w-px bg-slate-700 hidden md:block"></div>

        {/* Net Profit Status */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-slate-400 hidden sm:inline">سود خالص:</span>
          <span
            className={`font-bold font-mono ${
              pnl.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(pnl.netProfit, settings.currency)}
          </span>
        </div>
      </div>

      {/* Right status items */}
      <div className="flex items-center gap-2 sm:gap-3 text-slate-400 text-[10px] sm:text-[11px]">
        {onOpenBackupManager ? (
          <button
            onClick={onOpenBackupManager}
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 px-2 py-0.5 rounded transition font-bold"
            title="کلیک برای باز کردن مرکز پشتیبان‌گیری و بازیابی"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>بکاپ خودکار خروج فعال است</span>
            <span className="font-mono text-slate-400 text-[10px]">({autoBackupSnapshots.length} نسخه)</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>بکاپ خودکار فعال</span>
          </div>
        )}

        <div className="h-3 w-px bg-slate-700"></div>

        <div className="flex items-center gap-1">
          <Database className="w-3 h-3 text-indigo-400" />
          <span className="font-mono">اسناد: {vouchers.length}</span>
        </div>
      </div>
    </footer>
  );
};

