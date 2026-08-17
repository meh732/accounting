import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Product } from '../../types/accounting';
import { formatCurrency } from '../../utils/dateUtils';
import { ChevronDown, Box, Check, X } from 'lucide-react';

interface SearchableProductSelectProps {
  id?: string;
  products?: Product[];
  selectedProductId?: string;
  value?: string;
  onChange: (productId: string, product?: Product, customTitle?: string) => void;
  onQuickAddProduct?: (title: string) => void;
  currency: 'تومان' | 'ریال';
  isPurchaseMode?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onEnterNext?: () => void;
}

export const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
  id,
  products = [],
  selectedProductId = '',
  value = '',
  onChange,
  currency,
  isPurchaseMode = false,
  placeholder = 'نام کالا یا انتخاب از انبار...',
  className = '',
  disabled = false,
  onKeyDown,
  onEnterNext,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const safeProducts = useMemo(() => products || [], [products]);

  const selectedProduct = useMemo(() => {
    return safeProducts.find((p) => p.id === selectedProductId);
  }, [safeProducts, selectedProductId]);

  // Display text: either value or selected product title
  const [inputText, setInputText] = useState(value || selectedProduct?.title || '');

  useEffect(() => {
    if (value !== undefined) {
      setInputText(value);
    } else if (selectedProduct) {
      setInputText(selectedProduct.title);
    }
  }, [value, selectedProduct]);

  // Filter products by input text
  const matchingProducts = useMemo(() => {
    if (!inputText.trim()) return safeProducts;
    const term = inputText.trim().toLowerCase();
    return safeProducts.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase().includes(term))
    );
  }, [safeProducts, inputText]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProduct = (product: Product) => {
    setInputText(product.title);
    onChange(product.id, product, product.title);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (onEnterNext) {
      setTimeout(() => onEnterNext(), 30);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);
    setIsOpen(true);
    setHighlightedIndex(0);

    // If matches exact product
    const exact = safeProducts.find((p) => p.title.toLowerCase() === text.trim().toLowerCase());
    if (exact) {
      onChange(exact.id, exact, exact.title);
    } else {
      onChange('', undefined, text);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev < matchingProducts.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : matchingProducts.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && matchingProducts[highlightedIndex]) {
        e.preventDefault();
        handleSelectProduct(matchingProducts[highlightedIndex]);
      } else {
        setIsOpen(false);
        if (onKeyDown) {
          onKeyDown(e);
        } else if (onEnterNext) {
          e.preventDefault();
          onEnterNext();
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Direct Inline Input with Toggle */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          id={id}
          disabled={disabled}
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => {
            inputRef.current?.select();
            setIsOpen(true);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 pl-7 text-xs text-right outline-hidden transition placeholder:text-slate-400"
          autoComplete="off"
        />

        <div className="absolute left-1.5 flex items-center gap-0.5">
          {inputText && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                setInputText('');
                onChange('', undefined, '');
                inputRef.current?.focus();
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && matchingProducts.length > 0 && (
        <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden max-h-60 flex flex-col text-xs min-w-[280px]">
          <div className="overflow-y-auto p-1 divide-y divide-slate-100">
            {matchingProducts.map((p, idx) => {
              const isSelected = p.id === selectedProductId;
              const isHighlighted = idx === highlightedIndex;
              const price = isPurchaseMode ? p.buyPrice : p.salePrice;

              return (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur before click registers
                    handleSelectProduct(p);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-right transition ${
                    isHighlighted || isSelected
                      ? 'bg-indigo-50 text-indigo-950 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1">
                    <Box className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate font-semibold">{p.title}</span>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                      موجودی: {p.stockQuantity} {p.unit}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="font-mono font-bold text-[11px] text-emerald-700">
                      {formatCurrency(price, currency)}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
