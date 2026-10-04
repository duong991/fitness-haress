'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Flame, 
  Dumbbell, 
  TrendingUp, 
  User, 
  UtensilsCrossed, 
  Trophy,
  Activity
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Tổng Quan', href: '/', icon: Flame },
    { label: 'Dinh Dưỡng', href: '/food', icon: UtensilsCrossed },
    { label: 'Buổi Tập', href: '/workout', icon: Dumbbell },
    { label: 'Adaptive TDEE', href: '/tdee', icon: TrendingUp },
    { label: 'Bài Tập & PR', href: '/exercises', icon: Trophy },
    { label: 'Hồ Sơ', href: '/profile', icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-neon-lime/10 border border-neon-lime/30 flex items-center justify-center text-neon-lime group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-white text-base">FITNESS</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-neon-lime text-black font-bold uppercase tracking-wider">HARNESS</span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono">Agent-Native Gym & Calorie Tracker</p>
          </div>
        </Link>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-neon-lime border border-neon-lime/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-neon-lime' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-neon-lime animate-pulse"></span>
            <span className="text-zinc-300 font-mono">2026-10-04</span>
          </div>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center justify-around border-t border-surface-border bg-surface py-2 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded text-[11px] ${
                isActive ? 'text-neon-lime font-bold' : 'text-zinc-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
