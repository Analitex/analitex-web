import { useState } from 'react';
import {
  LayoutDashboard, Table2, LineChart, Package,
  BarChart3, Sparkles, ChevronRight, TrendingUp, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Page } from '../../types';

interface NavItem {
  id: Page;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Оцифровка', icon: LayoutDashboard },
  { id: 'summary', label: 'Сводный отчет', icon: Table2 },
  { id: 'finance', label: 'Финансы', icon: LineChart },
  { id: 'inventory', label: 'Склад', icon: Package },
  { id: 'planfact', label: 'План / Факт', icon: BarChart3 },
  { id: 'ai', label: 'AI Инсайты', icon: Sparkles, badge: 'NEW' },
];

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-shrink-0 flex-col bg-slate-900 text-white transition-all duration-200 ${
        isCollapsed ? 'w-14' : 'w-64'
      }`}
    >
      <div className={`border-b border-slate-700/50 ${isCollapsed ? 'px-3 py-5' : 'px-6 py-5'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'min-w-0 gap-2.5'}`}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500">
              <TrendingUp size={16} className="text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight text-white">AnalyticsPro</div>
                <div className="text-xs text-slate-400">Marketplace Analytics</div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="Свернуть боковое меню"
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>

        {isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="mt-4 flex h-9 w-full items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Развернуть боковое меню"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
      </div>

      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2 py-4' : 'px-3 py-4'}`}>
        {!isCollapsed && (
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Аналитика
          </div>
        )}

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
                    className={`flex-shrink-0 ${
                      active ? 'text-blue-200' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />

                  {isCollapsed ? (
                    <span className="sr-only">{item.label}</span>
                  ) : (
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                  )}

                  {!isCollapsed && item.badge && (
                    <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}

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
            <div
              className="h-3 w-3 rounded-full bg-blue-500"
              aria-label="Тариф Professional"
              title="Тариф Professional"
            />
          </div>
        ) : (
          <div className="rounded-lg bg-slate-800 p-3">
            <div className="mb-1 text-xs text-slate-400">Тариф</div>
            <div className="text-sm font-semibold text-white">Professional</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
              <div className="h-full w-2/3 rounded-full bg-blue-500" />
            </div>
            <div className="mt-1 text-xs text-slate-500">60 из 90 дней</div>
          </div>
        )}
      </div>
    </aside>
  );
}
