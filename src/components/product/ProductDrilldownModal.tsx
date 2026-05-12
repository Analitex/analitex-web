import { X } from 'lucide-react';
import type { ProductDrilldownData } from '../../hooks/useProductDrilldownData';
import { formatCurrency, formatNumber } from '../../lib/calculations';

function getRecentAverage(values: Array<number | null | undefined>) {
  const normalized = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (normalized.length === 0) return 0;
  return normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
}

interface ProductDrilldownModalProps {
  open: boolean;
  fallbackName: string;
  fallbackProductId: string;
  drilldown: ProductDrilldownData;
  onClose: () => void;
}

export function ProductDrilldownModal({ open, fallbackName, fallbackProductId, drilldown, onClose }: ProductDrilldownModalProps) {
  if (!open) return null;

  const stockHistorySeries = drilldown.stockHistory?.series ?? [];
  const trafficHistorySeries = drilldown.trafficHistory?.series ?? [];
  const stockSourceItems = drilldown.stockSources?.items ?? [];
  const groupedBreakdowns = Object.entries(drilldown.groupedBreakdowns?.metricBreakdowns ?? {}).filter(([, items]) => (items ?? []).length > 0);
  const avgDailyOrderedUnits = getRecentAverage(trafficHistorySeries.map(point => point.orderedUnits));
  const avgDailyViews = getRecentAverage(trafficHistorySeries.map(point => point.hitsView));

  return (
    <div
      className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-950/45 p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[88vh] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="text-sm font-medium text-blue-600">Детализация товара</div>
            <h3 className="text-2xl font-semibold text-slate-900">{drilldown.details?.product?.productName ?? fallbackName}</h3>
            <div className="mt-1 text-sm text-slate-500">
              {(drilldown.details?.product?.vendorCode || fallbackProductId) ?? '—'}
              {drilldown.details?.product?.marketplaceArticle ? ` · ${drilldown.details.product.marketplaceArticle}` : ''}
              {drilldown.details?.meta?.updatedAt ? ` · обновлено ${new Date(drilldown.details.meta.updatedAt).toLocaleString('ru-RU')}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(88vh-92px)] overflow-y-auto px-6 py-5">
          {drilldown.loading && (
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          )}

          {drilldown.error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {drilldown.error}
            </div>
          )}

          {!drilldown.loading && !drilldown.error && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: 'Продажи', value: formatCurrency(Number(drilldown.details?.summary?.sales ?? 0), true) },
                  { label: 'Прибыль', value: formatCurrency(Number(drilldown.details?.summary?.profit ?? 0), true) },
                  { label: 'Заказы', value: formatNumber(Number(drilldown.details?.summary?.ordersCount ?? 0)) },
                  { label: 'Остаток', value: formatNumber(Number(drilldown.details?.summary?.stockBalance ?? 0)) },
                ].map(item => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-xs text-slate-500">{item.label}</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-6">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="text-sm font-semibold text-slate-900">Структура по метрике {drilldown.details?.metric ?? 'profit'}</div>
                    <div className="mt-3 space-y-3">
                      {(drilldown.details?.breakdown ?? []).length === 0 ? (
                        <div className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Нет детализации для выбранного товара.</div>
                      ) : (
                        (drilldown.details?.breakdown ?? []).map((item, index) => (
                          <div key={`${item.key ?? item.label ?? 'item'}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                            <div className="text-sm font-medium text-slate-900">{item.label ?? item.key ?? `Пункт ${index + 1}`}</div>
                            <div className="text-sm font-semibold text-slate-700">{formatCurrency(Number(item.amount ?? 0), true)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="text-sm font-semibold text-slate-900">История остатков</div>
                    <div className="mt-3 space-y-2">
                      {stockHistorySeries.length === 0 ? (
                        <div className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">История остатков пока недоступна.</div>
                      ) : (
                        stockHistorySeries.slice(-10).reverse().map((point, index) => (
                          <div key={`${point.date ?? 'stock'}-${index}`} className="grid grid-cols-[110px_repeat(4,minmax(0,1fr))] gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                            <div className="font-medium text-slate-900">{point.date ?? '—'}</div>
                            <div className="text-slate-600">Всего: {formatNumber(Number(point.quantity ?? 0))}</div>
                            <div className="text-slate-600">МП: {formatNumber(Number(point.marketplaceQty ?? 0))}</div>
                            <div className="text-slate-600">Мои: {formatNumber(Number(point.userWarehouseQty ?? 0))}</div>
                            <div className="text-slate-600">В пути: {formatNumber(Number(point.inWayToClientQty ?? 0) + Number(point.inWayFromClientQty ?? 0))}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="text-sm font-semibold text-slate-900">Источники остатков</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      {[
                        { label: 'Всего', value: formatNumber(Number(drilldown.stockSources?.summary?.totalQuantity ?? 0)) },
                        { label: 'Источников', value: formatNumber(Number(drilldown.stockSources?.summary?.distinctSources ?? 0)) },
                        { label: 'Регионов', value: formatNumber(Number(drilldown.stockSources?.summary?.distinctRegions ?? 0)) },
                      ].map(item => (
                        <div key={item.label} className="rounded-xl bg-slate-50 px-4 py-3">
                          <div className="text-xs text-slate-500">{item.label}</div>
                          <div className="mt-1 text-base font-semibold text-slate-900">{item.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 space-y-2">
                      {stockSourceItems.length === 0 ? (
                        <div className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Источниковые остатки пока недоступны.</div>
                      ) : (
                        stockSourceItems.slice(0, 8).map((item, index) => (
                          <div key={`${item.sourceKey ?? item.sourceName ?? 'source'}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-900">{item.sourceName ?? item.sourceLabel ?? 'Источник'}</div>
                              <div className="truncate text-slate-500">{item.regionName ?? item.sourceType ?? '—'}</div>
                            </div>
                            <div className="font-semibold text-slate-700">{formatNumber(Number(item.quantity ?? 0))}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="text-sm font-semibold text-slate-900">Групповая детализация</div>
                    <div className="mt-3 space-y-4">
                      {groupedBreakdowns.length === 0 ? (
                        <div className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Групповая детализация пока недоступна.</div>
                      ) : (
                        groupedBreakdowns.slice(0, 4).map(([metric, items]) => (
                          <div key={metric} className="rounded-xl bg-slate-50 px-4 py-4">
                            <div className="text-sm font-semibold text-slate-900">{metric}</div>
                            <div className="mt-2 space-y-2">
                              {(items ?? []).slice(0, 4).map((item, index) => (
                                <div key={`${item.key ?? item.label ?? metric}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                                  <span className="text-slate-600">{item.label ?? item.key ?? '—'}</span>
                                  <span className="font-medium text-slate-900">{formatCurrency(Number(item.amount ?? 0), true)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="text-sm font-semibold text-slate-900">Трафик и воронка</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                      <div className="rounded-xl bg-slate-50 px-4 py-3">
                        <div className="text-xs text-slate-500">Средние за день за период</div>
                        <div className="mt-2 text-sm text-slate-700">Просмотры: <span className="font-semibold text-slate-900">{formatNumber(avgDailyViews)}</span></div>
                        <div className="mt-1 text-sm text-slate-700">Заказы: <span className="font-semibold text-slate-900">{formatNumber(avgDailyOrderedUnits)}</span></div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-4 py-3">
                        <div className="text-xs text-slate-500">Последняя точка</div>
                        <div className="mt-2 text-sm text-slate-700">
                          {trafficHistorySeries.length === 0 ? 'Нет данных' : trafficHistorySeries[trafficHistorySeries.length - 1]?.date ?? '—'}
                        </div>
                        <div className="mt-1 text-sm text-slate-700">
                          Конверсия в корзину: <span className="font-semibold text-slate-900">{Number(trafficHistorySeries[trafficHistorySeries.length - 1]?.convToCart ?? 0).toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {trafficHistorySeries.length === 0 ? (
                        <div className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Трафик по товару пока не доступен.</div>
                      ) : (
                        trafficHistorySeries.slice(-7).reverse().map((point, index) => (
                          <div key={`${point.date ?? 'traffic'}-${index}`} className="grid grid-cols-[96px_repeat(4,minmax(0,1fr))] gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                            <div className="font-medium text-slate-900">{point.date ?? '—'}</div>
                            <div className="text-slate-600">Views: {formatNumber(Number(point.hitsView ?? 0))}</div>
                            <div className="text-slate-600">Cart: {formatNumber(Number(point.hitsToCart ?? 0))}</div>
                            <div className="text-slate-600">Orders: {formatNumber(Number(point.orderedUnits ?? 0))}</div>
                            <div className="text-slate-600">Conv: {Number(point.convToCart ?? 0).toFixed(2)}%</div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
