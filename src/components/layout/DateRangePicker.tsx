import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export type CalendarDateAvailability = {
  date: string;
  state: 'complete' | 'partial' | 'available';
};

interface DateRangePickerProps {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  availableDates?: CalendarDateAvailability[];
  onVisibleRangeChange?: (start: string, end: string) => void;
  className?: string;
  fullWidth?: boolean;
  dropdownPlacement?: 'top' | 'bottom';
}

const MONTH_LABELS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

const WEEKDAY_LABELS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

const QUICK_RANGES = [
  { id: 'yesterday', label: 'Вчера', getRange: () => ({ start: shiftDays(getToday(), -1), end: shiftDays(getToday(), -1) }) },
  { id: 'last-7-days', label: '7 дней', getRange: () => ({ start: shiftDays(getToday(), -6), end: getToday() }) },
  { id: 'last-30-days', label: '30 дней', getRange: () => ({ start: shiftDays(getToday(), -29), end: getToday() }) },
  { id: 'current-month', label: 'Текущий месяц', getRange: () => ({ start: getMonthStart(getToday()), end: getToday() }) },
  { id: 'last-90-days', label: '90 дней', getRange: () => ({ start: shiftDays(getToday(), -89), end: getToday() }) },
] as const;

function getToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  const date = parseIsoDate(value);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatInputDate(value: string) {
  const date = parseIsoDate(value);
  return `${`${date.getDate()}`.padStart(2, '0')}.${`${date.getMonth() + 1}`.padStart(2, '0')}.${date.getFullYear()}`;
}

