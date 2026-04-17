import { useState } from 'react';
import { FilterProvider } from './context/FilterContext';
import { ReportModeProvider } from './context/ReportModeContext';
import { useProducts } from './hooks/useProducts';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { SummaryPage } from './pages/SummaryPage';
import { FinancePage } from './pages/FinancePage';
import { InventoryPage } from './pages/InventoryPage';
import { PlanFactPage } from './pages/PlanFactPage';
import { AIInsightsPage } from './pages/AllInsightPage';
import type { Page } from './types';

function AppShell() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const { brands, categories, marketplaces, stores, skus } = useProducts();

  const page = (() => {
    switch (currentPage) {
      case 'summary':
        return <SummaryPage />;
      case 'finance':
        return <FinancePage />;
      case 'inventory':
        return <InventoryPage />;
      case 'planfact':
        return <PlanFactPage />;
      case 'ai':
        return <AIInsightsPage />;
      case 'dashboard':
      default:
        return <DashboardPage />;
    }
  })();

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      brands={brands}
      categories={categories}
      marketplaces={marketplaces}
      stores={stores}
      skus={skus}
    >
      {page}
    </Layout>
  );
}

function App() {
  return (
    <FilterProvider>
      <ReportModeProvider>
        <AppShell />
      </ReportModeProvider>
    </FilterProvider>
  );
}

export default App;
