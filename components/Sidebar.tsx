'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  Salad,
  Dumbbell,
  ChartNoAxesCombined,
  Trophy,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { cx } from '@/lib/cx';
import Wordmark from '@/components/Wordmark';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  /** Profile snapshot, passed down so the rail never hardcodes numbers. */
  summary: {
    name: string;
    initials: string;
    date: string;
  } | null;
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

/**
 * §11.C — primary nav labels and routes are frozen; only the chrome and the
 * glyph set changed. Glyphs come from one allowed icon family (lucide), never
 * from emoji and never from a hand-rolled path.
 */
const NAV: NavItem[] = [
  { name: 'Hôm nay', href: '/', icon: LayoutDashboard },
  { name: 'Dinh dưỡng', href: '/food', icon: Salad },
  { name: 'Buổi tập', href: '/workout', icon: Dumbbell },
  { name: 'Adaptive TDEE', href: '/tdee', icon: ChartNoAxesCombined },
  { name: 'Bài tập & PR', href: '/exercises', icon: Trophy },
  { name: 'Hồ sơ', href: '/profile', icon: UserRound },
];

export default function Sidebar({ isCollapsed, onToggleCollapse, summary }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cx(
        'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-hairline bg-canvas transition-[width] duration-200 lg:flex',
        isCollapsed ? 'w-[60px]' : 'w-[248px]',
      )}
    >
      <div className="flex h-14 items-center gap-2 px-3">
        {!isCollapsed ? (
          <>
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2.5 r-row px-1.5 py-1.5 transition-colors hover:bg-black/[0.04]"
            >
              <Wordmark size={22} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold leading-tight text-ink">
                  Fitness Harness
                </span>
                <span className="block truncate text-[11px] leading-tight text-ink-faint">
                  Học viên Gym
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Thu gọn thanh điều hướng"
              className="ml-auto flex h-7 w-7 flex-shrink-0 items-center justify-center r-row text-ink-faint transition-colors hover:bg-black/[0.05] hover:text-ink"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Mở rộng thanh điều hướng"
            className="mx-auto flex h-9 w-9 items-center justify-center r-row transition-colors hover:bg-black/[0.05]"
          >
            <Wordmark size={20} />
          </button>
        )}
      </div>

      <nav className="mt-1 flex-1 px-2" aria-label="Điều hướng chính">
        <p
          className={cx(
            'px-2 pb-1.5 pt-3 text-eyebrow uppercase text-ink-faint',
            isCollapsed && 'sr-only',
          )}
        >
          Không gian làm việc
        </p>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  title={isCollapsed ? item.name : undefined}
                  className={cx(
                    'group flex items-center gap-2.5 r-row py-1.5 text-[13px] transition-colors',
                    isCollapsed ? 'justify-center px-0' : 'px-2',
                    active
                      ? 'bg-black/[0.055] font-semibold text-ink'
                      : 'text-ink-muted hover:bg-black/[0.035] hover:text-ink',
                  )}
                >
                  <Icon
                    className={cx(
                      'h-4 w-4 flex-shrink-0',
                      active ? 'text-ink' : 'text-ink-faint group-hover:text-ink-muted',
                    )}
                    strokeWidth={1.75}
                  />
                  {!isCollapsed ? <span className="truncate">{item.name}</span> : null}
                  {/* R3 — the active signal is the brand blue, and it is the
                      only place blue appears inside the rail. */}
                  {active && !isCollapsed ? (
                    <span className="ml-auto h-1.5 w-1.5 flex-shrink-0 r-chip bg-primary" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-hairline p-3">
        {summary && !isCollapsed ? (
          <div className="flex items-center gap-2.5 r-row px-1 py-1.5">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center r-chip bg-night text-[11px] font-semibold text-white">
              {summary.initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-ink-secondary">
                {summary.name}
              </span>
              <span className="block truncate font-metric text-[11px] text-ink-faint">
                Dữ liệu ngày {summary.date}
              </span>
            </span>
          </div>
        ) : (
          <p className={cx('text-eyebrow uppercase text-ink-faint', isCollapsed && 'sr-only')}>
            data/*.json
          </p>
        )}
      </div>
    </aside>
  );
}
