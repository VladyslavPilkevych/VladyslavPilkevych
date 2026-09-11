import type { GitHubConfig } from '../config/types.ts';
import type { Repository } from '../data/types.ts';
import { GitHubApiError, type GitHubClient } from './client.ts';
import { REPOSITORIES_QUERY } from './queries.ts';
import { selectRepositories } from './languages.ts';

interface GraphQlRepositoriesResponse {
  user: {
    repositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: ({
        name: string;
        description: string | null;
        url: string;
        stargazerCount: number;
        forkCount: number;
        isFork: boolean;
        isArchived: boolean;
        isPrivate: boolean;
        pushedAt: string | null;
        primaryLanguage: { name: string } | null;
        languages: { edges: ({ size: number; node: { name: string } } | null)[] };
      } | null)[];
    };
  } | null;
}

interface RestRepository {
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  archived: boolean;
  private: boolean;
  pushed_at: string | null;
  language: string | null;
}

const MAX_PAGES = 10;

export async function fetchRepositories(
  client: GitHubClient,
  login: string,
  config: GitHubConfig,
): Promise<Repository[]> {
  return client.hasToken ? fetchViaGraphQl(client, login) : fetchViaRest(client, login, config);
}

async function fetchViaGraphQl(client: GitHubClient, login: string): Promise<Repository[]> {
  const repositories: Repository[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data: GraphQlRepositoriesResponse = await client.graphql<GraphQlRepositoriesResponse>(
      REPOSITORIES_QUERY,
      { login, cursor },
      `repositories page ${String(page + 1)}`,
    );
    const connection = data.user?.repositories;
    if (!connection) {
      throw new GitHubApiError(`GitHub user "${login}" was not found.`, 404);
    }
    for (const node of connection.nodes) {
      if (!node) continue;
      const languageBytes: Record<string, number> = {};
      for (const edge of node.languages.edges) {
        if (!edge) continue;
        languageBytes[edge.node.name] = (languageBytes[edge.node.name] ?? 0) + edge.size;
      }
      repositories.push({
        name: node.name,
        description: node.description,
        url: node.url,
        stars: node.stargazerCount,
        forks: node.forkCount,
        isFork: node.isFork,
        isArchived: node.isArchived,
        isPrivate: node.isPrivate,
        pushedAt: node.pushedAt,
        primaryLanguage: node.primaryLanguage?.name ?? null,
        languageBytes,
      });
    }
    if (!connection.pageInfo.hasNextPage) break;
    cursor = connection.pageInfo.endCursor;
    if (!cursor) break;
  }
  return repositories;
}

async function fetchViaRest(
  client: GitHubClient,
  login: string,
  config: GitHubConfig,
): Promise<Repository[]> {
  const collected: RestRepository[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const batch = await client.rest<RestRepository[]>(
      `/users/${encodeURIComponent(login)}/repos?per_page=100&type=owner&sort=pushed&page=${String(page)}`,
    );
    collected.push(...batch);
    if (batch.length < 100) break;
  }

  const base: Repository[] = collected.map((entry) => ({
    name: entry.name,
    description: entry.description,
    url: entry.html_url,
    stars: entry.stargazers_count,
    forks: entry.forks_count,
    isFork: entry.fork,
    isArchived: entry.archived,
    isPrivate: entry.private,
    pushedAt: entry.pushed_at,
    primaryLanguage: entry.language,
    languageBytes: {},
  }));

  const needLanguages = new Set(selectRepositories(base, config).map((entry) => entry.name));
  for (const repository of base) {
    if (!needLanguages.has(repository.name)) continue;
    repository.languageBytes = await client.rest<Record<string, number>>(
      `/repos/${encodeURIComponent(login)}/${encodeURIComponent(repository.name)}/languages`,
    );
  }
  return base;
}
