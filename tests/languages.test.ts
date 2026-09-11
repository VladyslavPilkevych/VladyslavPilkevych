import { describe, expect, it } from 'vitest';
import {
  aggregateLanguageBytes,
  buildLanguageBreakdown,
  selectRepositories,
} from '../src/github/languages.ts';
import type { GitHubConfig } from '../src/config/types.ts';
import type { Repository } from '../src/data/types.ts';

function repository(overrides: Partial<Repository> & { name: string }): Repository {
  return {
    description: null,
    url: `https://github.com/example/${overrides.name}`,
    stars: 0,
    forks: 0,
    isFork: false,
    isArchived: false,
    isPrivate: false,
    pushedAt: '2026-01-01T00:00:00Z',
    primaryLanguage: null,
    languageBytes: {},
    ...overrides,
  };
}

const baseConfig: GitHubConfig = {
  excludedRepositories: [],
  excludedLanguages: [],
  includeForks: false,
  includeArchived: false,
  featuredRepositories: [],
  maxLanguages: 6,
  groupRemainderAs: 'other',
  minLanguageShare: 0.5,
};

const repositories: Repository[] = [
  repository({ name: 'alpha', languageBytes: { TypeScript: 6000, CSS: 1000 } }),
  repository({ name: 'beta', languageBytes: { TypeScript: 2000, Java: 1000 } }),
  repository({ name: 'gamma', isFork: true, languageBytes: { Ruby: 50_000 } }),
  repository({ name: 'delta', isArchived: true, languageBytes: { Perl: 50_000 } }),
  repository({ name: 'profile-meta', languageBytes: { Shell: 40_000 } }),
];

describe('selectRepositories', () => {
  it('drops forks and archived repositories by default', () => {
    const names = selectRepositories(repositories, baseConfig).map((entry) => entry.name);
    expect(names).toEqual(['alpha', 'beta', 'profile-meta']);
  });

  it('keeps forks and archived repositories when enabled', () => {
    const names = selectRepositories(repositories, {
      ...baseConfig,
      includeForks: true,
      includeArchived: true,
    }).map((entry) => entry.name);
    expect(names).toEqual(['alpha', 'beta', 'gamma', 'delta', 'profile-meta']);
  });

  it('excludes configured repositories regardless of casing', () => {
    const names = selectRepositories(repositories, {
      ...baseConfig,
      excludedRepositories: ['PROFILE-META'],
    }).map((entry) => entry.name);
    expect(names).toEqual(['alpha', 'beta']);
  });
});

describe('aggregateLanguageBytes', () => {
  it('sums byte counts across repositories', () => {
    const totals = aggregateLanguageBytes(
      [
        repository({ name: 'a', languageBytes: { TypeScript: 100, CSS: 10 } }),
        repository({ name: 'b', languageBytes: { TypeScript: 50 } }),
      ],
      [],
    );
    expect(totals.get('TypeScript')).toBe(150);
    expect(totals.get('CSS')).toBe(10);
  });

  it('ignores excluded languages and non-positive counts', () => {
    const totals = aggregateLanguageBytes(
      [repository({ name: 'a', languageBytes: { TypeScript: 100, HTML: 10, Makefile: 0 } })],
      ['html'],
    );
    expect([...totals.keys()]).toEqual(['TypeScript']);
  });
});

describe('buildLanguageBreakdown', () => {
  it('computes percentages from byte totals of the selected repositories', () => {
    const breakdown = buildLanguageBreakdown(repositories, {
      ...baseConfig,
      excludedRepositories: ['profile-meta'],
    });
    expect(breakdown.totalBytes).toBe(10_000);
    expect(breakdown.repositoriesCounted).toBe(2);
    expect(breakdown.entries).toEqual([
      { name: 'TypeScript', bytes: 8000, percent: 80 },
      { name: 'CSS', bytes: 1000, percent: 10 },
      { name: 'Java', bytes: 1000, percent: 10 },
    ]);
  });

  it('sums to 100 percent when every language is shown', () => {
    const breakdown = buildLanguageBreakdown(repositories, {
      ...baseConfig,
      excludedRepositories: ['profile-meta'],
    });
    const total = breakdown.entries.reduce((sum, entry) => sum + entry.percent, 0);
    expect(total).toBeCloseTo(100, 6);
  });

  it('groups languages beyond the limit into the remainder bucket', () => {
    const wide = [
      repository({
        name: 'wide',
        languageBytes: { A: 500, B: 200, C: 120, D: 90, E: 50, F: 25, G: 15 },
      }),
    ];
    const breakdown = buildLanguageBreakdown(wide, { ...baseConfig, maxLanguages: 3 });
    expect(breakdown.entries.map((entry) => entry.name)).toEqual(['A', 'B', 'C', 'other']);
    const total = breakdown.entries.reduce((sum, entry) => sum + entry.percent, 0);
    expect(total).toBeCloseTo(100, 6);
  });

  it('drops the remainder bucket when it is disabled', () => {
    const wide = [repository({ name: 'wide', languageBytes: { A: 500, B: 200, C: 120, D: 90 } })];
    const breakdown = buildLanguageBreakdown(wide, {
      ...baseConfig,
      maxLanguages: 2,
      groupRemainderAs: null,
    });
    expect(breakdown.entries.map((entry) => entry.name)).toEqual(['A', 'B']);
    const total = breakdown.entries.reduce((sum, entry) => sum + entry.percent, 0);
    expect(total).toBeLessThan(100);
  });

  it('moves tiny languages into the remainder rather than showing a 0.0 percent row', () => {
    const skewed = [repository({ name: 'skewed', languageBytes: { A: 100_000, B: 100 } })];
    const breakdown = buildLanguageBreakdown(skewed, { ...baseConfig, minLanguageShare: 1 });
    expect(breakdown.entries.map((entry) => entry.name)).toEqual(['A', 'other']);
  });

  it('returns nothing when no language bytes are available', () => {
    const breakdown = buildLanguageBreakdown([repository({ name: 'empty' })], baseConfig);
    expect(breakdown.entries).toEqual([]);
    expect(breakdown.totalBytes).toBe(0);
  });

  it('orders ties deterministically by name', () => {
    const tied = [repository({ name: 'tied', languageBytes: { Zig: 100, Ada: 100 } })];
    const breakdown = buildLanguageBreakdown(tied, baseConfig);
    expect(breakdown.entries.map((entry) => entry.name)).toEqual(['Ada', 'Zig']);
  });
});
