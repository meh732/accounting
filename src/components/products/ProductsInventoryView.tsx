import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { Product, ProductCategory } from '../../types/accounting';
import { formatCurrency } from '../../utils/dateUtils';
import { ProductCardexModal } from './ProductCardexModal';
import {
  Package,
  Plus,
  Search,
  Layers,
  FileText,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Boxes,
  Tag
} from 'lucide-react';

export const ProductsInventoryView: React.FC = () => {
  const {
    products,
    productCategories,
    addProduct,
    updateProduct,
    deleteProduct,
    addProductCategory,
    deleteProductCategory,
    settings,
  } = useAccounting();

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductForCardex, setSelectedProductForCardex] = useState<Product | null>(null);

  // Product Add / Edit Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // Category Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatTitle, setNewCatTitle] = useState('');

  // Product Form State
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('عدد');
  const [buyPrice, setBuyPrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [reorderPoint, setReorderPoint] = useState<number>(5);
  const [description, setDescription] = useState('');

  const openAddProductModal = () => {
    setProductToEdit(null);
    setCode(`PRD-${1000 + products.length + 1}`);
    setBarcode('');
    setTitle('');
    setCategoryId(productCategories[0]?.id || '');
    setUnit('عدد');
    setBuyPrice(0);
    setSalePrice(0);
    setStockQuantity(0);
    setReorderPoint(5);
    setDescription('');
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (p: Product) => {
    setProductToEdit(p);
    setCode(p.code);
    setBarcode(p.barcode || '');
    setTitle(p.title);
    setCategoryId(p.categoryId);
    setUnit(p.unit);
    setBuyPrice(p.buyPrice);
    setSalePrice(p.salePrice);
    setStockQuantity(p.stockQuantity);
    setReorderPoint(p.reorderPoint);
    setDescription(p.description || '');
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = (p: Product) => {
    if (window.confirm(`آیا از حذف کالای "${p.title}" اطمینان دارید؟`)) {
      deleteProduct(p.id);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !categoryId) return;

    const cat = productCategories.find((c) => c.id === categoryId);

    if (productToEdit) {
      updateProduct(productToEdit.id, {
        code,
        barcode,
        title: title.trim(),
        categoryId,
        categoryTitle: cat?.title || '',
        unit,
        buyPrice,
        salePrice,
        stockQuantity,
        reorderPoint,
        description,
      });
    } else {
      addProduct({
        code,
        barcode,
        title: title.trim(),
        categoryId,
        categoryTitle: cat?.title || '',
        unit,
        buyPrice,
        salePrice,
        stockQuantity,
        reorderPoint,
        description,
      });
    }

    setIsProductModalOpen(false);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatTitle.trim()) return;

    addProductCategory({
      code: newCatCode.trim() || `CAT-${productCategories.length + 1}`,
      title: newCatTitle.trim(),
    });

    setNewCatCode('');
    setNewCatTitle('');
    setIsCatModalOpen(false);
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategoryFilter === 'all' || p.categoryId === selectedCategoryFilter;
    const matchSearch =
      searchQuery === '' ||
      p.title.includes(searchQuery) ||
      p.code.includes(searchQuery) ||
      (p.barcode && p.barcode.includes(searchQuery)) ||
      p.categoryTitle.includes(searchQuery);

    return matchCat && matchSearch;
  });

  // Total inventory valuation
  const totalInventoryValue = products.reduce((sum, p) => sum + p.stockQuantity * p.buyPrice, 0);
  const totalItemsCount = products.reduce((sum, p) => sum + p.stockQuantity, 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-600" />
            <span>مدیریت انبار، تعریف کالا، گروه‌بندی و کاردکس کالا</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            کنترل دقیق موجودی تعدادی و ریالی انبار، تعیین نقطه سفارش بحرانی و صدور کاردکس
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddProductModal}
            id="btn-add-product"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف کالای جدید</span>
          </button>
          <button
            onClick={() => {
              setNewCatCode(`CAT-${productCategories.length + 1}`);
              setNewCatTitle('');
              setIsCatModalOpen(true);
            }}
            id="btn-add-category"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            <Tag className="w-4 h-4 text-amber-400" />
            <span>گروه کالا</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>ارزش ریالی کل موجودی انبار (بر مبنای بهای خرید)</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-900 font-mono mt-1">
            {formatCurrency(totalInventoryValue, settings.currency)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>تعداد کل اقلام در انبار</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-800 font-mono mt-1">
            {totalItemsCount} واحد کالا ({products.length} ردیف کالا)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>کالاهای نیازمند سفارش (زیر نقطه بحرانی)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 font-mono mt-1">
            {products.filter((p) => p.stockQuantity <= p.reorderPoint).length} قلم کالا
          </div>
        </div>
      </div>

      {/* Table & Filtering */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                selectedCategoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>همه گروه‌ها</span>
              <span className="mr-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800">
                {products.length}
              </span>
            </button>

            {productCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                  selectedCategoryFilter === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{cat.title}</span>
                <span className="mr-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800">
                  {products.filter((p) => p.categoryId === cat.id).length}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام کالا، بارکد یا کد..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-amber-500"
            />
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 font-mono w-24">کد کالا</th>
                <th className="py-3 px-3 min-w-[220px]">عنوان کالا / خدمت</th>
                <th className="py-3 px-3 w-32">گروه کالا</th>
                <th className="py-3 px-3 w-20 text-center">واحد</th>
                <th className="py-3 px-3 text-left w-32">قیمت خرید ({settings.currency})</th>
                <th className="py-3 px-3 text-left w-32">قیمت فروش ({settings.currency})</th>
                <th className="py-3 px-3 text-center w-28">موجودی انبار</th>
                <th className="py-3 px-3 text-center w-36">کاردکس و عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.map((p) => {
                const isLowStock = p.stockQuantity <= p.reorderPoint;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{p.code}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{p.title}</div>
                      {p.barcode && <div className="text-[11px] text-slate-400 font-mono">بارکد: {p.barcode}</div>}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        {p.categoryTitle}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">{p.unit}</td>
                    <td className="py-3 px-3 font-mono text-slate-700 text-left">
                      {formatCurrency(p.buyPrice, settings.currency)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 text-left">
                      {formatCurrency(p.salePrice, settings.currency)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono font-bold text-xs ${
                          isLowStock
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {isLowStock && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                        <span>
                          {p.stockQuantity} {p.unit}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedProductForCardex(p)}
                          title="مشاهده کاردکس انبار"
                          className="flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>کاردکس</span>
                        </button>
                        <button
                          onClick={() => openEditProductModal(p)}
                          title="ویرایش کالا"
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          title="حذف کالا"
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                {productToEdit ? `ویرایش ${productToEdit.title}` : 'تعریف کالای جدید در انبار'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">کد کالا</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-left"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">بارکد کالا</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="626..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">عنوان کالا / خدمات</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: لپ‌تاپ لنوو مدل ThinkPad..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">گروه کالا</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                    required
                  >
                    {productCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">واحد شمارش</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-center"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">قیمت خرید ({settings.currency})</label>
                  <input
                    type="number"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-left"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">قیمت فروش ({settings.currency})</label>
                  <input
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-left font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">موجودی اول دوره در انبار</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-center font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نقطه سفارش بحرانی (حداقل)</label>
                  <input
                    type="number"
                    value={reorderPoint}
                    onChange={(e) => setReorderPoint(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-center"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">توضیحات و مشخصات فنی</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs"
                >
                  ذخیره کالا
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">تعریف گروه جدید کالا</h3>
              <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">کد گروه کالا</label>
                <input
                  type="text"
                  value={newCatCode}
                  onChange={(e) => setNewCatCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">عنوان گروه کالا</label>
                <input
                  type="text"
                  value={newCatTitle}
                  onChange={(e) => setNewCatTitle(e.target.value)}
                  placeholder="مثال: کالای دیجیتال، قطعات یدکی..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold"
                >
                  ثبت گروه کالا
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Cardex Modal */}
      {selectedProductForCardex && (
        <ProductCardexModal
          product={selectedProductForCardex}
          onClose={() => setSelectedProductForCardex(null)}
        />
      )}
    </div>
  );
};
