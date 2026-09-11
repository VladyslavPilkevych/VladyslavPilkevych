import type { ProfileConfig } from '../config/types.ts';
import { buildAsciiPortrait } from '../avatar/fetchAvatar.ts';
import { fetchRecentActivity } from '../github/activity.ts';
import type { GitHubClient } from '../github/client.ts';
import { computeStreaks } from '../github/contributions.ts';
import { buildLanguageBreakdown } from '../github/languages.ts';
import { fetchProfileBundle } from '../github/profile.ts';
import { fetchRepositories } from '../github/repositories.ts';
import { computeStats } from '../github/stats.ts';
import { formatCalendarDate, formatHumanDate, formatUptime, todayInUtc } from '../utils/dates.ts';
import { sanitize, truncate } from '../utils/text.ts';
import type { FeaturedRepository, IdentityField, ProfileData, Repository } from './types.ts';

const ACTIVITY_LIMIT = 6;
const FEATURED_LIMIT = 4;

function pick(...values: (string | null | undefined)[]): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return sanitize(trimmed);
  }
  return null;
}

export function buildIdentityFields(
  config: ProfileConfig,
  identity: ProfileData['identity'],
  today = todayInUtc(),
): IdentityField[] {
  const personal = config.personal;
  const candidates: [string, string | null][] = [
    ['NAME', pick(personal.name, identity.name, identity.login)],
    ['ROLE', pick(personal.title)],
    ['COMPANY', pick(personal.company, identity.company)],
    ['LOCATION', pick(personal.location, identity.location)],
    ['EMAIL', pick(personal.email)],
    ['PHONE', pick(personal.phone)],
    ['WEBSITE', pick(personal.website, identity.website)],
    ['LANGUAGES', personal.languages.length > 0 ? personal.languages.join(' / ') : null],
    [
      'UPTIME',
      personal.codingSince ? formatUptime(personal.codingSince, formatCalendarDate(today)) : null,
    ],
    ['JOINED', formatHumanDate(identity.createdAt)],
  ];
  return candidates
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([label, value]) => ({ label, value: truncate(value, 46) }));
}

export function selectFeatured(
  repositories: Repository[],
  names: string[],
  limit = FEATURED_LIMIT,
): FeaturedRepository[] {
  const byName = new Map(repositories.map((entry) => [entry.name.toLowerCase(), entry]));
  const featured: FeaturedRepository[] = [];
  for (const name of names) {
    const repository = byName.get(name.toLowerCase());
    if (!repository) continue;
    featured.push({
      name: repository.name,
      description: repository.description ? truncate(sanitize(repository.description), 54) : null,
      stars: repository.stars,
      forks: repository.forks,
      primaryLanguage: repository.primaryLanguage,
    });
    if (featured.length >= limit) break;
  }
  return featured;
}

export async function buildProfileData(
  client: GitHubClient,
  config: ProfileConfig,
  now = new Date(),
): Promise<ProfileData> {
  const login = config.githubUsername;
  const bundle = await fetchProfileBundle(client, login, now);
  const repositories = await fetchRepositories(client, login, config.github);

  const languages = buildLanguageBreakdown(repositories, config.github);
  const stats = computeStats(bundle, repositories, bundle.calendar, config.github);
  const streaks = computeStreaks(bundle.calendar);
  const notes = [...bundle.notes];

  let activity: ProfileData['activity'] = [];
  if (config.sections.recentActivity) {
    const result = await fetchRecentActivity(client, login, ACTIVITY_LIMIT);
    activity = result.entries;
    if (result.note) notes.push(result.note);
  }

  const featured = config.sections.featuredRepositories
    ? selectFeatured(repositories, config.github.featuredRepositories)
    : [];
  if (config.sections.featuredRepositories) {
    const resolved = new Set(featured.map((entry) => entry.name.toLowerCase()));
    for (const name of config.github.featuredRepositories) {
      if (!resolved.has(name.toLowerCase())) {
        notes.push(`Featured repository "${name}" was not found among owned repositories.`);
      }
    }
  }

  const ascii =
    config.sections.asciiAvatar && config.avatar.enabled
      ? await buildAsciiPortrait(client, bundle.identity.avatarUrl, config.avatar)
      : null;

  return {
    identity: bundle.identity,
    ascii,
    identityFields: buildIdentityFields(config, bundle.identity, todayInUtc(now)),
    stats,
    languages,
    contributions: bundle.calendar,
    streaks,
    activity,
    featured,
    notes,
  };
}
