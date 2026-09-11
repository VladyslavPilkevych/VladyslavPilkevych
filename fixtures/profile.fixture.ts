import { buildCalendar, computeStreaks } from '../src/github/contributions.ts';
import { imageToAscii, type GrayImage } from '../src/avatar/imageToAscii.ts';
import type { ProfileData } from '../src/data/types.ts';
import { addDays, formatCalendarDate, parseCalendarDate } from '../src/utils/dates.ts';

const FIXTURE_END = '2026-09-11';
const FIXTURE_DAYS = 371;

function pseudoRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0xffffffff;
  };
}

function syntheticPortrait(): GrayImage {
  const size = 320;
  const pixels = new Uint8Array(size * size);
  const centerX = size / 2;
  const centerY = size / 2.25;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x - centerX) / (size * 0.32);
      const dy = (y - centerY) / (size * 0.4);
      const radial = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
      const shading = 0.35 + 0.65 * radial * (1 - y / (size * 2));
      pixels[y * size + x] = Math.round(Math.min(1, Math.max(0, shading)) * 255);
    }
  }
  return { width: size, height: size, pixels };
}

function syntheticCalendarDays(): { date: string; count: number }[] {
  const random = pseudoRandom(20260911);
  const end = parseCalendarDate(FIXTURE_END);
  const days: { date: string; count: number }[] = [];
  for (let offset = FIXTURE_DAYS - 1; offset >= 0; offset -= 1) {
    const date = addDays(end, -offset);
    const roll = random();
    const count = roll < 0.34 ? 0 : Math.max(1, Math.round(roll * 14 - 3));
    days.push({ date: formatCalendarDate(date), count });
  }
  return days;
}

const calendar = buildCalendar(syntheticCalendarDays(), 'graphql');

const asciiRows = imageToAscii(syntheticPortrait(), {
  columns: 54,
  cellAspectRatio: 2.05,
  characterRamp: ' .:-=+*#%@',
  contrast: 1.35,
  brightness: 0.02,
  gamma: 0.92,
  invert: false,
  trimBorder: 0.04,
  focusX: 0.5,
  focusY: 0.5,
  normalize: true,
  normalizeClip: 0.01,
});

export const fixtureProfileData: ProfileData = {
  identity: {
    login: 'octo-fixture',
    name: 'Octo Fixture',
    avatarUrl: 'https://example.invalid/avatar.png',
    company: 'Fixture Labs',
    website: 'fixture.example',
    location: 'Nowhere',
    bio: null,
    createdAt: '2019-04-02T10:00:00Z',
    followers: 128,
    following: 64,
    publicRepositories: 42,
  },
  ascii: {
    rows: asciiRows,
    columns: asciiRows.reduce((widest, row) => Math.max(widest, [...row].length), 0),
    lines: asciiRows.length,
  },
  identityFields: [
    { label: 'NAME', value: 'Octo Fixture' },
    { label: 'ROLE', value: 'Software Engineer' },
    { label: 'COMPANY', value: 'Fixture Labs' },
    { label: 'LOCATION', value: 'Nowhere' },
    { label: 'EMAIL', value: 'octo@fixture.example' },
    { label: 'WEBSITE', value: 'fixture.example' },
    { label: 'LANGUAGES', value: 'English / Slovak' },
    { label: 'UPTIME', value: '4y 5m 9d' },
    { label: 'JOINED', value: 'Apr 02, 2019' },
  ],
  stats: {
    publicRepositories: 42,
    ownedRepositoriesCounted: 38,
    starsReceived: 1284,
    forksReceived: 96,
    followers: 128,
    following: 64,
    pullRequestsOpened: 215,
    issuesOpened: 64,
    contributionsLastYear: calendar.total,
    contributionsThisYear: 843,
    commitContributionsLastYear: 1204,
    activeDaysLastYear: calendar.activeDays,
    privateContributionsIncluded: true,
    restrictedContributionsLastYear: 212,
  },
  languages: {
    entries: [
      { name: 'TypeScript', bytes: 4_200_000, percent: 58.4 },
      { name: 'JavaScript', bytes: 1_100_000, percent: 15.3 },
      { name: 'Java', bytes: 640_000, percent: 8.9 },
      { name: 'Kotlin', bytes: 430_000, percent: 6 },
      { name: 'CSS', bytes: 320_000, percent: 4.5 },
      { name: 'C', bytes: 240_000, percent: 3.3 },
      { name: 'Shell', bytes: 130_000, percent: 1.8 },
      { name: 'other', bytes: 130_000, percent: 1.8 },
    ],
    totalBytes: 7_190_000,
    repositoriesCounted: 38,
  },
  contributions: calendar,
  streaks: computeStreaks(calendar),
  activity: [
    { date: '2026-09-11', kind: 'push', repository: 'zerogravity-ui', detail: '4 commits' },
    { date: '2026-09-10', kind: 'pull request', repository: 'graph-pilot', detail: '#31 opened' },
    { date: '2026-09-09', kind: 'release', repository: 'zerogravity-ui', detail: 'v0.4.0' },
    { date: '2026-09-08', kind: 'issue', repository: 'taskboard-desktop', detail: '#12 opened' },
    { date: '2026-09-06', kind: 'push', repository: 'taskboard-desktop', detail: '2 commits' },
    { date: '2026-09-04', kind: 'star', repository: 'octocat/hello-world', detail: null },
  ],
  featured: [
    {
      name: 'zerogravity-ui',
      description: 'Headless component primitives with a zero-runtime theme layer.',
      stars: 612,
      forks: 44,
      primaryLanguage: 'TypeScript',
    },
    {
      name: 'graph-pilot',
      description: 'Interactive graph explorer for large dependency trees.',
      stars: 438,
      forks: 31,
      primaryLanguage: 'TypeScript',
    },
    {
      name: 'taskboard-desktop',
      description: 'Offline-first kanban board built on Tauri.',
      stars: 234,
      forks: 21,
      primaryLanguage: 'Rust',
    },
  ],
  notes: [],
};
