import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Receipt,
  Network,
  Users,
  Landmark,
  Package,
  ArrowDownCircle,
  BarChart3,
  Settings,
  X
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'invoices'
  | 'vouchers'
  | 'accounts'
  | 'contacts'
  | 'banks'
  | 'products'
  | 'expenses'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  invoicesCount: number;
  vouchersCount: number;
  contactsCount: number;
  productsCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  invoicesCount,
  vouchersCount,
  contactsCount,
  productsCount,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const menuItems: {
    id: NavTab;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    color?: string;
  }[] = [
    {
      id: 'dashboard',
      title: 'داشبورد مدیریت',
      icon: LayoutDashboard,
    },
    {
      id: 'invoices',
      title: 'خرید و فروش و فاکتورها',
      icon: Receipt,
      badge: invoicesCount,
      color: 'text-indigo-500',
    },
    {
      id: 'vouchers',
      title: 'اسناد حسابداری (دوبل)',
      icon: FileSpreadsheet,
      badge: vouchersCount,
      color: 'text-emerald-500',
    },
    {
      id: 'accounts',
      title: 'کدینگ و سرفصل‌ها',
      icon: Network,
      color: 'text-sky-500',
    },
    {
      id: 'contacts',
      title: 'اشخاص و طرف‌حساب‌ها',
      icon: Users,
      badge: contactsCount,
      color: 'text-purple-500',
    },
    {
      id: 'banks',
      title: 'بانک، صندوق و کارتخوان',
      icon: Landmark,
      color: 'text-amber-500',
    },
    {
      id: 'products',
      title: 'کالا، انبار و خدمات',
      icon: Package,
      badge: productsCount,
      color: 'text-teal-500',
    },
    {
      id: 'expenses',
      title: 'ثبت و مدیریت هزینه‌ها',
      icon: ArrowDownCircle,
      color: 'text-rose-500',
    },
    {
      id: 'reports',
      title: 'ترازها و صورت‌های مالی',
      icon: BarChart3,
      color: 'text-blue-500',
    },
    {
      id: 'settings',
      title: 'تنظیمات و اطلاعات شرکت',
      icon: Settings,
      color: 'text-slate-500',
    },
  ];

  const handleItemClick = (id: NavTab) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="no-print fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
        />
      )}

      <aside
        className={`no-print w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-l border-slate-800 shadow-xl select-none transition-transform duration-300 z-50 fixed inset-y-0 right-0 lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Desktop App Title banner */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              سیستم حسابداری مالی
            </span>
            <div className="text-sm font-bold text-white tracking-wide">نسخه دسکتاپ و وب نوین</div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
              فعال
            </span>
            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-900/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : item.color || 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span className="text-xs">{item.title}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                      isActive
                        ? 'bg-indigo-700/80 text-white'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* System Status Footnote */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>دیتابیس محلی و پشتیبان:</span>
            <span className="text-emerald-400 font-mono">متصل و فعال</span>
          </div>
          <div className="flex items-center justify-between">
            <span>استاندارد حسابداری:</span>
            <span className="text-slate-300">دوبل استاندارد ایران</span>
          </div>
        </div>
      </aside>
    </>
  );
};
