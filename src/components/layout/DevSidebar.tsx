import { useEffect, useState } from 'react';
import {
  BookOpen,
  Building2,
  ChevronRight,
  Database,
  History,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type DevPage = 'home' | 'auth' | 'organizations' | 'connections' | 'analytics' | 'docs' | 'history';

interface NavItem {
  id: DevPage;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Главная', icon: LayoutDashboard },
  { id: 'auth', label: 'Авторизация', icon: LockKeyhole },
  { id: 'organizations', label: 'Организации', icon: Building2 },
  { id: 'connections', label: 'Подключения', icon: Link2 },
  { id: 'analytics', label: 'Аналитика', icon: Database },
  { id: 'docs', label: 'Документация', icon: BookOpen },
  { id: 'history', label: 'История', icon: History },
];

const DEV_SIDEBAR_COLLAPSED_STORAGE_KEY = 'aistats-dev-sidebar-collapsed';

interface DevSidebarProps {
  currentPage: DevPage;
  onNavigate: (page: DevPage) => void;
  onBack: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function DevSidebar({
  currentPage,
  onNavigate,
  onBack,
  isMobileOpen = false,
  onMobileClose,
}: DevSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(DEV_SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    window.localStorage.setItem(DEV_SIDEBAR_COLLAPSED_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const handleNavigate = (page: DevPage) => {
    onNavigate(page);
    onMobileClose?.();
  };

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-screen flex-shrink-0 flex-col bg-slate-900 text-white transition-all duration-200 md:flex ${
          isCollapsed ? 'w-14' : 'w-64'
        }`}
      >
        <SidebarInner
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onBack={onBack}
          isCollapsed={isCollapsed}
          onCollapse={() => setIsCollapsed(true)}
          onExpand={() => setIsCollapsed(false)}
        />
      </aside>

      <div className={`fixed inset-0 z-[150] md:hidden ${isMobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          type="button"
          onClick={onMobileClose}
          className={`absolute inset-0 bg-slate-950/50 transition-opacity duration-300 ${
            isMobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Close navigation"
        />
        <div
          className={`absolute inset-0 flex h-full w-full flex-col bg-slate-900 text-white transition-transform duration-300 ease-out ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500">
                <ShieldCheck size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight text-white">AnalyticsPro Dev</div>
                <div className="text-xs text-slate-400">Скрытое UI-пространство</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onMobileClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Рабочее пространство разработчика</div>
            <ul className="space-y-1.5">
              {navItems.map(item => {
                const Icon = item.icon;
                const active = currentPage === item.id;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-150 ${
                        active
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon size={18} className={`flex-shrink-0 ${active ? 'text-blue-200' : 'text-slate-500'}`} />
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      {active && <ChevronRight size={16} className="text-blue-300" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-slate-700/50 px-4 py-4">
            <button
              type="button"
              onClick={onBack}
              className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
            >
              Вернуться в основное приложение
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function SidebarInner({
  currentPage,
  onNavigate,
  onBack,
  isCollapsed,
  onCollapse,
  onExpand,
}: {
  currentPage: DevPage;
  onNavigate: (page: DevPage) => void;
  onBack: () => void;
  isCollapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
}) {
  return (
    <>
      <div className={`border-b border-slate-700/50 ${isCollapsed ? 'px-3 py-5' : 'px-6 py-5'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'min-w-0 gap-2.5'}`}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500">
              <ShieldCheck size={16} className="text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight text-white">AnalyticsPro Dev</div>
                <div className="text-xs text-slate-400">Скрытое UI-пространство</div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              type="button"
              onClick={onCollapse}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>

        {isCollapsed && (
          <button
            type="button"
            onClick={onExpand}
            className="mt-4 flex h-9 w-full items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
      </div>

      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2 py-4' : 'px-3 py-4'}`}>
        {!isCollapsed && <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Developer workspace</div>}

        <ul className="space-y-0.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.id;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  title={isCollapsed ? item.label : undefined}
                  onClick={() => onNavigate(item.id)}
                  className={`group flex w-full items-center rounded-lg text-sm transition-all duration-150 ${
                    isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5'
                  } ${
                    active
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon
                    size={16}
                    className={`flex-shrink-0 ${active ? 'text-blue-200' : 'text-slate-500 group-hover:text-slate-300'}`}
                  />

                  {isCollapsed ? <span className="sr-only">{item.label}</span> : <span className="flex-1 text-left font-medium">{item.label}</span>}

                  {!isCollapsed && active && <ChevronRight size={14} className="text-blue-300" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={`border-t border-slate-700/50 ${isCollapsed ? 'px-2 py-4' : 'px-4 py-4'}`}>
        {isCollapsed ? (
          <div className="flex justify-center rounded-lg bg-slate-800 p-3">
            <div className="h-3 w-3 rounded-full bg-blue-500" aria-label="Developer workspace" title="Developer workspace" />
          </div>
        ) : (
          <div className="rounded-lg bg-slate-800 p-3">
            <div className="mb-1 text-xs text-slate-400">Developer mode</div>
            <div className="text-sm font-semibold text-white">Hidden UI pages</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
              <div className="h-full w-4/5 rounded-full bg-blue-500" />
            </div>
            <div className="mt-1 text-xs text-slate-500">Авторизация, организации, документация и синхронизация</div>
            <button
              type="button"
              onClick={onBack}
              className="mt-3 w-full rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            >
              Вернуться в основное приложение
            </button>
          </div>
        )}
      </div>
    </>
  );
}
