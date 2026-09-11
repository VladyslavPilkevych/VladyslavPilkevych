import type { GitHubStats } from '../data/types.ts';
import type { StatRow } from './components/GitHubStats.tsx';
import { formatCount } from '../utils/numbers.ts';

export function buildStatRows(stats: GitHubStats, year: number): StatRow[] {
  const rows: (StatRow | null)[] = [
    { label: 'repositories', value: formatCount(stats.publicRepositories) },
    { label: 'stars received', value: formatCount(stats.starsReceived) },
    { label: 'forks received', value: formatCount(stats.forksReceived) },
    { label: 'followers', value: formatCount(stats.followers) },
    { label: 'following', value: formatCount(stats.following) },
    stats.pullRequestsOpened === null
      ? null
      : { label: 'pull requests opened', value: formatCount(stats.pullRequestsOpened) },
    stats.issuesOpened === null
      ? null
      : { label: 'issues opened', value: formatCount(stats.issuesOpened) },
    stats.commitContributionsLastYear === null
      ? null
      : {
          label: 'commits / last 12m',
          value: formatCount(stats.commitContributionsLastYear),
        },
    {
      label: 'contributions / last 12m',
      value: formatCount(stats.contributionsLastYear),
      emphasis: true,
    },
    stats.contributionsThisYear === null
      ? null
      : {
          label: `contributions / ${String(year)}`,
          value: formatCount(stats.contributionsThisYear),
        },
  ];
  return rows.filter((row): row is StatRow => row !== null);
}
