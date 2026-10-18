import type { CalendarDays } from 'lucide-react';

/** One row of the Notion-style property list. */
export default function PropertyRow({
  icon: Icon,
  label,
  value,
  meta,
  action,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <dt className="flex items-center gap-1.5 text-[12px] text-ink-faint">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
          {label}
        </dt>
        <dd className="mt-1 truncate font-metric text-[15px] font-semibold text-ink">{value}</dd>
        {meta ? <dd className="mt-0.5 truncate text-[12px] text-ink-muted">{meta}</dd> : null}
      </div>
      {action ? <div className="flex-shrink-0 pt-0.5">{action}</div> : null}
    </div>
  );
}
