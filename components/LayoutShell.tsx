'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { NAV } from '@/components/nav';
import Wordmark from '@/components/Wordmark';
import { cx } from '@/lib/cx';
import { TODAY } from '@/lib/format';
import type { Profile } from '@/lib/data';

interface ShellSummary {
  name: string;
  initials: string;
  date: string;
}

/** Two-letter monogram from the profile name; falls back to a neutral mark. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'FH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [summary, setSummary] = useState<ShellSummary | null>(null);
  const pathname = usePathname();

  /* The rail shows a real snapshot, not a hardcoded one, and it refreshes
     whenever any screen writes to the JSON store. */
  const loadSummary = useCallback(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((profile: Profile) => {
        setSummary({
          name: profile.name,
          initials: initialsOf(profile.name),
          date: TODAY,
        });
      })
      .catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    loadSummary();
    const onUpdated = () => loadSummary();
    window.addEventListener('fitness-data-updated', onUpdated);
    return () => window.removeEventListener('fitness-data-updated', onUpdated);
  }, [loadSummary]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((v) => !v)}
        summary={summary}
      />

      {/* Mobile chrome: one 56px bar, hamburger opens the same nav list. */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-hairline bg-canvas/90 px-4 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileNavOpen((v) => !v)}
          aria-label={isMobileNavOpen ? 'Đóng điều hướng' : 'Mở điều hướng'}
          aria-expanded={isMobileNavOpen}
          className="flex h-9 w-9 items-center justify-center r-utility text-ink-secondary transition-colors hover:bg-black/[0.05]"
        >
          {isMobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <Link href="/" className="flex items-center gap-2">
          <Wordmark size={20} />
          <span className="text-[13px] font-semibold text-ink">Fitness Harness</span>
        </Link>
      </header>

      {isMobileNavOpen ? (
        <nav
          className="animate-rise-in sticky top-14 z-30 border-b border-hairline bg-surface px-3 py-2 lg:hidden"
          aria-label="Điều hướng di động"
        >
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cx(
                    'flex items-center justify-between r-row px-3 py-2 text-body-sm transition-colors',
                    pathname === item.href
                      ? 'bg-black/[0.05] font-semibold text-ink'
                      : 'text-ink-muted hover:bg-black/[0.03] hover:text-ink',
                  )}
                >
                  <span>{item.name}</span>
                  <ChevronRight className="h-4 w-4 text-ink-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div
        className={cx(
          'transition-[padding] duration-200',
          isCollapsed ? 'lg:pl-[60px]' : 'lg:pl-[248px]',
        )}
      >
        <main className="mx-auto max-w-container px-5 pb-28 pt-6 sm:px-8 lg:px-10 lg:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}
