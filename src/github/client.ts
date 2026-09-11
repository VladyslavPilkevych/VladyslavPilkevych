import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const API_ROOT = 'https://api.github.com';
const GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
const USER_AGENT = 'terminal-profile-generator';
const MAX_ATTEMPTS = 4;

export class GitHubApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
  }
}

export interface TokenInfo {
  token: string | null;
  source: 'PROFILE_GITHUB_TOKEN' | 'GITHUB_TOKEN' | 'none';
}

export function resolveToken(env: NodeJS.ProcessEnv = process.env): TokenInfo {
  const personal = env.PROFILE_GITHUB_TOKEN?.trim();
  if (personal) return { token: personal, source: 'PROFILE_GITHUB_TOKEN' };
  const actions = env.GITHUB_TOKEN?.trim();
  if (actions) return { token: actions, source: 'GITHUB_TOKEN' };
  return { token: null, source: 'none' };
}

interface CacheOptions {
  directory: string | null;
}

function cacheKey(parts: string[]): string {
  return createHash('sha256').update(parts.join(' ')).digest('hex').slice(0, 40);
}

async function readCache(options: CacheOptions, key: string): Promise<string | null> {
  if (!options.directory) return null;
  try {
    return await readFile(join(options.directory, `${key}.cache`), 'utf8');
  } catch {
    return null;
  }
}

async function writeCache(options: CacheOptions, key: string, value: string): Promise<void> {
  if (!options.directory) return;
  const path = join(options.directory, `${key}.cache`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, 'utf8');
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export interface GitHubClientOptions {
  token: string | null;
  cacheDirectory?: string | null;
}

export class GitHubClient {
  private readonly token: string | null;
  private readonly cache: CacheOptions;
  private readonly memory = new Map<string, unknown>();

  constructor(options: GitHubClientOptions) {
    this.token = options.token;
    this.cache = { directory: options.cacheDirectory ?? null };
  }

  get hasToken(): boolean {
    return this.token !== null;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'user-agent': USER_AGENT,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      ...extra,
    };
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    return headers;
  }

  private async request(url: string, init: RequestInit, label: string): Promise<Response> {
    let lastError: GitHubApiError | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(url, init);
      } catch (cause) {
        lastError = new GitHubApiError(
          `Network failure while calling ${label}: ${errorMessage(cause)}`,
        );
        await delay(attempt * 500);
        continue;
      }
      if (response.ok) return response;
      const remaining = response.headers.get('x-ratelimit-remaining');
      if (response.status === 403 && remaining === '0') {
        throw new GitHubApiError(
          `GitHub rate limit exhausted while calling ${label}. ` +
            'Set PROFILE_GITHUB_TOKEN or GITHUB_TOKEN to raise the limit.',
          response.status,
        );
      }
      if (response.status === 404) {
        throw new GitHubApiError(`GitHub returned 404 for ${label}.`, 404);
      }
      if (response.status === 401) {
        throw new GitHubApiError(
          `GitHub rejected the token while calling ${label} (401). Check the token and its scopes.`,
          401,
        );
      }
      if (response.status < 500 && response.status !== 429) {
        const detail = await safeErrorBody(response);
        throw new GitHubApiError(
          `GitHub request to ${label} failed with ${String(response.status)}. ${detail}`,
          response.status,
        );
      }
      lastError = new GitHubApiError(
        `GitHub request to ${label} failed with ${String(response.status)}.`,
        response.status,
      );
      await delay(attempt * 750);
    }
    throw lastError ?? new GitHubApiError(`GitHub request to ${label} failed.`);
  }

  async rest<T>(path: string): Promise<T> {
    const url = path.startsWith('http') ? path : `${API_ROOT}${path}`;
    const memoryKey = `rest:${url}`;
    if (this.memory.has(memoryKey)) return this.memory.get(memoryKey) as T;
    const key = cacheKey(['rest', url, this.token ? 'auth' : 'anon']);
    const cached = await readCache(this.cache, key);
    if (cached !== null) {
      const parsed = JSON.parse(cached) as T;
      this.memory.set(memoryKey, parsed);
      return parsed;
    }
    const response = await this.request(url, { headers: this.headers() }, `REST ${path}`);
    const body = await response.text();
    await writeCache(this.cache, key, body);
    const parsed = JSON.parse(body) as T;
    this.memory.set(memoryKey, parsed);
    return parsed;
  }

  async graphql<T>(query: string, variables: Record<string, unknown>, label: string): Promise<T> {
    if (!this.token) {
      throw new GitHubApiError('The GitHub GraphQL API requires a token.', 401);
    }
    const body = JSON.stringify({ query, variables });
    const memoryKey = `gql:${label}:${body}`;
    if (this.memory.has(memoryKey)) return this.memory.get(memoryKey) as T;
    const key = cacheKey(['graphql', body, 'auth']);
    const cached = await readCache(this.cache, key);
    let raw = cached;
    if (raw === null) {
      const response = await this.request(
        GRAPHQL_ENDPOINT,
        {
          method: 'POST',
          headers: this.headers({ 'content-type': 'application/json' }),
          body,
        },
        `GraphQL ${label}`,
      );
      raw = await response.text();
      await writeCache(this.cache, key, raw);
    }
    const payload = JSON.parse(raw) as {
      data?: T;
      errors?: { message?: string; type?: string }[];
    };
    if (payload.errors && payload.errors.length > 0) {
      const messages = payload.errors
        .map((entry) => entry.message ?? entry.type ?? 'unknown error')
        .join('; ');
      throw new GitHubApiError(`GraphQL query "${label}" failed: ${messages}`);
    }
    if (!payload.data) {
      throw new GitHubApiError(`GraphQL query "${label}" returned no data.`);
    }
    this.memory.set(memoryKey, payload.data);
    return payload.data;
  }

  async text(url: string, label: string): Promise<string> {
    const key = cacheKey(['text', url]);
    const cached = await readCache(this.cache, key);
    if (cached !== null) return cached;
    const response = await this.request(
      url,
      { headers: { 'user-agent': USER_AGENT, accept: 'text/html' } },
      label,
    );
    const body = await response.text();
    await writeCache(this.cache, key, body);
    return body;
  }

  async binary(url: string, label: string): Promise<Buffer> {
    const key = cacheKey(['binary', url]);
    const cached = await readCache(this.cache, key);
    if (cached !== null) return Buffer.from(cached, 'base64');
    const response = await this.request(url, { headers: { 'user-agent': USER_AGENT } }, label);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeCache(this.cache, key, buffer.toString('base64'));
    return buffer;
  }
}

async function safeErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    const parsed = JSON.parse(text) as { message?: string };
    return parsed.message ?? '';
  } catch {
    return '';
  }
}

export function errorMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return String(cause);
}
