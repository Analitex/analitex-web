import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { FilterBar } from './FilterBar';
import type { Page } from '../../types';

interface LayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  brands: string[];
  categories: string[];
  marketplaces: string[];
  stores: string[];
  skus: { id: string; sku: string; name: string }[];
}

export function Layout({ children, currentPage, onNavigate, brands, categories, marketplaces, stores, skus }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <FilterBar
          brands={brands}
          categories={categories}
          marketplaces={marketplaces}
          stores={stores}
          skus={skus}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
