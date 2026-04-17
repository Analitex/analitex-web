import { useState, useEffect } from 'react';
import type { Product } from '../types';
import { products as localProducts } from '../lib/localData';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setProducts([...localProducts].sort((a, b) => a.name.localeCompare(b.name, 'ru')));
    setLoading(false);
  }, []);

  const brands = [...new Set(products.map(p => p.brand))].sort();
  const categories = [...new Set(products.map(p => p.category))].sort();
  const marketplaces = [...new Set(products.map(p => p.marketplace))].sort();
  const stores = [...new Set(products.map(p => p.store))].sort();
  const skus = products.map(p => ({ id: p.id, sku: p.sku, name: p.name }));

  return { products, loading, brands, categories, marketplaces, stores, skus };
}
