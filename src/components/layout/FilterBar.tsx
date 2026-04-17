import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useFilters } from '../../context/FilterContext';
import { DateRangePicker } from './DateRangePicker';
import { MultiSelect } from '../filters/MultiSelect';

interface FilterBarProps {
  brands: string[];
  categories: string[];
  marketplaces: string[];
  stores: string[];
  skus: { id: string; sku: string; name: string }[];
}

export function FilterBar({ brands, categories, marketplaces, stores, skus }: FilterBarProps) {
  const { filters, setFilters, resetFilters } = useFilters();

  const hasActiveFilters =
    filters.marketplace.length > 0 ||
    filters.store.length > 0 ||
    filters.brand.length > 0 ||
    filters.category.length > 0 ||
    filters.sku.length > 0;

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-slate-500 mr-1">
          <SlidersHorizontal size={15} />
          <span className="text-sm font-medium text-slate-600">Фильтры</span>
        </div>

        <DateRangePicker
          start={filters.dateStart}
          end={filters.dateEnd}
          onChange={(start, end) => setFilters({ ...filters, dateStart: start, dateEnd: end })}
        />

        <MultiSelect
          label="Площадки:"
          options={marketplaces}
          value={filters.marketplace}
          onChange={v => setFilters({ ...filters, marketplace: v })}
        />

        <MultiSelect
          label="Магазины:"
          options={stores}
          value={filters.store}
          onChange={v => setFilters({ ...filters, store: v })}
        />

        <MultiSelect
          label="Бренды:"
          options={brands}
          value={filters.brand}
          onChange={v => setFilters({ ...filters, brand: v })}
        />

        <MultiSelect
          label="Категория"
          options={categories}
          value={filters.category}
          onChange={v => setFilters({ ...filters, category: v })}
        />

        <MultiSelect
          label="Артикулы:"
          options={skus.map(item => ({
            value: item.id,
            label: `${item.sku} · ${item.name}`,
            searchText: `${item.sku} ${item.name}`,
          }))}
          value={filters.sku}
          onChange={v => setFilters({ ...filters, sku: v })}
          placeholder="Выберите"
        />

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-auto"
          >
            <RotateCcw size={12} />
            Сбросить
          </button>
        )}
      </div>
    </div>
  );
}
