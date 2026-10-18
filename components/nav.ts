import {
  LayoutDashboard,
  Salad,
  Dumbbell,
  ChartNoAxesCombined,
  Trophy,
  UserRound,
  CalendarRange,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

/**
 * §11.C — primary nav labels and routes are frozen; only the chrome and the
 * glyph set changed. Glyphs come from one allowed icon family (lucide), never
 * from emoji and never from a hand-rolled path.
 */
export const NAV: NavItem[] = [
  { name: 'Hôm nay', href: '/', icon: LayoutDashboard },
  { name: 'Dinh dưỡng', href: '/food', icon: Salad },
  { name: 'Buổi tập', href: '/workout', icon: Dumbbell },
  { name: 'Adaptive TDEE', href: '/tdee', icon: ChartNoAxesCombined },
  { name: 'Bài tập & PR', href: '/exercises', icon: Trophy },
  { name: 'Kế hoạch tuần', href: '/plan', icon: CalendarRange },
  { name: 'Hồ sơ', href: '/profile', icon: UserRound },
];
