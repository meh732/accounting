import React from 'react';
import { Product } from '../../types/accounting';
import { useAccounting } from '../../context/AccountingContext';
import { calculateProductCardex } from '../../utils/financialCalculations';
import { formatCurrency } from '../../utils/dateUtils';
import { Printer, X, Package, Building2 } from 'lucide-react';

interface ProductCardexModalProps {
  product: Product;
  onClose: () => void;
}

export const ProductCardexModal: React.FC<ProductCardexModalProps> = ({ product, onClose }) => {
  const { invoices, settings } = useAccounting();

  const cardex = calculateProductCardex(product, invoices);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-slate-200">
        {/* Top Controls */}
        <div className="no-print p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                کاردکس ریالی و تعدادی انبار کالا: {product.title} ({product.code})
              </h3>
              <span className="text-[11px] text-slate-500">
                گزارش گردش ورود، خروج، مرجوعی‌ها و مانده موجودی لحظه‌ای انبار
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              id="btn-print-product-cardex"
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ کاردکس انبار</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Cardex Area */}
        <div className="p-6 md:p-8 overflow-y-auto print-page font-sans text-slate-900 space-y-4">
          <div className="border-2 border-slate-800 p-4 rounded-lg space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">{settings.companyName}</h2>
                  <p className="text-[11px] text-slate-600">سیستم انبارداری و کنترل موجودی کالا</p>
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-base font-black text-slate-900 border-b border-slate-400 pb-0.5">
                  کاردکس مقداری و ریالی کالا
                </h1>
                <span className="text-[10px] text-slate-500">کنترل انبار و بهای تمام‌شده</span>
              </div>

              <div className="text-left text-xs space-y-1 font-mono">
                <div>کد کالا: <span className="font-bold">{product.code}</span></div>
                <div>تاریخ گزارش: <span className="font-bold">{new Date().toLocaleDateString('fa-IR')}</span></div>
              </div>
            </div>

            {/* Product Meta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded border border-slate-300 text-xs">
              <div>نام کالا: <strong>{product.title}</strong></div>
              <div>گروه کالا: <span>{product.categoryTitle}</span></div>
              <div>واحد سنجش: <span>{product.unit}</span></div>
              <div>نقطه سفارش بحرانی: <span className="font-mono">{product.minStockAlert || 0} {product.unit}</span></div>
              <div>آخرین قیمت خرید: <span className="font-mono">{formatCurrency(product.buyPrice, settings.currency)}</span></div>
              <div>قیمت مصوب فروش: <span className="font-mono">{formatCurrency(product.sellPrice, settings.currency)}</span></div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs">
                <div className="text-emerald-800 font-semibold">مجموع وارده به انبار (خرید/برگشت)</div>
                <div className="text-sm font-bold font-mono text-emerald-900 mt-1">
                  {cardex.totalInQty} {product.unit}
                </div>
              </div>
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs">
                <div className="text-rose-800 font-semibold">مجموع صادره از انبار (فروش)</div>
                <div className="text-sm font-bold font-mono text-rose-900 mt-1">
                  {cardex.totalOutQty} {product.unit}
                </div>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs">
                <div className="text-amber-800 font-semibold">موجودی پایان دوره در انبار</div>
                <div className="text-sm font-bold font-mono text-amber-950 mt-1">
                  {cardex.currentStock} {product.unit}
                </div>
              </div>
            </div>

            {/* Cardex Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border border-slate-300">
                <thead className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-2 w-8 text-center border-l border-slate-300" rowSpan={2}>#</th>
                    <th className="py-2 px-2.5 w-24 border-l border-slate-300 font-mono" rowSpan={2}>تاریخ</th>
                    <th className="py-2 px-2.5 w-20 border-l border-slate-300 font-mono" rowSpan={2}>شماره مدرک</th>
                    <th className="py-2 px-3 border-l border-slate-300" rowSpan={2}>شرح رویداد و طرف حساب</th>
                    <th className="py-1 px-3 text-center border-l border-slate-300 bg-emerald-100" colSpan={2}>
                      وارده به انبار
                    </th>
                    <th className="py-1 px-3 text-center border-l border-slate-300 bg-rose-100" colSpan={2}>
                      صادره از انبار
                    </th>
                    <th className="py-1 px-3 text-center bg-slate-300" colSpan={2}>
                      موجودی در انبار
                    </th>
                  </tr>
                  <tr>
                    <th className="py-1 px-2 text-center border-l border-slate-300 w-16">تعداد</th>
                    <th className="py-1 px-2 text-left border-l border-slate-300 w-24">مبلغ واحد</th>
                    <th className="py-1 px-2 text-center border-l border-slate-300 w-16">تعداد</th>
                    <th className="py-1 px-2 text-left border-l border-slate-300 w-24">مبلغ واحد</th>
                    <th className="py-1 px-2 text-center border-l border-slate-300 w-16">تعداد</th>
                    <th className="py-1 px-2 text-left w-28">ارزش کل ({settings.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {cardex.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-2 text-center border-l border-slate-200 font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2.5 border-l border-slate-200 font-mono text-slate-600">{row.date}</td>
                      <td className="py-2 px-2.5 border-l border-slate-200 font-mono font-semibold text-slate-800">
                        {row.documentNumber}
                      </td>
                      <td className="py-2 px-3 border-l border-slate-200 font-medium text-slate-900">
                        {row.documentType} {row.contactName ? `(${row.contactName})` : ''}
                      </td>
                      <td className="py-2 px-2 text-center border-l border-slate-200 font-mono font-bold text-emerald-700">
                        {row.inQuantity > 0 ? row.inQuantity : '-'}
                      </td>
                      <td className="py-2 px-2 text-left border-l border-slate-200 font-mono text-slate-700">
                        {row.inUnitPrice > 0 ? row.inUnitPrice.toLocaleString() : '-'}
                      </td>
                      <td className="py-2 px-2 text-center border-l border-slate-200 font-mono font-bold text-rose-700">
                        {row.outQuantity > 0 ? row.outQuantity : '-'}
                      </td>
                      <td className="py-2 px-2 text-left border-l border-slate-200 font-mono text-slate-700">
                        {row.outUnitPrice > 0 ? row.outUnitPrice.toLocaleString() : '-'}
                      </td>
                      <td className="py-2 px-2 text-center border-l border-slate-200 font-mono font-black text-slate-900 bg-slate-50">
                        {row.remainingQuantity}
                      </td>
                      <td className="py-2 px-2 text-left font-mono font-bold text-slate-900 bg-slate-50">
                        {row.remainingValue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <tr>
                    <td colSpan={4} className="py-2 px-3 border-l border-slate-300 text-right">
                      مجموع کل:
                    </td>
                    <td className="py-2 px-2 text-center border-l border-slate-300 font-mono text-emerald-900">
                      {cardex.totalInQty}
                    </td>
                    <td className="py-2 px-2 border-l border-slate-300"></td>
                    <td className="py-2 px-2 text-center border-l border-slate-300 font-mono text-rose-900">
                      {cardex.totalOutQty}
                    </td>
                    <td className="py-2 px-2 border-l border-slate-300"></td>
                    <td className="py-2 px-2 text-center border-l border-slate-300 font-mono text-slate-900 font-black">
                      {cardex.currentStock}
                    </td>
                    <td className="py-2 px-2 text-left font-mono text-slate-900 font-black">
                      {(cardex.currentStock * product.buyPrice).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs font-semibold text-slate-700">
              <div>انباردار مسئول (امضا و تاریخ)</div>
              <div>امور مالی و حسابداری (مهر و امضا)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
