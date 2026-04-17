import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface DateRangePickerProps {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}

const presets = [
  { label: '7 дней', days: 7 },
  { label: '14 дней', days: 14 },
  { label: '28 дней', days: 28 },
  { label: '90 дней', days: 90 },
];

function formatDate(str: string): string {
  const d = new Date(str);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function DateRangePicker({ start, end, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [localStart, setLocalStart] = useState(start);
  const [localEnd, setLocalEnd] = useState(end);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const applyPreset = (days: number) => {
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);
    const startStr = startDate.toISOString().split('T')[0];
    onChange(startStr, endStr);
    setLocalStart(startStr);
    setLocalEnd(endStr);
    setOpen(false);
  };

  const apply = () => {
    if (localStart && localEnd && localStart <= localEnd) {
      onChange(localStart, localEnd);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
      >
        <Calendar size={14} className="text-slate-400" />
        <span className="font-medium">
          {formatDate(start)} – {formatDate(end)}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4 min-w-[320px]">
          <div className="flex gap-2 mb-4">
            {presets.map(p => (
              <button
                key={p.days}
                onClick={() => applyPreset(p.days)}
                className="flex-1 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Начало</label>
              <input
                type="date"
                value={localStart}
                onChange={e => setLocalStart(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Конец</label>
              <input
                type="date"
                value={localEnd}
                onChange={e => setLocalEnd(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={apply}
            className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Применить
          </button>
        </div>
      )}
    </div>
  );
}
