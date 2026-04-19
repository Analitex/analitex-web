import { useState, useEffect } from 'react';
import type { FilterState, InventorySummary, Product } from '../types';

export function useInventoryData(filters: FilterState, products: Map<string, Product>) {
  const [summaries, setSummaries] = useState<InventorySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [avgTurnover, setAvgTurnover] = useState(0);

  useEffect(() => {
    void filters;
    void products;
    setSummaries([]);
    setTotalValue(0);
    setAvgTurnover(0);
    setLoading(false);
  }, [filters, products]);

  return { summaries, loading, totalValue, avgTurnover };
}
