import { useEffect, useState, type ReactNode } from 'react';
import type { MultiSelectOption } from '../filters/MultiSelect';
import { FilterBar } from './FilterBar';
import { Sidebar } from './Sidebar';
import type { Page } from '../../types';

interface LayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  brands: string[];
  categories: string[];
  marketplaces: string[];
  stores: MultiSelectOption[];
  skus: { id: string; sku: string; name: string }[];
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
}: LayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
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
        <FilterBar
          currentPage={currentPage}
          brands={brands}
          categories={categories}
          marketplaces={marketplaces}
          stores={stores}
          skus={skus}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
