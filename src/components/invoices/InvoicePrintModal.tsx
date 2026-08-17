import React from 'react';
import { Invoice } from '../../types/accounting';
import { useAccounting } from '../../context/AccountingContext';
import { formatCurrency, numberToWordsPersian, toPersianDigits } from '../../utils/dateUtils';
import { Printer, X, Building2, CheckCircle2 } from 'lucide-react';

interface InvoicePrintModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ invoice, onClose }) => {
  const { settings, contacts } = useAccounting();
  const contact = contacts.find((c) => c.id === invoice.contactId);

  const handlePrint = () => {
    window.print();
  };

  const invoiceTypeTitle =
    invoice.type === 'sales'
      ? 'فاکتور فروش کالا و خدمات'
      : invoice.type === 'purchase'
      ? 'فاکتور خرید کالا و خدمات'
      : invoice.type === 'sales_return'
      ? 'فاکتور برگشت از فروش'
      : 'فاکتور برگشت از خرید';

  const isSalesType = invoice.type === 'sales' || invoice.type === 'sales_return';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">پیش‌نمایش و چاپ فاکتور شماره {invoice.invoiceNumber}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-trigger-print-invoice"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ فاکتور</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="p-6 md:p-8 overflow-y-auto print-page font-sans text-slate-900">
          {/* Official Invoice Outer Border */}
          <div className="border-2 border-slate-800 p-4 rounded-lg space-y-4">
            {/* Header: Company, Invoice Title, Date & Number */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
              {/* Seller Logo & Name */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                  <Building2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">{settings.companyName}</h2>
                  <p className="text-[11px] text-slate-600 mt-0.5">{settings.tagline}</p>
                </div>
              </div>

              {/* Title Center */}
              <div className="text-center">
                <h1 className="text-lg font-black text-slate-900 tracking-wide border-b border-slate-400 pb-1">
                  {invoiceTypeTitle}
                </h1>
                <span className="text-[10px] text-slate-500 font-medium">نسخه چاپی رسمی سیستم مالی</span>
              </div>

              {/* Invoice Meta */}
              <div className="text-left text-xs space-y-1 font-mono">
                <div>
                  <span className="text-slate-600 font-sans font-medium text-[11px]">شماره فاکتور: </span>
                  <span className="font-bold text-slate-900">{invoice.invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-sans font-medium text-[11px]">تاریخ: </span>
                  <span className="font-bold text-slate-900">{invoice.date}</span>
                </div>
                {invoice.voucherId && (
                  <div>
                    <span className="text-slate-600 font-sans font-medium text-[11px]">شماره سند: </span>
                    <span className="text-slate-800">{invoice.voucherId.replace('vch-', '')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Seller & Buyer Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Seller Box */}
              <div className="border border-slate-300 rounded-md p-2.5 bg-slate-50/50 space-y-1">
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>مشخصات {isSalesType ? 'فروشنده' : 'خریدار'}:</span>
                  <span className="text-[10px] text-indigo-700 font-semibold">{settings.companyName}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-700">
                  <div>شناسه/کد ملی: <span className="font-mono">{settings.nationalCode || '-'}</span></div>
                  <div>کد اقتصادی: <span className="font-mono">{settings.economicCode || '-'}</span></div>
                  <div>تلفن: <span className="font-mono">{settings.phone}</span></div>
                  <div>کد پستی: <span className="font-mono">{settings.postalCode || '-'}</span></div>
                </div>
                <div className="text-[11px] text-slate-700">نشانی: {settings.address}</div>
              </div>

              {/* Buyer Box */}
              <div className="border border-slate-300 rounded-md p-2.5 bg-slate-50/50 space-y-1">
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>مشخصات {isSalesType ? 'خریدار / طرف حساب' : 'فروشنده / تامین‌کننده'}:</span>
                  <span className="text-[10px] text-slate-900 font-bold">{invoice.contactName}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-700">
                  <div>شناسه/کد ملی: <span className="font-mono">{contact?.nationalCode || invoice.contactEconomicCode || '-'}</span></div>
                  <div>کد اقتصادی: <span className="font-mono">{contact?.economicCode || '-'}</span></div>
                  <div>تلفن تماس: <span className="font-mono">{invoice.contactPhone || contact?.phone || '-'}</span></div>
                  <div>کد شخص: <span className="font-mono">{contact?.code || '-'}</span></div>
                </div>
                <div className="text-[11px] text-slate-700">
                  نشانی: {invoice.contactAddress || contact?.address || 'ثبت نشده'}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border border-slate-300">
                <thead className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-2 border-l border-slate-300 w-8 text-center">ردیف</th>
                    <th className="py-2 px-3 border-l border-slate-300">شرح کالا یا خدمات</th>
                    <th className="py-2 px-2 border-l border-slate-300 w-16 text-center">واحد</th>
                    <th className="py-2 px-2 border-l border-slate-300 w-16 text-center">تعداد</th>
                    <th className="py-2 px-3 border-l border-slate-300 w-28 text-left">مبلغ واحد ({settings.currency})</th>
                    <th className="py-2 px-3 border-l border-slate-300 w-24 text-left">تخفیف</th>
                    <th className="py-2 px-3 border-l border-slate-300 w-24 text-left">مالیات ۱۰٪</th>
                    <th className="py-2 px-3 text-left w-32">مبلغ کل ({settings.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2 px-2 border-l border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 border-l border-slate-200 font-medium text-slate-900">
                        {item.productTitle}
                      </td>
                      <td className="py-2 px-2 border-l border-slate-200 text-center text-slate-600">{item.unit}</td>
                      <td className="py-2 px-2 border-l border-slate-200 text-center font-mono font-bold">{item.quantity}</td>
                      <td className="py-2 px-3 border-l border-slate-200 text-left font-mono">{item.unitPrice.toLocaleString()}</td>
                      <td className="py-2 px-3 border-l border-slate-200 text-left font-mono text-slate-600">
                        {item.discountAmount > 0 ? item.discountAmount.toLocaleString() : '۰'}
                      </td>
                      <td className="py-2 px-3 border-l border-slate-200 text-left font-mono text-slate-600">
                        {item.taxAmount > 0 ? item.taxAmount.toLocaleString() : '۰'}
                      </td>
                      <td className="py-2 px-3 text-left font-mono font-bold text-slate-900">
                        {item.totalPrice.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Settlements Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start text-xs pt-1">
              {/* Multi-Payment Details */}
              <div className="border border-slate-300 rounded-md p-3 space-y-2 bg-slate-50/50">
                <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>نحوه تسویه و دریافت / پرداخت وجه فاکتور:</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  {invoice.settlement.cashPayments.length > 0 &&
                    invoice.settlement.cashPayments.map((c, i) => (
                      <div key={i} className="flex justify-between text-slate-700">
                        <span>پرداخت نقد ({c.cashTitle}):</span>
                        <span className="font-mono font-bold">{formatCurrency(c.amount, settings.currency)}</span>
                      </div>
                    ))}
                  {invoice.settlement.bankPayments.length > 0 &&
                    invoice.settlement.bankPayments.map((b, i) => (
                      <div key={i} className="flex justify-between text-slate-700">
                        <span>واریز بانکی / پوز ({b.bankTitle}){b.trackingCode ? ` [پیگیری: ${b.trackingCode}]` : ''}:</span>
                        <span className="font-mono font-bold">{formatCurrency(b.amount, settings.currency)}</span>
                      </div>
                    ))}
                  {invoice.settlement.chequePayments.length > 0 &&
                    invoice.settlement.chequePayments.map((ch, i) => (
                      <div key={i} className="flex justify-between text-slate-700">
                        <span>چک {ch.bankName} (ش: {ch.chequeNumber} - سررسید: {ch.dueDate}):</span>
                        <span className="font-mono font-bold">{formatCurrency(ch.amount, settings.currency)}</span>
                      </div>
                    ))}
                  {invoice.settlement.creditAmount > 0 && (
                    <div className="flex justify-between text-amber-800 font-medium">
                      <span>مانده در حساب (نسیه / تعهدی):</span>
                      <span className="font-mono font-bold">{formatCurrency(invoice.settlement.creditAmount, settings.currency)}</span>
                    </div>
                  )}
                  {invoice.settlement.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>تخفیف نقدی پای فاکتور:</span>
                      <span className="font-mono font-bold">{formatCurrency(invoice.settlement.discountAmount, settings.currency)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Calculation breakdown */}
              <div className="border border-slate-300 rounded-md p-3 space-y-1.5 bg-slate-50 text-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-600">جمع ناخالص کالاها:</span>
                  <span className="font-mono font-semibold">{formatCurrency(invoice.subTotal, settings.currency)}</span>
                </div>
                {(invoice.totalItemsDiscount + invoice.totalInvoiceDiscount) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>جمع کل تخفیفات اعطایی:</span>
                    <span className="font-mono font-semibold">
                      -{formatCurrency(invoice.totalItemsDiscount + invoice.totalInvoiceDiscount, settings.currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>مالیات و عوارض ارزش افزوده (۱۰٪):</span>
                  <span className="font-mono font-semibold">{formatCurrency(invoice.totalTax, settings.currency)}</span>
                </div>
                <div className="border-t-2 border-slate-400 pt-1.5 flex justify-between text-sm font-black text-slate-900">
                  <span>مبلغ قابل پرداخت نهایی:</span>
                  <span className="font-mono text-base text-indigo-900">
                    {formatCurrency(invoice.grandTotal, settings.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Amount in Persian Words */}
            <div className="p-2.5 bg-slate-100/80 rounded border border-slate-300 text-xs flex items-center gap-2">
              <span className="font-bold text-slate-800">مبلغ به حروف:</span>
              <span className="text-slate-900 font-semibold">
                {numberToWordsPersian(invoice.grandTotal)} {settings.currency} تمام
              </span>
            </div>

            {/* Notes & Footer Policy */}
            {(invoice.notes || settings.invoiceFooterNote) && (
              <div className="text-[11px] text-slate-600 space-y-1 border-t border-slate-200 pt-2">
                {invoice.notes && <div><strong>توضیحات فاکتور:</strong> {invoice.notes}</div>}
                {settings.invoiceFooterNote && <div><strong>شرایط و ضوابط:</strong> {settings.invoiceFooterNote}</div>}
              </div>
            )}

            {/* Signatures block */}
            <div className="grid grid-cols-4 gap-4 pt-6 text-center text-xs font-semibold text-slate-700">
              <div className="space-y-10">
                <div>تحویل‌دهنده / متصدی فروش</div>
                <div className="text-[10px] text-slate-400">امضا و تاریخ</div>
              </div>
              <div className="space-y-10">
                <div>امور مالی و حسابداری</div>
                <div className="text-[10px] text-slate-400">امضا و مهر</div>
              </div>
              <div className="space-y-10">
                <div>مدیریت بازرگانی</div>
                <div className="text-[10px] text-slate-400">امضا و مهر</div>
              </div>
              <div className="space-y-10">
                <div>تحویل‌گیرنده / خریدار</div>
                <div className="text-[10px] text-slate-400">امضا و اثر انگشت</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
