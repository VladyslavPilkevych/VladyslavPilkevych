const MS_PER_DAY = 86_400_000;

const MONTH_ABBREVIATIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

export function parseCalendarDate(value: string): CalendarDate {
  const match = ISO_DATE.exec(value);
  if (!match) {
    throw new Error(`Invalid calendar date: ${value}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid calendar date: ${value}`);
  }
  return { year, month, day };
}

export function toUtcTimestamp(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}

export function fromUtcTimestamp(timestamp: number): CalendarDate {
  const date = new Date(timestamp);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function formatCalendarDate(date: CalendarDate): string {
  const month = String(date.month).padStart(2, '0');
  const day = String(date.day).padStart(2, '0');
  return `${date.year}-${month}-${day}`;
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return fromUtcTimestamp(toUtcTimestamp(date) + days * MS_PER_DAY);
}

export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return Math.round((toUtcTimestamp(to) - toUtcTimestamp(from)) / MS_PER_DAY);
}

export function weekdayIndex(date: CalendarDate): number {
  return new Date(toUtcTimestamp(date)).getUTCDay();
}

export function monthAbbreviation(month: number): string {
  return MONTH_ABBREVIATIONS[month - 1] ?? '???';
}

export function formatHumanDate(value: string): string {
  const date = parseCalendarDate(value);
  return `${monthAbbreviation(date.month)} ${String(date.day).padStart(2, '0')}, ${date.year}`;
}

export function formatShortDate(value: string): string {
  const date = parseCalendarDate(value);
  return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}`;
}

export interface DurationParts {
  years: number;
  months: number;
  days: number;
}

export function addMonthsClamped(date: CalendarDate, months: number): CalendarDate {
  const total = date.year * 12 + (date.month - 1) + months;
  const year = Math.floor(total / 12);
  const month = total - year * 12 + 1;
  return { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
}

export function calendarDifference(from: CalendarDate, to: CalendarDate): DurationParts {
  if (toUtcTimestamp(to) < toUtcTimestamp(from)) {
    return { years: 0, months: 0, days: 0 };
  }
  let totalMonths = (to.year - from.year) * 12 + (to.month - from.month);
  let anchor = addMonthsClamped(from, totalMonths);
  if (toUtcTimestamp(anchor) > toUtcTimestamp(to)) {
    totalMonths -= 1;
    anchor = addMonthsClamped(from, totalMonths);
  }
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days: daysBetween(anchor, to),
  };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function formatUptime(fromIso: string, toIso: string): string {
  const from = parseCalendarDate(fromIso);
  const to = parseCalendarDate(toIso);
  const { years, months, days } = calendarDifference(from, to);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  if (days > 0 || parts.length === 0) parts.push(`${days}d`);
  return parts.join(' ');
}

export function todayInUtc(reference: Date = new Date()): CalendarDate {
  return {
    year: reference.getUTCFullYear(),
    month: reference.getUTCMonth() + 1,
    day: reference.getUTCDate(),
  };
}
