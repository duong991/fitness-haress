'use client';

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cx } from '@/lib/cx';

/* §4.6 — label ABOVE the input, helper text optional, error text BELOW.
   §4.2 — one accent, so focus paints the brand blue, never a random colour.
   R6 — form fields stay tight at 4px radius. Never pill. */

const FIELD_BASE =
  'w-full bg-surface border text-ink text-body-sm r-input px-3 py-2 ' +
  'transition-[border-color,box-shadow] duration-150 ' +
  'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 ' +
  'disabled:bg-canvas disabled:text-ink-faint';

function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-secondary">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] leading-snug text-bad">{error}</p>
      ) : hint ? (
        <p className="text-[12px] leading-snug text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
} & InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} className={className}>
      <input id={inputId} className={FIELD_BASE} {...rest} />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  id,
  children,
  ...rest
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  const selectId = id ?? `select-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <FieldShell label={label} htmlFor={selectId} hint={hint} error={error} className={className}>
      <select id={selectId} className={cx(FIELD_BASE, 'appearance-none pr-8')} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const areaId = id ?? `area-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <FieldShell label={label} htmlFor={areaId} hint={hint} error={error} className={className}>
      <textarea id={areaId} className={cx(FIELD_BASE, 'resize-y')} {...rest} />
    </FieldShell>
  );
}

export { FIELD_BASE };
