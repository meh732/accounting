import React, { useState, useEffect } from 'react';
import { JournalVoucher, VoucherItem, VoucherStatus } from '../../types/accounting';
import { useAccounting } from '../../context/AccountingContext';
import { getCurrentShamsiDate, formatCurrency, numberToWordsPersian } from '../../utils/dateUtils';
import { X, Plus, Trash2, FileSpreadsheet, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { SearchableAccountSelect } from '../common/SearchableAccountSelect';

interface VoucherModalProps {
  voucherToEdit?: JournalVoucher | null;
  onClose: () => void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({ voucherToEdit, onClose }) => {
  const { chartOfAccounts, vouchers, addVoucher, updateVoucher, settings } = useAccounting();

  const [voucherNumber, setVoucherNumber] = useState<number>(() => {
    if (voucherToEdit) return voucherToEdit.voucherNumber;
    const max = vouchers.length > 0 ? Math.max(...vouchers.map((v) => v.voucherNumber)) : 100;
    return max + 1;
  });
  const [date, setDate] = useState<string>(voucherToEdit?.date || getCurrentShamsiDate());
  const [description, setDescription] = useState<string>(voucherToEdit?.description || '');
  const [status, setStatus] = useState<VoucherStatus>(voucherToEdit?.status || 'permanent');

  // Line items
  const [items, setItems] = useState<VoucherItem[]>(() => {
    if (voucherToEdit && voucherToEdit.items.length > 0) {
      return voucherToEdit.items;
    }
    return [
      {
        id: `vi-${Date.now()}-1`,
        accountCode: '10101',
        accountTitle: 'صندوق‌ها',
        tafsiliTitle: '',
        description: '',
        debit: 0,
        credit: 0,
      },
      {
        id: `vi-${Date.now()}-2`,
        accountCode: '50101',
        accountTitle: 'فروش کالای بازرگانی',
        tafsiliTitle: '',
        description: '',
        debit: 0,
        credit: 0,
      },
    ];
  });

  // Helpers for keyboard navigation
  const focusElement = (id: string) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.focus();
        if (el instanceof HTMLInputElement) {
          el.select();
        }
      }
    }, 40);
  };

  // Auto focus first input on mount
  useEffect(() => {
    focusElement(voucherToEdit ? 'voucher-row-0-account' : 'voucher-header-number');
  }, []);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const addItemRow = () => {
    const currentTotalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
    const currentTotalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);
    const remainingDiff = Math.abs(currentTotalDebit - currentTotalCredit);
    const suggestedDebit = currentTotalCredit > currentTotalDebit ? remainingDiff : 0;
    const suggestedCredit = currentTotalDebit > currentTotalCredit ? remainingDiff : 0;

    const newIdx = items.length;
    setItems((prev) => [
      ...prev,
      {
        id: `vi-${Date.now()}-${prev.length + 1}`,
        accountCode: '',
        accountTitle: '',
        tafsiliTitle: '',
        description: prev[prev.length - 1]?.description || description || '',
        debit: suggestedDebit,
        credit: suggestedCredit,
      },
    ]);

    focusElement(`voucher-row-${newIdx}-account`);
  };

  const handleRowCompletion = (idx: number) => {
    if (idx === items.length - 1) {
      // It is the last row: automatically add a new row and focus its account input!
      const currentTotalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
      const currentTotalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);
      const remainingDiff = Math.abs(currentTotalDebit - currentTotalCredit);
      const suggestedDebit = currentTotalCredit > currentTotalDebit ? remainingDiff : 0;
      const suggestedCredit = currentTotalDebit > currentTotalCredit ? remainingDiff : 0;

      const nextIdx = items.length;
      setItems((prev) => [
        ...prev,
        {
          id: `vi-${Date.now()}-${prev.length + 1}`,
          accountCode: '',
          accountTitle: '',
          tafsiliTitle: '',
          description: prev[idx]?.description || description || '',
          debit: suggestedDebit,
          credit: suggestedCredit,
        },
      ]);

      focusElement(`voucher-row-${nextIdx}-account`);
    } else {
      // Move to next row's account selector
      focusElement(`voucher-row-${idx + 1}-account`);
    }
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 2) {
      alert('حداقل ۲ سطر برای ثبت سند حسابداری دوبل الزامی است.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateItemField = (index: number, field: keyof VoucherItem, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: val };

      if (field === 'accountCode') {
        const acc = chartOfAccounts.find((a) => a.code === val);
        if (acc) {
          row.accountTitle = acc.title;
        }
      }

      next[index] = row;
      return next;
    });
  };

  const handleAccountSelect = (index: number, code: string, title: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        accountCode: code,
        accountTitle: title,
      };
      return next;
    });
  };

  const totalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
  const totalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference === 0 && totalDebit > 0;

  // Auto-balance voucher by filling or creating a matching row
  const handleAutoBalanceVoucher = () => {
    if (difference === 0) return;

    const fillDebit = totalCredit > totalDebit ? difference : 0;
    const fillCredit = totalDebit > totalCredit ? difference : 0;

    const lastIdx = items.length - 1;
    if (items[lastIdx] && items[lastIdx].debit === 0 && items[lastIdx].credit === 0) {
      setItems((prev) =>
        prev.map((item, idx) => {
          if (idx === lastIdx) {
            return {
              ...item,
              debit: fillDebit,
              credit: fillCredit,
            };
          }
          return item;
        })
      );
      setTimeout(() => {
        focusElement(`voucher-row-${lastIdx}-account`);
      }, 50);
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `vi-${Date.now()}-${prev.length + 1}`,
          accountCode: '',
          accountTitle: '',
          tafsiliTitle: '',
          description: prev[lastIdx]?.description || description || 'تراز سند حسابداری',
          debit: fillDebit,
          credit: fillCredit,
        },
      ]);
      setTimeout(() => {
        focusElement(`voucher-row-${items.length}-account`);
      }, 50);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanedItems = items.filter((i) => (i.debit > 0 || i.credit > 0) && i.accountTitle);

    if (cleanedItems.length < 2) {
      alert('حداقل ۲ آرتیکل معتبر دارای سرفصل حساب و مبلغ برای سند دوبل الزامی است.');
      return;
    }

    if (!isBalanced) {
      alert(
        `خطای عدم تراز سند: جمع بدهکار (${formatCurrency(totalDebit, settings.currency)}) و بستانکار (${formatCurrency(totalCredit, settings.currency)}) با یکدیگر برابر نیستند و دارای اختلاف ${formatCurrency(difference, settings.currency)} می‌باشد.\n\nطبق اصول حسابداری دوبل، ثبت سند نامتراز مجاز نیست. لطفاً از دکمه «تراز خودکار سند» برای رفع اختلاف استفاده فرمایید.`
      );
      return;
    }

    if (voucherToEdit) {
      updateVoucher(voucherToEdit.id, {
        voucherNumber,
        date,
        description: description || 'سند حسابداری دستی',
        items: cleanedItems,
        status: status,
      });
    } else {
      addVoucher({
        voucherNumber,
        date,
        gregorianDate: new Date().toISOString().split('T')[0],
        description: description || 'سند حسابداری دستی',
        items: cleanedItems,
        status: status,
        isAutoGenerated: false,
        sourceType: 'manual',
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {voucherToEdit ? `ویرایش سند حسابداری شماره ${voucherToEdit.voucherNumber}` : 'ثبت سند دوبل حسابداری دستی - حسابداری مه'}
              </h3>
              <span className="text-[11px] text-slate-500">
                جستجوی آنی و لیست هوشمند سرفصل‌های حسابداری طبق استانداردهای مالی
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSubmit(e as any);
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
              return;
            }
            // Prevent accidental standard form submit on Enter
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
              e.preventDefault();
            }
          }}
          className="flex-1 overflow-y-auto p-5 space-y-4"
        >
          {/* Header row: Number, Date, Status, Description */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">شماره سند</label>
              <input
                type="number"
                id="voucher-header-number"
                value={voucherNumber}
                onFocus={handleInputFocus}
                onChange={(e) => setVoucherNumber(parseInt(e.target.value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    focusElement('voucher-header-date');
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:border-emerald-500 outline-hidden text-left"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تاریخ سند (شمسی)</label>
              <input
                type="text"
                id="voucher-header-date"
                value={date}
                onFocus={handleInputFocus}
                onChange={(e) => setDate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    focusElement('voucher-header-status');
                  }
                }}
                placeholder="1403/05/20"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-emerald-500 outline-hidden text-center"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">وضعیت سند</label>
              <select
                id="voucher-header-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as VoucherStatus)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    focusElement('voucher-header-desc');
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:border-emerald-500 outline-hidden"
              >
                <option value="permanent">ثبت نهایی و قطعی</option>
                <option value="draft">پیش‌نویس (موقت)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">شرح کلی سند</label>
              <input
                type="text"
                id="voucher-header-desc"
                value={description}
                onFocus={handleInputFocus}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    focusElement('voucher-row-0-account');
                  }
                }}
                placeholder="شرح کلی علت صدور سند..."
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:border-emerald-500 outline-hidden"
                required
              />
            </div>
          </div>

          {/* Articles Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-800 text-xs">سطور آرتیکل‌های سند دوبل</h4>
                <span className="text-[11px] text-slate-500">
                  (با زدن Enter در هر فیلد به فیلد بعدی و در انتهای سطر، سطر جدید باز می‌شود)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono hidden sm:inline-block">
                  Enter: سطر بعد / سطر جدید
                </span>
                <button
                  type="button"
                  onClick={addItemRow}
                  id="btn-add-voucher-item"
                  className="flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن سطر جدید</span>
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-visible shadow-xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-2 w-8 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[240px]">سرفصل معین / کل (لیست و جستجو)</th>
                    <th className="py-2.5 px-3 min-w-[140px]">شخص / تفصیلی</th>
                    <th className="py-2.5 px-3 min-w-[180px]">شرح آرتیکل</th>
                    <th className="py-2.5 px-3 w-36 text-left">بدهکار ({settings.currency})</th>
                    <th className="py-2.5 px-3 w-36 text-left">بستانکار ({settings.currency})</th>
                    <th className="py-2.5 px-2 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2 px-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <SearchableAccountSelect
                          id={`voucher-row-${idx}-account`}
                          accounts={chartOfAccounts}
                          selectedCode={row.accountCode}
                          onChange={(code, acc) => handleAccountSelect(idx, code, acc?.title || '')}
                          onEnterNext={() => focusElement(`voucher-row-${idx}-tafsili`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              focusElement(`voucher-row-${idx}-tafsili`);
                            }
                          }}
                          placeholder="جستجو یا انتخاب سرفصل..."
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          id={`voucher-row-${idx}-tafsili`}
                          placeholder="نام شخص یا مرکز هزینه..."
                          value={row.tafsiliTitle || ''}
                          onFocus={handleInputFocus}
                          onChange={(e) => updateItemField(idx, 'tafsiliTitle', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              focusElement(`voucher-row-${idx}-desc`);
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs focus:bg-white outline-hidden focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          id={`voucher-row-${idx}-desc`}
                          placeholder="شرح ردیف سند..."
                          value={row.description}
                          onFocus={handleInputFocus}
                          onChange={(e) => updateItemField(idx, 'description', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              focusElement(`voucher-row-${idx}-debit`);
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs focus:bg-white outline-hidden focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          id={`voucher-row-${idx}-debit`}
                          value={row.debit === 0 ? '' : row.debit}
                          placeholder="0"
                          onFocus={handleInputFocus}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateItemField(idx, 'debit', val);
                            if (val > 0) updateItemField(idx, 'credit', 0);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (row.debit > 0) {
                                // Debit filled, row finished -> create or move to next row
                                handleRowCompletion(idx);
                              } else {
                                // Debit is 0 or empty, move to credit field
                                focusElement(`voucher-row-${idx}-credit`);
                              }
                            }
                          }}
                          className="w-full font-mono font-bold text-left bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs focus:bg-white outline-hidden text-indigo-700 focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          id={`voucher-row-${idx}-credit`}
                          value={row.credit === 0 ? '' : row.credit}
                          placeholder="0"
                          onFocus={handleInputFocus}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateItemField(idx, 'credit', val);
                            if (val > 0) updateItemField(idx, 'debit', 0);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              // Credit entered -> row finished -> create or move to next row
                              handleRowCompletion(idx);
                            }
                          }}
                          className="w-full font-mono font-bold text-left bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs focus:bg-white outline-hidden text-emerald-700 focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-slate-400 hover:text-rose-600 transition"
                          title="حذف آرتیکل"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={4} className="py-2.5 px-3 text-right text-slate-700">
                      جمع کل مبالغ آرتیکل‌های سند:
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono text-sm text-indigo-800">
                      {formatCurrency(totalDebit, settings.currency)}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono text-sm text-emerald-800">
                      {formatCurrency(totalCredit, settings.currency)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Balance Indicator & Persian Words */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-3 text-xs transition-colors ${
              isBalanced
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-rose-50/80 border-rose-200 shadow-xs'
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              {isBalanced ? (
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>تراز سند کاملاً صحیح است (جمع بدهکار و بستانکار برابر)</span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-rose-800 font-bold">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 animate-pulse" />
                  <span>
                    سند نامتراز است — اختلاف:{' '}
                    <strong className="font-mono text-sm underline decoration-rose-400">
                      {formatCurrency(difference, settings.currency)}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoBalanceVoucher}
                    className="mr-2 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-xs transition transform hover:scale-105 flex items-center gap-1"
                  >
                    <span>⚡ تراز خودکار سند</span>
                    <span className="font-mono text-[11px] opacity-90">({formatCurrency(difference, settings.currency)})</span>
                  </button>
                </div>
              )}
            </div>

            <div className="text-slate-700 font-medium text-left">
              مبلغ سند به حروف: <strong className="text-slate-900">{numberToWordsPersian(totalDebit)} {settings.currency}</strong>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              id="btn-submit-voucher"
              className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition transform hover:-translate-y-0.5"
            >
              {voucherToEdit ? 'ذخیره تغییرات سند' : 'ثبت سند حسابداری'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

