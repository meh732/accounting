import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AccountCategory } from '../../types/accounting';
import { Search, ChevronDown, Check, FolderTree, X } from 'lucide-react';

interface SearchableAccountSelectProps {
  id?: string;
  accounts?: AccountCategory[];
  selectedCode: string;
  onChange: (code: string, account?: AccountCategory) => void;
  filterLevel?: ('moein' | 'kol' | 'group')[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onEnterNext?: () => void;
}

export const SearchableAccountSelect: React.FC<SearchableAccountSelectProps> = ({
  id,
  accounts = [],
  selectedCode,
  onChange,
  filterLevel = ['moein', 'kol'],
  placeholder = 'جستجو و انتخاب سرفصل...',
  className = '',
  disabled = false,
  onKeyDown,
  onEnterNext,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const safeAccounts = useMemo(() => accounts || [], [accounts]);

  // Filter accounts by allowed levels
  const eligibleAccounts = useMemo(() => {
    return safeAccounts.filter((a) => filterLevel.includes(a.level));
  }, [safeAccounts, filterLevel]);

  // Find currently selected account
  const selectedAccount = useMemo(() => {
    return safeAccounts.find((a) => a.code === selectedCode);
  }, [safeAccounts, selectedCode]);

  // Filter accounts based on search term
  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) return eligibleAccounts;
    const term = searchTerm.trim().toLowerCase();
    return eligibleAccounts.filter(
      (a) =>
        a.title.toLowerCase().includes(term) ||
        a.code.toLowerCase().includes(term) ||
        (a.parentCode && a.parentCode.toLowerCase().includes(term))
    );
  }, [eligibleAccounts, searchTerm]);

  // Group filtered accounts by their main group (first digit)
  const groupedAccounts = useMemo<Record<string, AccountCategory[]>>(() => {
    const groups: Record<string, AccountCategory[]> = {};
    const groupNameMap: { [key: string]: string } = {
      '1': '۱. دارایی‌های جاری',
      '2': '۲. دارایی‌های غیرجاری',
      '3': '۳. بدهی‌های جاری',
      '4': '۴. حقوق مالکانه و جاری شرکا',
      '5': '۵. درآمدها و فروش',
      '6': '۶. بهای تمام شده و خرید',
      '7': '۷. هزینه‌ها',
      '8': '۸. حساب‌های بستن و اختتامیه',
    };

    filteredAccounts.forEach((acc) => {
      const groupDigit = acc.code.charAt(0);
      const groupTitle = groupNameMap[groupDigit] || 'سایر سرفصل‌ها';
      if (!groups[groupTitle]) {
        groups[groupTitle] = [];
      }
      groups[groupTitle].push(acc);
    });

    return groups;
  }, [filteredAccounts]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setSearchTerm('');
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 50);
  };

  const handleSelect = (account: AccountCategory) => {
    onChange(account.code, account);
    setIsOpen(false);
    setSearchTerm('');
    if (onEnterNext) {
      setTimeout(() => onEnterNext(), 30);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          } else if (onKeyDown) {
            onKeyDown(e);
          }
        }}
        className={`w-full flex items-center justify-between gap-1.5 bg-white border ${
          isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-300 hover:border-slate-400'
        } rounded-lg px-2.5 py-1.5 text-xs text-right transition disabled:opacity-50 disabled:bg-slate-100`}
      >
        <div className="flex items-center gap-1.5 truncate flex-1">
          {selectedAccount ? (
            <>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                {selectedAccount.code}
              </span>
              <span className="font-medium text-slate-800 truncate">{selectedAccount.title}</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-medium shrink-0 ${
                  selectedAccount.level === 'moein'
                    ? 'bg-sky-50 text-sky-700 border border-sky-100'
                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                }`}
              >
                {selectedAccount.level === 'moein' ? 'معین' : 'کل'}
              </span>
            </>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Search & List Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-80 flex flex-col text-xs min-w-[280px]">
          {/* Live Search Input */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="تایپ نام سرفصل یا کد (مثلا: بانک، فروش، جاری شرکا، ۱۰۱۰۱)..."
              className="w-full bg-transparent border-none outline-hidden text-xs text-slate-800 placeholder:text-slate-400"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                } else if (e.key === 'Enter' && filteredAccounts.length > 0) {
                  e.preventDefault();
                  handleSelect(filteredAccounts[0]);
                }
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Accounts List grouped */}
          <div className="overflow-y-auto flex-1 p-1 divide-y divide-slate-100">
            {Object.keys(groupedAccounts).length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                سرفصلی با این مشخصات یافت نشد
              </div>
            ) : (
              (Object.entries(groupedAccounts) as [string, AccountCategory[]][]).map(([groupTitle, accList]) => (
                <div key={groupTitle} className="py-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <FolderTree className="w-3 h-3 text-slate-400" />
                    <span>{groupTitle}</span>
                  </div>
                  <div className="space-y-0.5">
                    {accList.map((acc) => {
                      const isSelected = acc.code === selectedCode;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => handleSelect(acc)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-right transition ${
                            isSelected
                              ? 'bg-indigo-50 text-indigo-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate flex-1">
                            <span className="font-mono text-xs font-bold text-indigo-600 shrink-0">
                              {acc.code}
                            </span>
                            <span className="truncate">{acc.title}</span>
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded shrink-0 ${
                                acc.level === 'moein'
                                  ? 'bg-sky-50 text-sky-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {acc.level === 'moein' ? 'معین' : 'کل'}
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mr-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
