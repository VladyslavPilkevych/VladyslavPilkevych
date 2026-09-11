import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonthsClamped,
  calendarDifference,
  daysBetween,
  daysInMonth,
  formatCalendarDate,
  formatHumanDate,
  formatShortDate,
  formatUptime,
  parseCalendarDate,
  todayInUtc,
  weekdayIndex,
} from '../src/utils/dates.ts';

describe('parseCalendarDate', () => {
  it('reads a plain calendar date', () => {
    expect(parseCalendarDate('2026-09-11')).toEqual({ year: 2026, month: 9, day: 11 });
  });

  it('ignores the time part of an ISO timestamp', () => {
    expect(parseCalendarDate('2021-09-05T10:33:34Z')).toEqual({ year: 2021, month: 9, day: 5 });
  });

  it('rejects malformed input', () => {
    expect(() => parseCalendarDate('11/09/2026')).toThrow();
    expect(() => parseCalendarDate('2026-13-01')).toThrow();
  });
});

describe('calendar arithmetic', () => {
  it('crosses month and year boundaries', () => {
    expect(formatCalendarDate(addDays({ year: 2025, month: 12, day: 31 }, 1))).toBe('2026-01-01');
    expect(formatCalendarDate(addDays({ year: 2026, month: 3, day: 1 }, -1))).toBe('2026-02-28');
  });

  it('handles leap days', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(formatCalendarDate(addDays({ year: 2024, month: 2, day: 28 }, 1))).toBe('2024-02-29');
  });

  it('counts whole days regardless of daylight saving shifts', () => {
    expect(daysBetween({ year: 2026, month: 3, day: 1 }, { year: 2026, month: 4, day: 1 })).toBe(
      31,
    );
    expect(daysBetween({ year: 2025, month: 9, day: 7 }, { year: 2026, month: 9, day: 11 })).toBe(
      369,
    );
  });

  it('derives weekday indices in UTC', () => {
    expect(weekdayIndex({ year: 2025, month: 9, day: 7 })).toBe(0);
    expect(weekdayIndex({ year: 2026, month: 9, day: 11 })).toBe(5);
  });

  it('reads today in UTC without local timezone drift', () => {
    expect(todayInUtc(new Date('2026-09-11T23:30:00Z'))).toEqual({
      year: 2026,
      month: 9,
      day: 11,
    });
    expect(todayInUtc(new Date('2026-01-01T00:00:00Z'))).toEqual({ year: 2026, month: 1, day: 1 });
  });
});

describe('calendarDifference', () => {
  it('splits a span into years, months and days', () => {
    expect(
      calendarDifference({ year: 2022, month: 1, day: 1 }, { year: 2026, month: 9, day: 11 }),
    ).toEqual({ years: 4, months: 8, days: 10 });
  });

  it('borrows days from the previous month', () => {
    expect(
      calendarDifference({ year: 2026, month: 1, day: 31 }, { year: 2026, month: 3, day: 1 }),
    ).toEqual({ years: 0, months: 1, days: 1 });
  });

  it('returns zero when the end precedes the start', () => {
    expect(
      calendarDifference({ year: 2026, month: 9, day: 11 }, { year: 2020, month: 1, day: 1 }),
    ).toEqual({ years: 0, months: 0, days: 0 });
  });
});

describe('formatUptime', () => {
  it('renders a compact terminal duration', () => {
    expect(formatUptime('2022-01-01', '2026-09-11')).toBe('4y 8m 10d');
  });

  it('drops empty leading units', () => {
    expect(formatUptime('2026-07-11', '2026-09-11')).toBe('2m');
    expect(formatUptime('2026-09-04', '2026-09-11')).toBe('7d');
  });

  it('always shows at least one unit', () => {
    expect(formatUptime('2026-09-11', '2026-09-11')).toBe('0d');
  });

  it('keeps years when months and days are zero', () => {
    expect(formatUptime('2021-09-05', '2026-09-05')).toBe('5y');
  });
});

describe('display formatting', () => {
  it('formats a human readable date', () => {
    expect(formatHumanDate('2021-09-05T10:33:34Z')).toBe('Sep 05, 2021');
  });

  it('formats a short activity date', () => {
    expect(formatShortDate('2026-09-11')).toBe('11/09');
  });
});

describe('addMonthsClamped', () => {
  it('clamps the day to the length of the target month', () => {
    expect(addMonthsClamped({ year: 2026, month: 1, day: 31 }, 1)).toEqual({
      year: 2026,
      month: 2,
      day: 28,
    });
    expect(addMonthsClamped({ year: 2024, month: 1, day: 31 }, 1)).toEqual({
      year: 2024,
      month: 2,
      day: 29,
    });
  });

  it('rolls across year boundaries in both directions', () => {
    expect(addMonthsClamped({ year: 2026, month: 11, day: 5 }, 3)).toEqual({
      year: 2027,
      month: 2,
      day: 5,
    });
    expect(addMonthsClamped({ year: 2026, month: 2, day: 5 }, -3)).toEqual({
      year: 2025,
      month: 11,
      day: 5,
    });
  });
});
