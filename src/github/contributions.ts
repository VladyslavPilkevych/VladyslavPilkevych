import {
  addDays,
  daysBetween,
  formatCalendarDate,
  parseCalendarDate,
  weekdayIndex,
} from '../utils/dates.ts';
import type {
  ContributionCalendar,
  ContributionDay,
  ContributionLevel,
  ContributionSource,
  ContributionWeek,
  StreakSummary,
} from '../data/types.ts';
import { GitHubApiError } from './client.ts';

export interface RawContributionDay {
  date: string;
  count: number;
}

export type LevelThresholds = [number, number, number];

export function computeLevelThresholds(counts: number[]): LevelThresholds {
  const active = counts.filter((count) => count > 0).sort((left, right) => left - right);
  if (active.length === 0) return [1, 2, 3];
  const percentile = (ratio: number): number => {
    const index = Math.min(active.length - 1, Math.floor(ratio * active.length));
    return active[index] ?? 1;
  };
  const first = Math.max(1, percentile(0.25));
  const second = Math.max(first, percentile(0.5));
  const third = Math.max(second, percentile(0.75));
  return [first, second, third];
}

export function contributionLevel(count: number, thresholds: LevelThresholds): ContributionLevel {
  if (count <= 0) return 0;
  const [first, second, third] = thresholds;
  if (count <= first) return 1;
  if (count <= second) return 2;
  if (count <= third) return 3;
  return 4;
}

export function buildCalendar(
  rawDays: RawContributionDay[],
  source: ContributionSource,
): ContributionCalendar {
  if (rawDays.length === 0) {
    throw new GitHubApiError('The contribution calendar came back empty.');
  }
  const unique = new Map<string, number>();
  for (const day of rawDays) {
    unique.set(day.date, Math.max(0, Math.trunc(day.count)));
  }
  const dates = [...unique.keys()].sort();
  const firstDate = parseCalendarDate(dates[0] ?? '');
  const lastDate = parseCalendarDate(dates[dates.length - 1] ?? '');
  const gridStart = addDays(firstDate, -weekdayIndex(firstDate));
  const weekCount = Math.floor(daysBetween(gridStart, lastDate) / 7) + 1;

  const weeks: ContributionWeek[] = [];
  for (let week = 0; week < weekCount; week += 1) {
    weeks.push(Array.from({ length: 7 }, () => null));
  }

  const counts = [...unique.values()];
  const thresholds = computeLevelThresholds(counts);

  let total = 0;
  let maxCount = 0;
  let activeDays = 0;
  for (const [date, count] of unique) {
    const parsed = parseCalendarDate(date);
    const offset = daysBetween(gridStart, parsed);
    const weekIndex = Math.floor(offset / 7);
    const dayIndex = offset % 7;
    const week = weeks[weekIndex];
    if (!week) continue;
    const day: ContributionDay = { date, count, level: contributionLevel(count, thresholds) };
    week[dayIndex] = day;
    total += count;
    maxCount = Math.max(maxCount, count);
    if (count > 0) activeDays += 1;
  }

  return {
    from: formatCalendarDate(firstDate),
    to: formatCalendarDate(lastDate),
    total,
    weeks,
    maxCount,
    activeDays,
    source,
  };
}

export function computeStreaks(calendar: ContributionCalendar): StreakSummary {
  const days: ContributionDay[] = [];
  for (const week of calendar.weeks) {
    for (const day of week) {
      if (day) days.push(day);
    }
  }
  days.sort((left, right) => left.date.localeCompare(right.date));

  let longest = 0;
  let longestStart: string | null = null;
  let longestEnd: string | null = null;
  let running = 0;
  let runningStart: string | null = null;

  for (const day of days) {
    if (day.count > 0) {
      running += 1;
      runningStart ??= day.date;
      if (running > longest) {
        longest = running;
        longestStart = runningStart;
        longestEnd = day.date;
      }
    } else {
      running = 0;
      runningStart = null;
    }
  }

  let current = 0;
  let currentStart: string | null = null;
  let currentEnd: string | null = null;
  let cursor = days.length - 1;
  if (days[cursor]?.count === 0) cursor -= 1;
  for (; cursor >= 0; cursor -= 1) {
    const day = days[cursor];
    if (!day || day.count === 0) break;
    currentEnd ??= day.date;
    current += 1;
    currentStart = day.date;
  }

  return { current, currentStart, currentEnd, longest, longestStart, longestEnd };
}

const DAY_CELL = /<td[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*\bid="([^"]+)"[^>]*>/g;
const TOOL_TIP = /<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g;
const COUNT_PREFIX = /^([\d,]+)\s+contribution/i;

export function parsePublicCalendar(html: string): RawContributionDay[] {
  const idToDate = new Map<string, string>();
  for (const match of html.matchAll(DAY_CELL)) {
    const date = match[1];
    const id = match[2];
    if (date && id) idToDate.set(id, date);
  }
  if (idToDate.size === 0) {
    throw new GitHubApiError('Could not read any day cells from the public contribution calendar.');
  }
  const counts = new Map<string, number>();
  for (const match of html.matchAll(TOOL_TIP)) {
    const id = match[1];
    const label = match[2];
    if (!id || label === undefined) continue;
    const date = idToDate.get(id);
    if (!date) continue;
    const numeric = COUNT_PREFIX.exec(label.trim());
    counts.set(date, numeric ? Number(numeric[1]?.replace(/,/g, '') ?? 0) : 0);
  }
  return [...idToDate.values()].map((date) => ({ date, count: counts.get(date) ?? 0 }));
}
