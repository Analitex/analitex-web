import { useState, useEffect } from 'react';
import type { FilterState, PlanFactRow } from '../types';

export function usePlanFactData(filters: FilterState) {
  const [rows, setRows] = useState<PlanFactRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void filters;
    setRows([]);
    setLoading(false);
  }, [filters]);

  return { rows, loading };
}
