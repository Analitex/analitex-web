import { useState, useRef, useEffect, useMemo, type MouseEvent as ReactMouseEvent, type KeyboardEvent } from 'react';
import { ChevronDown, X, Check, Search } from 'lucide-react';

export interface MultiSelectOption {
  label: string;
  value: string;
  searchText?: string;
}

interface MultiSelectProps {
  label: string;
  options: Array<string | MultiSelectOption>;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  fullWidth?: boolean;
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  className = '',
  fullWidth = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const normalizedOptions = useMemo(
    () =>
      options.map(option =>
        typeof option === 'string'
          ? { label: option, value: option, searchText: option.toLowerCase() }
          : {
              label: option.label,
              value: option.value,
              searchText: (option.searchText ?? option.label).toLowerCase(),
            }
      ),
    [options]
  );

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return normalizedOptions;

    return normalizedOptions.filter(option => option.searchText.includes(query));
  }, [normalizedOptions, search]);

  const selectedCount = value.length;
  const filteredValues = filteredOptions.map(option => option.value);
  const areAllFilteredSelected =
    filteredValues.length > 0 && filteredValues.every(optionValue => value.includes(optionValue));

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) onChange(value.filter(v => v !== optionValue));
    else onChange([...value, optionValue]);
  };

  const toggleAll = () => {
    if (areAllFilteredSelected) {
      onChange(value.filter(optionValue => !filteredValues.includes(optionValue)));
      return;
    }

    onChange([...new Set([...value, ...filteredValues])]);
  };

  const clear = (e: ReactMouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const displayText = selectedCount === 0
    ? (placeholder ?? ``)
    : selectedCount === 1
    ? '1'
    : `${selectedCount}`;

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`.trim()} ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (open) setSearch('');
        }}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors whitespace-nowrap ${
          fullWidth ? 'w-full min-w-0' : 'min-w-[120px]'
        } ${
          selectedCount > 0
            ? 'border-blue-400 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <span className="text-xs font-medium text-slate-400 shrink-0">{label}</span>
        <span className={`font-medium truncate ${fullWidth ? 'max-w-none flex-1 text-left' : 'max-w-[100px]'}`}>{displayText}</span>
        {selectedCount > 0 ? (
          <span
            role="button"
            tabIndex={0}
            onClick={clear}
            onKeyDown={(e: KeyboardEvent<HTMLSpanElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onChange([]);
              }
            }}
            className="ml-auto text-blue-400 hover:text-blue-600 shrink-0"
          >
            <X size={12} />
          </span>
        ) : (
          <ChevronDown size={14} className={`ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && normalizedOptions.length > 0 && (
        <div className={`absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden ${
          fullWidth ? 'w-full min-w-0' : 'min-w-[260px]'
        }`}>
          <div className="p-2 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск"
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
              />
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <span>{areAllFilteredSelected ? 'Снять все' : 'Выбрать все'}</span>
              <span className="text-xs text-slate-400">{filteredOptions.length}</span>
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-slate-400">Ничего не найдено</div>
            )}

            {filteredOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  value.includes(opt.value) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                }`}>
                  {value.includes(opt.value) && <Check size={10} className="text-white" />}
                </div>
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
