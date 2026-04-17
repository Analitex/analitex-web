import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { FilterBar } from './FilterBar';
import type { Page } from '../../types';
import { SETTINGS_TABS, type SettingsTabId } from '../../pages/settingsConfig';

interface LayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  brands: string[];
  categories: string[];
  marketplaces: string[];
  stores: string[];
  skus: { id: string; sku: string; name: string }[];
  settingsTab: SettingsTabId;
  onSettingsTabChange: (tab: SettingsTabId) => void;
}

export function Layout({
  children,
  currentPage,
  onNavigate,
  brands,
  categories,
  marketplaces,
  stores,
  skus,
  settingsTab,
  onSettingsTabChange,
}: LayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const showFilterBar = currentPage !== 'settings';
  const showSettingsMobileHeader = currentPage === 'settings';
  useEffect(() => {
    if (!isMobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileNavOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileNavOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {showSettingsMobileHeader && (
          <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 md:hidden">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-white"
                aria-label="Открыть навигацию"
              >
                <Menu size={18} />
              </button>

              <label className="block min-w-0 flex-1">
                <span className="sr-only">Раздел настроек</span>
                <div className="relative rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Раздел настроек
                  </div>
                  <select
                    value={settingsTab}
                    onChange={event => onSettingsTabChange(event.target.value as SettingsTabId)}
                    className="w-full appearance-none bg-transparent pr-7 text-sm font-semibold text-slate-800 outline-none"
                  >
                    {SETTINGS_TABS.map(tab => (
                      <option key={tab.id} value={tab.id}>
                        {tab.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </label>
            </div>
          </div>
        )}

        {showFilterBar && (
          <FilterBar
            currentPage={currentPage}
            brands={brands}
            categories={categories}
            marketplaces={marketplaces}
            stores={stores}
            skus={skus}
            onOpenMobileNav={() => setIsMobileNavOpen(true)}
          />
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
