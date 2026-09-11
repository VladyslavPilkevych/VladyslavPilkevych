import { describe, expect, it } from 'vitest';
import {
  buildCalendar,
  computeLevelThresholds,
  computeStreaks,
  contributionLevel,
  parsePublicCalendar,
  type RawContributionDay,
} from '../src/github/contributions.ts';
import { addDays, formatCalendarDate, parseCalendarDate } from '../src/utils/dates.ts';

function series(start: string, counts: number[]): RawContributionDay[] {
  const from = parseCalendarDate(start);
  return counts.map((count, index) => ({
    date: formatCalendarDate(addDays(from, index)),
    count,
  }));
}

describe('contribution levels', () => {
  it('never assigns a level above zero to an empty day', () => {
    expect(contributionLevel(0, [1, 2, 3])).toBe(0);
    expect(contributionLevel(-4, [1, 2, 3])).toBe(0);
  });

  it('splits active days across the four filled levels', () => {
    const thresholds = computeLevelThresholds([1, 2, 3, 4, 5, 6, 7, 8, 0, 0]);
    expect(contributionLevel(1, thresholds)).toBe(1);
    expect(contributionLevel(8, thresholds)).toBe(4);
    const levels = [1, 2, 3, 4, 5, 6, 7, 8].map((count) => contributionLevel(count, thresholds));
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(new Set(levels).size).toBeGreaterThan(1);
  });

  it('falls back to sane thresholds when nothing is active', () => {
    expect(computeLevelThresholds([0, 0, 0])).toEqual([1, 2, 3]);
  });

  it('keeps thresholds monotonic when every active day is identical', () => {
    const thresholds = computeLevelThresholds([5, 5, 5, 5]);
    expect(thresholds[0]).toBeLessThanOrEqual(thresholds[1]);
    expect(thresholds[1]).toBeLessThanOrEqual(thresholds[2]);
    expect(contributionLevel(5, thresholds)).toBe(1);
  });
});

describe('buildCalendar', () => {
  it('places each date in the correct week column and weekday row', () => {
    const calendar = buildCalendar(
      series(
        '2025-09-07',
        Array.from({ length: 15 }, () => 1),
      ),
      'graphql',
    );
    expect(calendar.weeks).toHaveLength(3);
    expect(calendar.weeks[0]?.[0]?.date).toBe('2025-09-07');
    expect(calendar.weeks[0]?.[6]?.date).toBe('2025-09-13');
    expect(calendar.weeks[1]?.[0]?.date).toBe('2025-09-14');
    expect(calendar.weeks[2]?.[0]?.date).toBe('2025-09-21');
  });

  it('pads the first week when the range starts mid-week', () => {
    const calendar = buildCalendar(series('2026-09-09', [1, 2, 3]), 'graphql');
    const firstWeek = calendar.weeks[0];
    expect(firstWeek?.[0]).toBeNull();
    expect(firstWeek?.[2]).toBeNull();
    expect(firstWeek?.[3]?.date).toBe('2026-09-09');
    expect(firstWeek?.[5]?.date).toBe('2026-09-11');
    expect(firstWeek?.[6]).toBeNull();
  });

  it('never shifts a date to the neighbouring day', () => {
    const calendar = buildCalendar(
      series(
        '2026-01-01',
        Array.from({ length: 120 }, () => 1),
      ),
      'graphql',
    );
    for (const week of calendar.weeks) {
      week.forEach((day, weekday) => {
        if (!day) return;
        expect(new Date(`${day.date}T00:00:00Z`).getUTCDay()).toBe(weekday);
      });
    }
  });

  it('totals contributions and active days', () => {
    const calendar = buildCalendar(series('2026-09-06', [0, 3, 0, 5, 1, 0, 2]), 'graphql');
    expect(calendar.total).toBe(11);
    expect(calendar.activeDays).toBe(4);
    expect(calendar.maxCount).toBe(5);
    expect(calendar.from).toBe('2026-09-06');
    expect(calendar.to).toBe('2026-09-12');
  });

  it('deduplicates repeated dates', () => {
    const calendar = buildCalendar(
      [
        { date: '2026-09-06', count: 1 },
        { date: '2026-09-06', count: 4 },
      ],
      'graphql',
    );
    expect(calendar.total).toBe(4);
  });

  it('refuses an empty calendar rather than inventing data', () => {
    expect(() => buildCalendar([], 'graphql')).toThrow();
  });
});

describe('computeStreaks', () => {
  it('measures the longest run of active days', () => {
    const calendar = buildCalendar(series('2026-09-06', [1, 1, 1, 0, 1, 1, 0, 0]), 'graphql');
    expect(computeStreaks(calendar).longest).toBe(3);
  });

  it('counts the run ending on the final day', () => {
    const calendar = buildCalendar(series('2026-09-06', [0, 1, 0, 1, 1, 1]), 'graphql');
    const streaks = computeStreaks(calendar);
    expect(streaks.current).toBe(3);
    expect(streaks.currentStart).toBe('2026-09-09');
    expect(streaks.currentEnd).toBe('2026-09-11');
  });

  it('keeps the streak alive when only the final day is still empty', () => {
    const calendar = buildCalendar(series('2026-09-06', [0, 1, 1, 1, 1, 0]), 'graphql');
    expect(computeStreaks(calendar).current).toBe(4);
  });

  it('reports zero when the last two days are empty', () => {
    const calendar = buildCalendar(series('2026-09-06', [1, 1, 1, 1, 0, 0]), 'graphql');
    expect(computeStreaks(calendar).current).toBe(0);
  });
});

describe('parsePublicCalendar', () => {
  const html = `
    <table>
      <td data-date="2026-09-09" id="day-0" data-level="0" class="ContributionCalendar-day"></td>
      <td data-date="2026-09-10" id="day-1" data-level="2" class="ContributionCalendar-day"></td>
      <td data-date="2026-09-11" id="day-2" data-level="4" class="ContributionCalendar-day"></td>
    </table>
    <tool-tip for="day-0">No contributions on September 9th.</tool-tip>
    <tool-tip for="day-1">4 contributions on September 10th.</tool-tip>
    <tool-tip for="day-2">1,024 contributions on September 11th.</tool-tip>
  `;

  it('reads dates and exact counts from the public calendar markup', () => {
    expect(parsePublicCalendar(html)).toEqual([
      { date: '2026-09-09', count: 0 },
      { date: '2026-09-10', count: 4 },
      { date: '2026-09-11', count: 1024 },
    ]);
  });

  it('fails loudly when the markup contains no day cells', () => {
    expect(() => parsePublicCalendar('<html><body>nothing here</body></html>')).toThrow();
  });
});
