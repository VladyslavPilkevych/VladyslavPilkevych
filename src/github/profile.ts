import type { ContributionCalendar, Identity } from '../data/types.ts';
import { GitHubApiError, type GitHubClient } from './client.ts';
import { buildCalendar, parsePublicCalendar, type RawContributionDay } from './contributions.ts';
import { PROFILE_QUERY, buildAllTimeQuery } from './queries.ts';

export interface ProfileBundle {
  identity: Identity;
  calendar: ContributionCalendar;
  pullRequestsOpened: number | null;
  issuesOpened: number | null;
  contributionsThisYear: number | null;
  contributionsAllTime: number | null;
  contributionYears: number[];
  commitContributionsLastYear: number | null;
  restrictedContributionsLastYear: number | null;
  privateContributionsIncluded: boolean;
  notes: string[];
}

interface GraphQlProfileResponse {
  viewer: { login: string };
  user: {
    login: string;
    name: string | null;
    avatarUrl: string;
    company: string | null;
    websiteUrl: string | null;
    location: string | null;
    bio: string | null;
    createdAt: string;
    followers: { totalCount: number };
    following: { totalCount: number };
    publicRepositories: { totalCount: number };
    pullRequests: { totalCount: number };
    issues: { totalCount: number };
    lastYear: {
      contributionYears: number[];
      totalCommitContributions: number;
      restrictedContributionsCount: number;
      contributionCalendar: {
        totalContributions: number;
        weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
      };
    };
    thisYear: {
      totalCommitContributions: number;
      restrictedContributionsCount: number;
      contributionCalendar: { totalContributions: number };
    };
  } | null;
}

interface RestUserResponse {
  login: string;
  name: string | null;
  avatar_url: string;
  company: string | null;
  blog: string | null;
  location: string | null;
  bio: string | null;
  created_at: string;
  followers: number;
  following: number;
  public_repos: number;
}

interface SearchCountResponse {
  total_count: number;
}

function normalizeWebsite(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function normalizeCompany(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^@/, '');
}

export async function fetchProfileBundle(
  client: GitHubClient,
  login: string,
  now: Date,
): Promise<ProfileBundle> {
  if (client.hasToken) {
    return fetchViaGraphQl(client, login, now);
  }
  return fetchViaPublicApis(client, login);
}

async function fetchViaGraphQl(
  client: GitHubClient,
  login: string,
  now: Date,
): Promise<ProfileBundle> {
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
  const data = await client.graphql<GraphQlProfileResponse>(
    PROFILE_QUERY,
    { login, yearStart, now: now.toISOString() },
    'profile overview',
  );
  const user = data.user;
  if (!user) {
    throw new GitHubApiError(`GitHub user "${login}" was not found.`, 404);
  }

  const rawDays: RawContributionDay[] = [];
  for (const week of user.lastYear.contributionCalendar.weeks) {
    for (const day of week.contributionDays) {
      rawDays.push({ date: day.date, count: day.contributionCount });
    }
  }

  const years = normalizeContributionYears(user.lastYear.contributionYears, user.createdAt, now);
  const privateIncluded = data.viewer.login.toLowerCase() === user.login.toLowerCase();
  const notes: string[] = [];
  if (!privateIncluded) {
    notes.push(
      'Contribution totals cover public activity only. Provide PROFILE_GITHUB_TOKEN owned by ' +
        `${user.login} to include private contributions.`,
    );
  }

  return {
    identity: {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatarUrl,
      company: normalizeCompany(user.company),
      website: normalizeWebsite(user.websiteUrl),
      location: user.location,
      bio: user.bio,
      createdAt: user.createdAt,
      followers: user.followers.totalCount,
      following: user.following.totalCount,
      publicRepositories: user.publicRepositories.totalCount,
    },
    calendar: buildCalendar(rawDays, 'graphql'),
    contributionsAllTime: await fetchAllTimeContributions(client, login, years),
    contributionYears: years,
    pullRequestsOpened: user.pullRequests.totalCount,
    issuesOpened: user.issues.totalCount,
    contributionsThisYear: user.thisYear.contributionCalendar.totalContributions,
    commitContributionsLastYear: user.lastYear.totalCommitContributions,
    restrictedContributionsLastYear: user.lastYear.restrictedContributionsCount,
    privateContributionsIncluded: privateIncluded,
    notes,
  };
}

async function fetchViaPublicApis(client: GitHubClient, login: string): Promise<ProfileBundle> {
  const user = await client.rest<RestUserResponse>(`/users/${encodeURIComponent(login)}`);
  const html = await client.text(
    `https://github.com/users/${encodeURIComponent(login)}/contributions`,
    'public contribution calendar',
  );
  const calendar = buildCalendar(parsePublicCalendar(html), 'public-calendar');

  const pullRequestsOpened = await countSearch(client, `author:${login} type:pr`);
  const issuesOpened = await countSearch(client, `author:${login} type:issue`);

  return {
    identity: {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      company: normalizeCompany(user.company),
      website: normalizeWebsite(user.blog),
      location: user.location,
      bio: user.bio,
      createdAt: user.created_at,
      followers: user.followers,
      following: user.following,
      publicRepositories: user.public_repos,
    },
    calendar,
    pullRequestsOpened,
    issuesOpened,
    contributionsThisYear: null,
    contributionsAllTime: null,
    contributionYears: [],
    commitContributionsLastYear: null,
    restrictedContributionsLastYear: null,
    privateContributionsIncluded: false,
    notes: [
      'No GitHub token was provided, so the generator used public endpoints only. ' +
        'Commit-only and calendar-year contribution counters are unavailable in this mode.',
    ],
  };
}

export function normalizeContributionYears(
  reported: number[],
  createdAt: string,
  now: Date,
): number[] {
  const firstYear = Number(createdAt.slice(0, 4));
  const lastYear = now.getUTCFullYear();
  const years = new Set<number>();
  for (const year of reported) {
    if (Number.isInteger(year) && year >= 2005 && year <= lastYear) years.add(year);
  }
  if (Number.isInteger(firstYear)) years.add(firstYear);
  years.add(lastYear);
  return [...years].sort((left, right) => left - right);
}

async function fetchAllTimeContributions(
  client: GitHubClient,
  login: string,
  years: number[],
): Promise<number | null> {
  if (years.length === 0) return null;
  const data = await client.graphql<{
    user: Record<string, { contributionCalendar: { totalContributions: number } }> | null;
  }>(buildAllTimeQuery(years), { login }, 'all-time contributions');
  if (!data.user) return null;
  let total = 0;
  for (const year of years) {
    total += data.user[`y${String(year)}`]?.contributionCalendar.totalContributions ?? 0;
  }
  return total;
}

async function countSearch(client: GitHubClient, query: string): Promise<number | null> {
  try {
    const response = await client.rest<SearchCountResponse>(
      `/search/issues?q=${encodeURIComponent(query)}&per_page=1&advanced_search=true`,
    );
    return response.total_count;
  } catch {
    return null;
  }
}
