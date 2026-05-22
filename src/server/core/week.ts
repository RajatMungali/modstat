// ── ISO-style week keys for Redis namespacing ─────────────────────────────

export const WEEK_DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export function getWeekKeyForDate(date: Date): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((date.getTime() - startOfYear.getTime()) / 86400000 +
      startOfYear.getDay() +
      1) /
      7
  );
  return `week:${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** `weekOffset` 0 = current week, -1 = previous week, etc. */
export function getWeekKeyForWeekOffset(weekOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + weekOffset * 7);
  return getWeekKeyForDate(date);
}

export function getWeekKey(): string {
  return getWeekKeyForWeekOffset(0);
}

export function getPrevWeekKey(): string {
  return getWeekKeyForWeekOffset(-1);
}

export function getDayName(): string {
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ] as const;
  return days[new Date().getDay()] ?? 'Sunday';
}
