import { useEffect, useState } from 'react';
import type { FilterState, SalesRecord, Product } from '../types';

interface SalesDataResult {
  records: SalesRecord[];
  prevRecords: SalesRecord[];
  products: Map<string, Product>;
  loading: boolean;
}

export function useSalesData(filters: FilterState): SalesDataResult {
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [prevRecords, setPrevRecords] = useState<SalesRecord[]>([]);
  const [products, setProducts] = useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void filters;
    setRecords([]);
    setPrevRecords([]);
    setProducts(new Map());
    setLoading(false);
  }, [filters]);

  return { records, prevRecords, products, loading };
}
