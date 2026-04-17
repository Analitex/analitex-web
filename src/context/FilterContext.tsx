import { createContext, useContext, useState, type ReactNode } from 'react';
import type { FilterState } from '../types';

const today = new Date();
const dateEnd = today.toISOString().split('T')[0];
const dateStartDate = new Date(today);
dateStartDate.setDate(dateStartDate.getDate() - 27);
const dateStart = dateStartDate.toISOString().split('T')[0];

const defaultFilters: FilterState = {
  dateStart,
  dateEnd,
  marketplace: [],
  store: [],
  brand: [],
  category: [],
  sku: [],
};

interface FilterContextType {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const resetFilters = () => setFilters(defaultFilters);

  return (
    <FilterContext.Provider value={{ filters, setFilters, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}