function parseInputDate(value: string) {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const [, dayStr, monthStr, yearStr] = match;
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function shiftDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getMonthDays(firstDayOfMonth: Date) {
  const month = firstDayOfMonth.getMonth();
  const cursor = new Date(firstDayOfMonth);
  const startOffset = (cursor.getDay() + 6) % 7;
  cursor.setDate(cursor.getDate() - startOffset);

  const weeks: Date[][] = [];
  while (weeks.length < 6) {
    const week: Date[] = [];
    for (let index = 0; index < 7; index += 1) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks.map(week =>
    week.map(day => ({
      date: day,
      iso: formatIsoDate(day),
      isCurrentMonth: day.getMonth() === month,
    }))
  );
}

function rangesEqual(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  return leftStart === rightStart && leftEnd === rightEnd;
}

export function DateRangePicker({
  start,
  end,
  onChange,
  availableDates = [],
  onVisibleRangeChange,
  className = '',
  fullWidth = false,
  dropdownPlacement = 'bottom',
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [localStart, setLocalStart] = useState(start);
  const [localEnd, setLocalEnd] = useState(end);
  const [startInput, setStartInput] = useState(formatInputDate(start));
  const [endInput, setEndInput] = useState(formatInputDate(end));
  const [visibleMonth, setVisibleMonth] = useState(getMonthStart(parseIsoDate(start)));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalStart(start);
    setLocalEnd(end);
    setStartInput(formatInputDate(start));
    setEndInput(formatInputDate(end));
    setVisibleMonth(getMonthStart(parseIsoDate(start)));
  }, [start, end]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!open || !onVisibleRangeChange) return;

    const nextMonth = addMonths(visibleMonth, 1);
    onVisibleRangeChange(formatIsoDate(visibleMonth), formatIsoDate(getMonthEnd(nextMonth)));
  }, [onVisibleRangeChange, open, visibleMonth]);

  const applyPreset = (preset: (typeof QUICK_RANGES)[number]) => {
    const range = preset.getRange();
    const nextStart = formatIsoDate(range.start);
    const nextEnd = formatIsoDate(range.end);
    setLocalStart(nextStart);
    setLocalEnd(nextEnd);
    setStartInput(formatInputDate(nextStart));
    setEndInput(formatInputDate(nextEnd));
    setVisibleMonth(getMonthStart(range.start));
  };

  const handleDaySelect = (dateIso: string) => {
    if (!localStart || (localStart && localEnd)) {
      setLocalStart(dateIso);
      setLocalEnd('');
      setStartInput(formatInputDate(dateIso));
      setEndInput('');
      return;
    }

    if (dateIso < localStart) {
      setLocalEnd(localStart);
      setEndInput(formatInputDate(localStart));
      setLocalStart(dateIso);
      setStartInput(formatInputDate(dateIso));
      return;
    }

    setLocalEnd(dateIso);
    setEndInput(formatInputDate(dateIso));
  };

  const syncInput = (value: string, type: 'start' | 'end') => {
    if (type === 'start') setStartInput(value);
    else setEndInput(value);

    const parsed = parseInputDate(value);
    if (!parsed) return;

    const iso = formatIsoDate(parsed);
    if (type === 'start') {
      setLocalStart(iso);
      if (localEnd && iso > localEnd) {
        setLocalEnd(iso);
        setEndInput(formatInputDate(iso));
      }
      setVisibleMonth(getMonthStart(parsed));
      return;
    }

    setLocalEnd(iso);
    if (localStart && iso < localStart) {
      setLocalStart(iso);
      setStartInput(formatInputDate(iso));
      setVisibleMonth(getMonthStart(parsed));
    }
  };

  const resetDraft = () => {
    setLocalStart(start);
    setLocalEnd(end);
    setStartInput(formatInputDate(start));
    setEndInput(formatInputDate(end));
    setVisibleMonth(getMonthStart(parseIsoDate(start)));
  };

  const apply = () => {
    if (!localStart || !localEnd || localStart > localEnd) return;
    onChange(localStart, localEnd);
    setOpen(false);
  };

  const firstMonth = visibleMonth;
  const secondMonth = addMonths(visibleMonth, 1);
  const firstMonthDays = getMonthDays(firstMonth);
  const secondMonthDays = getMonthDays(secondMonth);
  const availabilityByDate = new Map(availableDates.map(day => [day.date, day.state]));
  const isApplyDisabled = !localStart || !localEnd || localStart > localEnd;

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`.trim()} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 ${
          fullWidth ? 'w-full justify-between' : ''
        }`}
      >
        <Calendar size={14} className="text-slate-400" />
        <span className={`font-medium ${fullWidth ? 'min-w-0 flex-1 text-left' : ''}`}>
          {formatDisplayDate(start)} – {formatDisplayDate(end)}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className={`absolute left-0 z-50 max-h-[calc(100vh-140px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl ${
            dropdownPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${
            fullWidth ? 'w-full min-w-0' : 'w-max max-w-[calc(100vw-32px)]'
          }`}
        >
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap gap-2">
              {QUICK_RANGES.map(preset => {
                const range = preset.getRange();
                const presetStart = formatIsoDate(range.start);
                const presetEnd = formatIsoDate(range.end);
                const isActive = rangesEqual(localStart, localEnd, presetStart, presetEnd);

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                      isActive
                        ? 'border-blue-200 bg-blue-50 text-blue-700 ring-1 ring-blue-500/40'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 inline-block max-w-full rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="space-y-1 sm:w-[168px]">
                  <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">От</span>
                  <input
                    value={startInput}
                    onChange={event => syncInput(event.target.value, 'start')}
                    placeholder="дд.мм.гггг"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-300"
                  />
                </label>
                <label className="space-y-1 sm:w-[168px]">
                  <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">До</span>
                  <input
                    value={endInput}
                    onChange={event => syncInput(event.target.value, 'end')}
                    placeholder="дд.мм.гггг"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-300"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 p-4 xl:px-5 xl:pb-3 xl:pt-4">
            <div className="xl:hidden">
              <MonthPanel
                month={firstMonth}
                weeks={firstMonthDays}
                onPrev={() => setVisibleMonth(current => addMonths(current, -1))}
                onNext={() => setVisibleMonth(current => addMonths(current, 1))}
                onSelect={handleDaySelect}
                rangeStart={localStart}
                rangeEnd={localEnd}
                availabilityByDate={availabilityByDate}
                showPrev
                showNext
              />
            </div>
            <div className="hidden xl:flex xl:flex-row xl:gap-6">
              <MonthPanel
                month={firstMonth}
                weeks={firstMonthDays}
                onPrev={() => setVisibleMonth(current => addMonths(current, -1))}
                onSelect={handleDaySelect}
                rangeStart={localStart}
                rangeEnd={localEnd}
                availabilityByDate={availabilityByDate}
                showPrev
              />
              <MonthPanel
                month={secondMonth}
                weeks={secondMonthDays}
                onNext={() => setVisibleMonth(current => addMonths(current, 1))}
                onSelect={handleDaySelect}
                rangeStart={localStart}
                rangeEnd={localEnd}
                availabilityByDate={availabilityByDate}
                showNext
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              {localStart && localEnd ? `${formatInputDate(localStart)} - ${formatInputDate(localEnd)}` : 'Выберите диапазон'}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resetDraft}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={isApplyDisabled}
                className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthPanel({
  month,
  weeks,
  onPrev,
  onNext,
  onSelect,
  rangeStart,
  rangeEnd,
  availabilityByDate,
  showPrev = false,
  showNext = false,
}: {
  month: Date;
  weeks: Array<Array<{ date: Date; iso: string; isCurrentMonth: boolean }>>;
  onPrev?: () => void;
  onNext?: () => void;
  onSelect: (iso: string) => void;
  rangeStart: string;
  rangeEnd: string;
  availabilityByDate: Map<string, CalendarDateAvailability['state']>;
  showPrev?: boolean;
  showNext?: boolean;
}) {
  const label = `${MONTH_LABELS[month.getMonth()]} ${month.getFullYear()}`;

  return (
    <div className="space-y-4">
      <div className="relative flex items-center justify-center pt-1">
        {showPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <div className="text-sm font-medium text-slate-800">{label}</div>
        {showNext && (
          <button
            type="button"
            onClick={onNext}
            className="absolute right-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Следующий месяц"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="flex text-slate-400">
            {WEEKDAY_LABELS.map(day => (
              <th key={day} className="w-9 rounded-md text-[0.8rem] font-normal">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={`${label}-${weekIndex}`} className="mt-2 flex w-full">
              {week.map(day => {
                const isSelectedStart = day.isCurrentMonth && day.iso === rangeStart;
                const isSelectedEnd = day.isCurrentMonth && day.iso === rangeEnd;
                const isInRange = day.isCurrentMonth && Boolean(rangeStart && rangeEnd && day.iso >= rangeStart && day.iso <= rangeEnd);
                const isSingleDay = isSelectedStart && isSelectedEnd;
                const availabilityState = day.isCurrentMonth ? availabilityByDate.get(day.iso) : undefined;

                return (
                  <td
                    key={day.iso}
                    className={`relative h-9 w-9 p-0 text-center text-sm ${
                      isInRange && !isSingleDay ? 'bg-blue-100/70' : ''
                    } ${isSelectedStart ? 'rounded-l-md' : ''} ${isSelectedEnd ? 'rounded-r-md' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(day.iso)}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors ${
                        isSelectedStart || isSelectedEnd
                          ? 'bg-blue-700 font-medium text-white'
                          : isInRange
                          ? 'bg-transparent text-blue-800'
                          : day.isCurrentMonth
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {day.date.getDate()}
                      {availabilityState && (
                        <span
                          className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${
                            isSelectedStart || isSelectedEnd
                              ? 'bg-white'
                              : availabilityState === 'complete'
                                ? 'bg-emerald-500'
                                : availabilityState === 'partial'
                                  ? 'bg-amber-500'
                                  : 'bg-sky-500'
                          }`}
                        />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
