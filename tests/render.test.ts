import { describe, expect, it } from 'vitest';
import profileConfig from '../profile.config.ts';
import { fixtureProfileData } from '../fixtures/profile.fixture.ts';
import { resolveConfig } from '../src/config/resolve.ts';
import { buildIdentityFields, selectFeatured } from '../src/data/buildProfileData.ts';
import { renderProfile } from '../src/renderer/renderProfile.tsx';
import { buildStatRows } from '../src/renderer/statRows.ts';
import { collectTextBoxes, parseRootBox, validateSvg } from '../src/validate/validateSvg.ts';
import type { ProfileData, Repository } from '../src/data/types.ts';

const config = resolveConfig(profileConfig);
const dark = renderProfile(fixtureProfileData, config, 'dark');
const light = renderProfile(fixtureProfileData, config, 'light');

describe('generated SVG', () => {
  it('passes the shipped validator for both themes', () => {
    expect(() => validateSvg({ svg: dark, label: 'dark' })).not.toThrow();
    expect(() => validateSvg({ svg: light, label: 'light' })).not.toThrow();
  });

  it('declares a viewBox that matches its width and height', () => {
    const box = parseRootBox(dark);
    expect(box).not.toBeNull();
    expect(box?.width).toBe(config.theme.spacing.canvasWidth);
    expect(box?.height).toBeGreaterThan(600);
  });

  it('keeps every text run inside the canvas', () => {
    const box = parseRootBox(dark);
    const boxes = collectTextBoxes(dark);
    expect(boxes.length).toBeGreaterThan(50);
    for (const text of boxes) {
      expect(text.x).toBeGreaterThanOrEqual(0);
      expect(text.x + text.length).toBeLessThanOrEqual((box?.width ?? 0) + 0.5);
    }
  });

  it('is byte stable across repeated renders', () => {
    expect(renderProfile(fixtureProfileData, config, 'dark')).toBe(dark);
  });

  it('produces a different document per theme', () => {
    expect(light).not.toBe(dark);
    expect(light).toContain(config.theme.light.background);
    expect(dark).toContain(config.theme.dark.background);
  });

  it('carries no script, event handler or external reference', () => {
    expect(dark).not.toMatch(/<script/i);
    expect(dark).not.toMatch(/\son[a-z]+=/i);
    expect(dark).not.toMatch(/xlink:href/i);
    expect(dark).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });

  it('contains no timestamp that would churn on every run', () => {
    expect(dark).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  });

  it('escapes hostile repository and profile strings instead of injecting markup', () => {
    const hostile: ProfileData = {
      ...fixtureProfileData,
      identity: { ...fixtureProfileData.identity, name: '</svg><script>alert(1)</script>' },
      identityFields: [
        { label: 'NAME', value: '"><script>alert(1)</script>' },
        { label: 'COMPANY', value: 'Ampersand & Co <b>' },
      ],
      featured: [
        {
          name: '<g id="x">evil',
          description: 'closes "the" <tag> & runs',
          stars: 3,
          forks: 0,
          primaryLanguage: '<lang>',
        },
      ],
      activity: [{ date: '2026-09-11', kind: 'push', repository: '</text><rect/>', detail: null }],
    };
    const svg = renderProfile(hostile, config, 'dark');
    expect(svg).not.toContain('<script');
    expect(svg).not.toContain('<rect/>evil');
    expect(svg).toContain('&lt;script&gt;');
    expect(() => validateSvg({ svg, label: 'hostile' })).not.toThrow();
  });

  it('reports a token that leaked into the output', () => {
    expect(() =>
      validateSvg({ svg: `${dark}<!--ghp_abcdefghijklmnopqrstuvwxyz012345-->`, label: 'leak' }),
    ).toThrow(/token/i);
  });
});

