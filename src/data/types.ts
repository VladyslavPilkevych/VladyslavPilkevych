export interface Identity {
  login: string;
  name: string | null;
  avatarUrl: string;
  company: string | null;
  website: string | null;
  location: string | null;
  bio: string | null;
  createdAt: string;
  followers: number;
  following: number;
  publicRepositories: number;
}

export interface Repository {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  isFork: boolean;
  isArchived: boolean;
  isPrivate: boolean;
  pushedAt: string | null;
  primaryLanguage: string | null;
  languageBytes: Record<string, number>;
}

export interface LanguageShare {
  name: string;
  bytes: number;
  percent: number;
}

export interface LanguageBreakdown {
  entries: LanguageShare[];
  totalBytes: number;
  repositoriesCounted: number;
}

export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export interface ContributionDay {
  date: string;
  count: number;
  level: ContributionLevel;
}

export type ContributionWeek = (ContributionDay | null)[];

export type ContributionSource = 'graphql' | 'public-calendar';

export interface ContributionCalendar {
  from: string;
  to: string;
  total: number;
  weeks: ContributionWeek[];
  maxCount: number;
  activeDays: number;
  source: ContributionSource;
}

export interface StreakSummary {
  current: number;
  currentStart: string | null;
  currentEnd: string | null;
  longest: number;
  longestStart: string | null;
  longestEnd: string | null;
}

export interface GitHubStats {
  publicRepositories: number;
  ownedRepositoriesCounted: number;
  starsReceived: number;
  forksReceived: number;
  followers: number;
  following: number;
  pullRequestsOpened: number | null;
  issuesOpened: number | null;
  contributionsLastYear: number;
  contributionsThisYear: number | null;
  commitContributionsLastYear: number | null;
  activeDaysLastYear: number;
  privateContributionsIncluded: boolean;
  restrictedContributionsLastYear: number | null;
}

export type ActivityKind =
  'push' | 'pull request' | 'issue' | 'release' | 'create' | 'fork' | 'star' | 'review' | 'comment';

export interface ActivityEntry {
  date: string;
  kind: ActivityKind;
  repository: string;
  detail: string | null;
}

export interface FeaturedRepository {
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  primaryLanguage: string | null;
}

export interface AsciiPortrait {
  rows: string[];
  columns: number;
  lines: number;
}

export interface IdentityField {
  label: string;
  value: string;
}

export interface ProfileData {
  identity: Identity;
  ascii: AsciiPortrait | null;
  identityFields: IdentityField[];
  stats: GitHubStats;
  languages: LanguageBreakdown;
  contributions: ContributionCalendar;
  streaks: StreakSummary;
  activity: ActivityEntry[];
  featured: FeaturedRepository[];
  notes: string[];
}
