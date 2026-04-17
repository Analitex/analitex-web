import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Info, Menu, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useFilters } from '../../context/FilterContext';
import { useReportMode } from '../../context/ReportModeContext';
import { MultiSelect } from '../filters/MultiSelect';
import { DateRangePicker } from './DateRangePicker';
import type { Page } from '../../types';

interface FilterBarProps {
  currentPage: Page;
  brands: string[];
  categories: string[];
  marketplaces: string[];
  stores: string[];
  skus: { id: string; sku: string; name: string }[];
  onOpenMobileNav?: () => void;
}

const REPORT_MODE_HELP = 'Управленческий режим показывает привычные рабочие метрики сервиса.\n\nФинансовый режим нужен для бухгалтерской точности и суммы к фактическому перечислению от маркетплейса.';

function getSkuOptions(skus: { id: string; sku: string; name: string }[]) {
  return skus.map(item => ({
    value: item.id,
    label: `${item.sku} · ${item.name}`,
    searchText: `${item.sku} ${item.name}`,
  }));
}

export function FilterBar({
  currentPage,
  brands,
  categories,
  marketplaces,
  stores,
  skus,
  onOpenMobileNav,
}: FilterBarProps) {
  const { filters, setFilters, resetFilters } = useFilters();
  const { reportMode, setReportMode } = useReportMode();
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isReportModeMenuOpen, setIsReportModeMenuOpen] = useState(false);
  const reportModeRef = useRef<HTMLDivElement | null>(null);
  const supportsReportMode = currentPage === 'dashboard' || currentPage === 'summary';

  const hasActiveFilters =
    filters.marketplace.length > 0 ||
    filters.store.length > 0 ||
    filters.brand.length > 0 ||
    filters.category.length > 0 ||
    filters.sku.length > 0;

  const activeFilterCount = useMemo(
    () =>
      [
        filters.marketplace.length,
        filters.store.length,
        filters.brand.length,
        filters.category.length,
        filters.sku.length,
      ].filter(Boolean).length,
    [filters]
  );

  const skuOptions = useMemo(() => getSkuOptions(skus), [skus]);

  useEffect(() => {
    if (!isMobileSheetOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileSheetOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileSheetOpen]);

  useEffect(() => {
    if (!isReportModeMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!reportModeRef.current?.contains(event.target as Node)) {
        setIsReportModeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isReportModeMenuOpen]);

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="hidden flex-wrap items-center gap-3 md:flex">
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
            options={skuOptions}
            value={filters.sku}
            onChange={v => setFilters({ ...filters, sku: v })}
          />

          {supportsReportMode && (
            <div ref={reportModeRef} className="relative ml-auto">
              <button
                type="button"
                onClick={() => setIsReportModeMenuOpen(current => !current)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="text-xs font-medium text-slate-400">Режим</span>
                <span className="font-medium">{reportMode === 'financial' ? 'Финансовый' : 'Управленческий'}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isReportModeMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isReportModeMenuOpen && (
                <div className="absolute right-0 top-full z-[90] mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 p-3">
                    <div className="flex items-start gap-2">
                      <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
                      <div className="whitespace-pre-line text-xs leading-5 text-slate-500">{REPORT_MODE_HELP}</div>
                    </div>
                  </div>
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setReportMode('management');
                        setIsReportModeMenuOpen(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        reportMode === 'management' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Управленческий
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReportMode('financial');
                        setIsReportModeMenuOpen(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        reportMode === 'financial' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Финансовый
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <RotateCcw size={12} />
              Сбросить
            </button>
          )}
        </div>

        <div className="md:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenMobileNav}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-white"
              aria-label="Открыть навигацию"
            >
              <Menu size={18} />
            </button>

            <button
              type="button"
              onClick={() => setIsMobileSheetOpen(true)}
              className="flex min-w-0 flex-1 items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left shadow-sm transition-colors hover:border-slate-300 hover:bg-white"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                  <SlidersHorizontal size={17} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800">Фильтры</div>
                  <div className="truncate text-xs text-slate-500">
                    {activeFilterCount > 0 ? `Активно: ${activeFilterCount}` : 'Период, магазины, бренды и товары'}
                  </div>
                </div>
              </div>
              <div
                className={`ml-2 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  activeFilterCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-white text-slate-500'
                }`}
              >
                {activeFilterCount > 0 ? `${activeFilterCount}` : 'Все'}
              </div>
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-[120] md:hidden ${
          isMobileSheetOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!isMobileSheetOpen}
      >
        <button
          type="button"
          onClick={() => setIsMobileSheetOpen(false)}
          className={`absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] transition-opacity duration-300 ${
            isMobileSheetOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Закрыть фильтры"
        />

        <div
          className={`absolute inset-x-0 bottom-0 flex h-[92vh] max-h-[92vh] flex-col rounded-t-[28px] bg-white shadow-2xl transition-transform duration-300 ease-out ${
            isMobileSheetOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 pb-3 pt-4">
            <div>
              <div className="text-base font-semibold text-slate-900">Фильтры</div>
              <div className="text-xs text-slate-500">Настройте срез данных для дашборда</div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSheetOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <DateRangePicker
              start={filters.dateStart}
              end={filters.dateEnd}
              onChange={(start, end) => setFilters({ ...filters, dateStart: start, dateEnd: end })}
              fullWidth
            />

            <MultiSelect
              label="Площадки:"
              options={marketplaces}
              value={filters.marketplace}
              onChange={v => setFilters({ ...filters, marketplace: v })}
              fullWidth
            />

            <MultiSelect
              label="Магазины:"
              options={stores}
              value={filters.store}
              onChange={v => setFilters({ ...filters, store: v })}
              fullWidth
            />

            <MultiSelect
              label="Бренды:"
              options={brands}
              value={filters.brand}
              onChange={v => setFilters({ ...filters, brand: v })}
              fullWidth
            />

            <MultiSelect
              label="Категория"
              options={categories}
              value={filters.category}
              onChange={v => setFilters({ ...filters, category: v })}
              fullWidth
            />

            <MultiSelect
              label="Артикулы:"
              options={skuOptions}
              value={filters.sku}
              onChange={v => setFilters({ ...filters, sku: v })}
              fullWidth
            />
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <RotateCcw size={15} />
                Сбросить
              </button>
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Показать результаты
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
