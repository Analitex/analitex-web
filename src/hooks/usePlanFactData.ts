import { useState, useEffect } from 'react';
import type { FilterState, PlanFactRow, Product } from '../types';

export function usePlanFactData(filters: FilterState, products: Map<string, Product>) {
  const [rows, setRows] = useState<PlanFactRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void filters;
    void products;
    setRows([]);
    setLoading(false);
  }, [filters, products]);

  return { rows, loading };
}
