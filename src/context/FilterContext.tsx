import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { FilterState } from '../types';

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDateString(value: string | null) {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getDefaultDateRange() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const dateStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  dateStartDate.setDate(dateStartDate.getDate() - weekOffset);

  return {
    dateStart: formatLocalDate(dateStartDate),
    dateEnd: formatLocalDate(new Date(today.getFullYear(), today.getMonth(), today.getDate())),
  };
}

function getFiltersFromQuery() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const dateStart = params.get('dateStart');
  const dateEnd = params.get('dateEnd');

  if (!isValidDateString(dateStart) || !isValidDateString(dateEnd) || dateStart > dateEnd) {
    return null;
  }

  return { dateStart, dateEnd };
}

function buildDefaultFilters(): FilterState {
  const defaultDateRange = getDefaultDateRange();
  const queryDateRange = getFiltersFromQuery();
  return {
    dateStart: queryDateRange?.dateStart ?? defaultDateRange.dateStart,
    dateEnd: queryDateRange?.dateEnd ?? defaultDateRange.dateEnd,
    marketplace: [],
    store: [],
    brand: [],
    category: [],
    sku: [],
  };
}

interface FilterContextType {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<FilterState>(() => buildDefaultFilters());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    params.set('dateStart', filters.dateStart);
    params.set('dateEnd', filters.dateEnd);
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, '', nextUrl);
    }
  }, [filters.dateEnd, filters.dateStart]);

  const setFilters = (nextFilters: FilterState) => {
    setFiltersState(nextFilters);
  };

  const resetFilters = () => {
    setFiltersState(buildDefaultFilters());
  };

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
