import { Info } from 'lucide-react';

export function SectionInfoTooltip({ text }: { text: string }) {
  return (
    <div className="group/tooltip relative flex shrink-0">
      <Info size={14} className="text-slate-400" />
      <div className="absolute left-0 top-full z-10 mt-2 hidden w-80 whitespace-pre-line rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm group-hover/tooltip:block">
        {text}
      </div>
    </div>
  );
}

export function SectionAlias({
  alias,
  variant = 'compact',
}: {
  alias: string;
  variant?: 'compact' | 'pill';
}) {
  const className =
    variant === 'pill'
      ? 'rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-400'
      : 'rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500';

  return <span className={className}>{alias}</span>;
}
