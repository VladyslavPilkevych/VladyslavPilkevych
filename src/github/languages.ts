import type { GitHubConfig } from '../config/types.ts';
import type { LanguageBreakdown, LanguageShare, Repository } from '../data/types.ts';
import { largestRemainderRound } from '../utils/numbers.ts';

export function selectRepositories(
  repositories: Repository[],
  config: Pick<GitHubConfig, 'excludedRepositories' | 'includeForks' | 'includeArchived'>,
): Repository[] {
  const excluded = new Set(config.excludedRepositories.map((name) => name.toLowerCase()));
  return repositories.filter((repository) => {
    if (excluded.has(repository.name.toLowerCase())) return false;
    if (!config.includeForks && repository.isFork) return false;
    if (!config.includeArchived && repository.isArchived) return false;
    return true;
  });
}

export function aggregateLanguageBytes(
  repositories: Repository[],
  excludedLanguages: string[],
): Map<string, number> {
  const ignored = new Set(excludedLanguages.map((name) => name.toLowerCase()));
  const totals = new Map<string, number>();
  for (const repository of repositories) {
    for (const [language, bytes] of Object.entries(repository.languageBytes)) {
      if (bytes <= 0) continue;
      if (ignored.has(language.toLowerCase())) continue;
      totals.set(language, (totals.get(language) ?? 0) + bytes);
    }
  }
  return totals;
}

export function buildLanguageBreakdown(
  repositories: Repository[],
  config: GitHubConfig,
): LanguageBreakdown {
  const selected = selectRepositories(repositories, config);
  const totals = aggregateLanguageBytes(selected, config.excludedLanguages);
  const totalBytes = [...totals.values()].reduce((sum, bytes) => sum + bytes, 0);
  if (totalBytes === 0) {
    return { entries: [], totalBytes: 0, repositoriesCounted: selected.length };
  }

  const ranked = [...totals.entries()]
    .map(([name, bytes]) => ({ name, bytes }))
    .sort((left, right) => right.bytes - left.bytes || left.name.localeCompare(right.name));

  const limit = Math.max(1, config.maxLanguages);
  const minimumShare = Math.max(0, config.minLanguageShare);
  const primary: { name: string; bytes: number }[] = [];
  let remainderBytes = 0;

  for (const entry of ranked) {
    const share = (entry.bytes / totalBytes) * 100;
    if (primary.length < limit && share >= minimumShare) {
      primary.push(entry);
    } else {
      remainderBytes += entry.bytes;
    }
  }

  const grouped = [...primary];
  if (remainderBytes > 0 && config.groupRemainderAs) {
    grouped.push({ name: config.groupRemainderAs, bytes: remainderBytes });
  }

  const shares = grouped.map((entry) => (entry.bytes / totalBytes) * 100);
  const rounded = largestRemainderRound(shares, 1);
  const entries: LanguageShare[] = grouped.map((entry, index) => ({
    name: entry.name,
    bytes: entry.bytes,
    percent: rounded[index] ?? 0,
  }));

  return { entries, totalBytes, repositoriesCounted: selected.length };
}
