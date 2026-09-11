import type { GitHubConfig } from '../config/types.ts';
import type { ContributionCalendar, GitHubStats, Repository } from '../data/types.ts';
import type { ProfileBundle } from './profile.ts';

export function selectOwnedRepositories(
  repositories: Repository[],
  excludedRepositories: string[],
): Repository[] {
  const excluded = new Set(excludedRepositories.map((name) => name.toLowerCase()));
  return repositories.filter(
    (repository) => !repository.isFork && !excluded.has(repository.name.toLowerCase()),
  );
}

export function computeStats(
  bundle: ProfileBundle,
  repositories: Repository[],
  calendar: ContributionCalendar,
  config: GitHubConfig,
): GitHubStats {
  const owned = selectOwnedRepositories(repositories, config.excludedRepositories);
  return {
    publicRepositories: bundle.identity.publicRepositories,
    ownedRepositoriesCounted: owned.length,
    starsReceived: owned.reduce((sum, repository) => sum + repository.stars, 0),
    forksReceived: owned.reduce((sum, repository) => sum + repository.forks, 0),
    followers: bundle.identity.followers,
    following: bundle.identity.following,
    pullRequestsOpened: bundle.pullRequestsOpened,
    issuesOpened: bundle.issuesOpened,
    contributionsLastYear: calendar.total,
    contributionsThisYear: bundle.contributionsThisYear,
    commitContributionsLastYear: bundle.commitContributionsLastYear,
    activeDaysLastYear: calendar.activeDays,
    privateContributionsIncluded: bundle.privateContributionsIncluded,
    restrictedContributionsLastYear: bundle.restrictedContributionsLastYear,
  };
}
