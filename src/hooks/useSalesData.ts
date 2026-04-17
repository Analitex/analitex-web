import { useState, useEffect, useRef } from 'react';
import type { FilterState, SalesRecord, Product } from '../types';
import { subDays, getDaysInRange } from '../lib/calculations';
import { products as allProducts, salesRecords as allSalesRecords } from '../lib/localData';

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
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        const filteredProducts = allProducts.filter(product => {
          if (filters.marketplace.length && !filters.marketplace.includes(product.marketplace)) return false;
          if (filters.store.length && !filters.store.includes(product.store)) return false;
          if (filters.brand.length && !filters.brand.includes(product.brand)) return false;
          if (filters.category.length && !filters.category.includes(product.category)) return false;
          if (filters.sku.length && !filters.sku.includes(product.id)) return false;
          return true;
        });

        const prodMap = new Map<string, Product>(filteredProducts.map(product => [product.id, product]));
        setProducts(prodMap);

        const productIds = Array.from(prodMap.keys());
        if (productIds.length === 0) {
          setRecords([]);
          setPrevRecords([]);
          setLoading(false);
          return;
        }

        const days = getDaysInRange(filters.dateStart, filters.dateEnd);
        const prevEnd = subDays(filters.dateStart, 1);
        const prevStart = subDays(filters.dateStart, days);

        setRecords(
          allSalesRecords.filter(
            record =>
              productIds.includes(record.product_id) &&
              record.date >= filters.dateStart &&
              record.date <= filters.dateEnd
          )
        );
        setPrevRecords(
          allSalesRecords.filter(
            record =>
              productIds.includes(record.product_id) &&
              record.date >= prevStart &&
              record.date <= prevEnd
          )
        );
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  return { records, prevRecords, products, loading };
}
