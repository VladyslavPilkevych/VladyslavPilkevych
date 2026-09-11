import type { ActivityEntry, ActivityKind } from '../data/types.ts';
import { errorMessage, type GitHubClient } from './client.ts';
import { sanitize, truncate } from '../utils/text.ts';

interface RestEvent {
  type: string | null;
  created_at: string;
  repo: { name: string } | null;
  payload: {
    action?: string;
    ref_type?: string;
    size?: number;
    release?: { tag_name?: string };
    pull_request?: { number?: number };
    issue?: { number?: number };
  } | null;
}

export interface ActivityResult {
  entries: ActivityEntry[];
  note: string | null;
}

function shortRepository(fullName: string, login: string): string {
  const prefix = `${login.toLowerCase()}/`;
  return fullName.toLowerCase().startsWith(prefix) ? fullName.slice(prefix.length) : fullName;
}

export function mapEvent(event: RestEvent, login: string): ActivityEntry | null {
  const repository = event.repo?.name;
  if (!repository || !event.type) return null;
  const date = event.created_at.slice(0, 10);
  const name = truncate(sanitize(shortRepository(repository, login)), 28);
  const payload = event.payload ?? {};

  const build = (kind: ActivityKind, detail: string | null): ActivityEntry => ({
    date,
    kind,
    repository: name,
    detail,
  });

  switch (event.type) {
    case 'PushEvent': {
      const size = payload.size ?? 0;
      return build('push', size > 0 ? `${String(size)} commit${size === 1 ? '' : 's'}` : null);
    }
    case 'PullRequestEvent': {
      if (payload.action !== 'opened' && payload.action !== 'closed') return null;
      const number = payload.pull_request?.number;
      return build(
        'pull request',
        number ? `#${String(number)} ${payload.action}` : payload.action,
      );
    }
    case 'PullRequestReviewEvent':
      return build('review', null);
    case 'IssuesEvent': {
      if (payload.action !== 'opened' && payload.action !== 'closed') return null;
      const number = payload.issue?.number;
      return build('issue', number ? `#${String(number)} ${payload.action}` : payload.action);
    }
    case 'ReleaseEvent': {
      const tag = payload.release?.tag_name;
      return build('release', tag ? truncate(sanitize(tag), 14) : null);
    }
    case 'CreateEvent': {
      const refType = payload.ref_type;
      if (refType !== 'repository' && refType !== 'tag') return null;
      return build('create', refType);
    }
    case 'ForkEvent':
      return build('fork', null);
    case 'WatchEvent':
      return build('star', null);
    default:
      return null;
  }
}

export function collapseActivity(entries: ActivityEntry[], limit: number): ActivityEntry[] {
  const seen = new Set<string>();
  const result: ActivityEntry[] = [];
  for (const entry of entries) {
    const key = `${entry.date}|${entry.kind}|${entry.repository}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
    if (result.length >= limit) break;
  }
  return result;
}

export async function fetchRecentActivity(
  client: GitHubClient,
  login: string,
  limit: number,
): Promise<ActivityResult> {
  try {
    const events = await client.rest<RestEvent[]>(
      `/users/${encodeURIComponent(login)}/events/public?per_page=100`,
    );
    const mapped = events
      .map((event) => mapEvent(event, login))
      .filter((entry): entry is ActivityEntry => entry !== null)
      .sort((left, right) => right.date.localeCompare(left.date));
    return { entries: collapseActivity(mapped, limit), note: null };
  } catch (cause) {
    return {
      entries: [],
      note: `Recent activity was skipped: ${errorMessage(cause)}`,
    };
  }
}
