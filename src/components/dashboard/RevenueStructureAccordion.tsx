import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../lib/calculations';
import { SectionAlias, SectionInfoTooltip } from './DashboardSectionMeta';

export interface RevenueStructureRow {
  label: string;
  value: number;
  percent: number;
  color: string;
  description?: string;
}

export function RevenueStructureAccordion({ items }: { items: RevenueStructureRow[] }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const maxValue = Math.max(...items.map(item => Math.abs(item.percent)), 5);
  const axisMax = Math.ceil(maxValue / 5) * 5;
  const axisMarks = Array.from({ length: axisMax * 2 / 5 + 1 }, (_, index) => -axisMax + index * 5);

  return (
    <div className="h-fit divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
      <h2>
        <button
          type="button"
          onClick={() => setIsExpanded(current => !current)}
          className="flex w-full items-center justify-between p-5 text-left font-medium text-slate-900 transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center gap-2">
            <span>Структура выручки</span>
            <SectionAlias alias="revenue-structure" variant="pill" />
            <SectionInfoTooltip text="Рассчитывается в процентах от выручки и показывает, какие статьи формируют итоговую экономику." />
          </div>
          <ChevronDown
            size={18}
            className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </h2>

      {isExpanded && (
        <div className="bg-white p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_96px]">
            <div className="space-y-1">
              {items.map(item => {
                const width = `${(Math.abs(item.percent) / axisMax) * 50}%`;

                return (
                  <div key={item.label} className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                    <div className="truncate text-xs text-slate-600 sm:text-sm">{item.label}</div>
                    <div className="relative h-7 overflow-hidden bg-slate-50/70 first:rounded-t-md last:rounded-b-md">
                      {axisMarks.map(mark => {
                        const position = ((mark + axisMax) / (axisMax * 2)) * 100;
                        return (
                          <div
                            key={mark}
                            className={`absolute inset-y-0 w-px -translate-x-1/2 ${
                              mark === 0 ? 'bg-slate-300' : 'bg-slate-200/80'
                            }`}
                            style={{ left: `${position}%` }}
                          />
                        );
                      })}
                      <div className="absolute inset-x-0 bottom-0 h-px bg-slate-200/70" />
                      <div
                        className="absolute top-1/2 h-5 -translate-y-1/2 rounded-md opacity-90"
                        style={{
                          width,
                          backgroundColor: item.color,
                          left: item.percent >= 0 ? '50%' : undefined,
                          right: item.percent < 0 ? '50%' : undefined,
                        }}
                        title={`${item.label}: ${formatCurrency(item.value)} / ${item.percent.toFixed(2)}%${item.description ? `\n${item.description}` : ''}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="my-0.5 flex flex-col justify-between gap-1 text-right text-xs text-slate-500 sm:text-sm">
              {items.map(item => (
                <div key={item.label} className="h-7 leading-7" style={{ color: item.color }}>
                  {formatCurrencyDetailed(item.value)}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-0 grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
            <div />
            <div className="border-t border-slate-200 pt-1">
              <div className="grid text-[10px] text-slate-400" style={{ gridTemplateColumns: `repeat(${axisMarks.length}, minmax(0, 1fr))` }}>
                {axisMarks.map(mark => (
                  <div
                    key={mark}
                    className={
                      mark === -axisMax
                        ? 'text-left'
                        : mark === axisMax
                        ? 'text-right'
                        : 'text-center'
                    }
                  >
                    {mark}%
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrencyDetailed(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