describe('section toggles', () => {
  it('omits a section entirely when it is disabled', () => {
    const withoutStack = renderProfile(
      fixtureProfileData,
      {
        ...config,
        sections: { ...config.sections, techStack: false },
      },
      'dark',
    );
    expect(dark).toContain('stack --list');
    expect(withoutStack).not.toContain('stack --list');
  });

  it('still renders a valid document with every optional section off', () => {
    const minimal = renderProfile(
      fixtureProfileData,
      {
        ...config,
        sections: {
          asciiAvatar: false,
          identity: true,
          githubStats: false,
          languageStats: false,
          techStack: false,
          contributionGraph: false,
          recentActivity: false,
          featuredRepositories: false,
        },
      },
      'dark',
    );
    expect(() => validateSvg({ svg: minimal, label: 'minimal' })).not.toThrow();
  });
});

describe('buildIdentityFields', () => {
  const identity = fixtureProfileData.identity;

  it('hides rows whose configured value is null', () => {
    const fields = buildIdentityFields(
      {
        ...config,
        personal: {
          ...config.personal,
          phone: null,
          email: null,
          languages: [],
          codingSince: null,
        },
      },
      identity,
      { year: 2026, month: 9, day: 11 },
    );
    const labels = fields.map((field) => field.label);
    expect(labels).not.toContain('PHONE');
    expect(labels).not.toContain('EMAIL');
    expect(labels).not.toContain('LANGUAGES');
    expect(labels).not.toContain('UPTIME');
    expect(labels).toContain('JOINED');
  });

  it('computes uptime from the configured start date', () => {
    const fields = buildIdentityFields(
      { ...config, personal: { ...config.personal, codingSince: '2022-01-01' } },
      identity,
      { year: 2026, month: 9, day: 11 },
    );
    expect(fields.find((field) => field.label === 'UPTIME')?.value).toBe('4y 8m 10d');
  });

  it('takes the join date from GitHub rather than configuration', () => {
    const fields = buildIdentityFields(config, identity, { year: 2026, month: 9, day: 11 });
    expect(fields.find((field) => field.label === 'JOINED')?.value).toBe('Apr 02, 2019');
  });

  it('falls back to GitHub values when personal ones are absent', () => {
    const fields = buildIdentityFields(
      { ...config, personal: { ...config.personal, company: null, location: null } },
      identity,
      { year: 2026, month: 9, day: 11 },
    );
    expect(fields.find((field) => field.label === 'COMPANY')?.value).toBe('Fixture Labs');
    expect(fields.find((field) => field.label === 'LOCATION')?.value).toBe('Nowhere');
  });
});

describe('buildStatRows', () => {
  it('omits metrics that could not be computed instead of printing a placeholder', () => {
    const rows = buildStatRows(
      {
        ...fixtureProfileData.stats,
        pullRequestsOpened: null,
        issuesOpened: null,
        commitContributionsLastYear: null,
        contributionsThisYear: null,
      },
      2026,
    );
    const labels = rows.map((row) => row.label);
    expect(labels).not.toContain('pull requests opened');
    expect(labels).not.toContain('commits / last 12m');
    expect(labels).toContain('contributions / last 12m');
    expect(rows.every((row) => row.value.length > 0)).toBe(true);
  });

  it('labels the calendar-year counter with the year it covers', () => {
    const rows = buildStatRows(fixtureProfileData.stats, 2026);
    expect(rows.map((row) => row.label)).toContain('contributions / 2026');
  });
});

describe('selectFeatured', () => {
  const repositories: Repository[] = [
    {
      name: 'Alpha',
      description: 'first',
      url: '',
      stars: 3,
      forks: 1,
      isFork: false,
      isArchived: false,
      isPrivate: false,
      pushedAt: null,
      primaryLanguage: 'TypeScript',
      languageBytes: {},
    },
  ];

  it('matches configured names case-insensitively', () => {
    expect(selectFeatured(repositories, ['alpha'])).toHaveLength(1);
  });

  it('skips names that do not exist rather than inventing a repository', () => {
    expect(selectFeatured(repositories, ['missing'])).toEqual([]);
  });
});
