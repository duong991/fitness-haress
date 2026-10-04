/**
 * Small formatting helpers shared by every screen.
 * No design decisions live here — only presentation of data.
 */

const WEEKDAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

/** The dashboard's canonical anchor: the day the seed data was authored. */
export const TODAY = '2026-10-04';

/** ISO date -> short Vietnamese label, e.g. "Thứ tư 04/10". */
export function formatDateLong(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${WEEKDAYS[d.getDay()]} ${dd}/${mm}`;
}

/** ISO date -> "04/10" for chart axes and dense table cells. */
export function formatDateShort(iso: string): string {
  return iso.slice(5).split('-').reverse().join('/');
}

/** Human relative label for the date switcher. */
export function relativeDayLabel(iso: string): string {
  const diff = daysBetween(TODAY, iso);
  if (diff === 0) return 'Hôm nay';
  if (diff === -1) return 'Hôm qua';
  if (diff === 1) return 'Ngày mai';
  return diff < 0 ? `${Math.abs(diff)} ngày trước` : `${diff} ngày tới`;
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

/** Shift an ISO date by whole days, returned as ISO. */
export function shiftDay(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Compact number, thousands separated, no locale surprises. */
export function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString('en-US') : '0';
}

/** Round to one decimal without trailing ".0". */
export function formatDecimal(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Number(value.toFixed(digits));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits);
}

/** Epley one-rep-max estimate. */
export function estimate1RM(weightKg: number, reps: number): number {
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}
