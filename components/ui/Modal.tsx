'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from '@/lib/cx';

/**
 * Modal surface.
 *
 * §11.C — routes and behaviour are preserved; only the chrome changed.
 * New behaviour added, none removed:
 *   - Escape closes
 *   - the page behind stops scrolling while open
 *   - role="dialog" + aria-modal + a labelled heading
 *   - a real opening transition, disabled under prefers-reduced-motion
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  icon,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const firstField = panelRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button',
    );
    firstField?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-[#1a1a19]/25 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'animate-rise-in relative flex max-h-[92vh] w-full flex-col overflow-hidden bg-surface elev-2',
          'r-card sm:r-well',
          widths[size],
        )}
      >
        <header className="flex items-start gap-3 border-b border-hairline px-5 py-4">
          {icon ? (
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center r-chip bg-canvas text-ink-muted [&>svg]:h-4 [&>svg]:w-4">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-title text-ink">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="-mr-1 -mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center r-utility text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-hairline bg-canvas px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
