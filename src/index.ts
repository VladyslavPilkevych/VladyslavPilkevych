import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import profileConfig from '../profile.config.ts';
import { resolveConfig } from './config/resolve.ts';
import type { ThemeName } from './config/types.ts';
import { buildProfileData } from './data/buildProfileData.ts';
import type { ProfileData } from './data/types.ts';
import { GitHubClient, errorMessage, resolveToken } from './github/client.ts';
import { renderProfile } from './renderer/renderProfile.tsx';
import { validateSvg } from './validate/validateSvg.ts';

const THEMES: ThemeName[] = ['dark', 'light'];
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface CliOptions {
  useFixture: boolean;
  outputDirectory: string;
}

export function parseArguments(argv: string[]): CliOptions {
  let useFixture = false;
  let outputDirectory = resolve(PROJECT_ROOT, 'generated');
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--fixture') {
      useFixture = true;
    } else if (argument === '--out') {
      const value = argv[index + 1];
      if (!value) throw new Error('--out requires a directory path.');
      outputDirectory = resolve(PROJECT_ROOT, value);
      index += 1;
    }
  }
  return { useFixture, outputDirectory };
}

async function loadData(options: CliOptions): Promise<{ data: ProfileData; token: string | null }> {
  if (options.useFixture) {
    const { fixtureProfileData } = await import('../fixtures/profile.fixture.ts');
    return { data: fixtureProfileData, token: null };
  }
  const config = resolveConfig(profileConfig);
  const { token, source } = resolveToken();
  const client = new GitHubClient({
    token,
    cacheDirectory: process.env.PROFILE_HTTP_CACHE ?? null,
  });
  console.log(
    token
      ? `Using GitHub token from ${source}.`
      : 'No GitHub token found. Falling back to public endpoints with reduced statistics.',
  );
  const data = await buildProfileData(client, config);
  return { data, token };
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const config = resolveConfig(profileConfig);
  const { data, token } = await loadData(options);

  await mkdir(options.outputDirectory, { recursive: true });
  for (const theme of THEMES) {
    const svg = renderProfile(data, config, theme);
    validateSvg({
      svg,
      label: `generated/profile-${theme}.svg`,
      secrets: token ? [token] : [],
    });
    const target = resolve(options.outputDirectory, `profile-${theme}.svg`);
    await writeFile(target, svg, 'utf8');
    console.log(`Wrote ${target} (${String(svg.length)} bytes).`);
  }

  if (data.notes.length > 0) {
    console.log('\nNotes:');
    for (const note of data.notes) console.log(`  - ${note}`);
  }
  console.log(
    `\nContribution window ${data.contributions.from} .. ${data.contributions.to} ` +
      `(${String(data.contributions.total)} contributions, source: ${data.contributions.source}).`,
  );
}

main().catch((cause: unknown) => {
  console.error(`Profile generation failed: ${errorMessage(cause)}`);
  process.exitCode = 1;
});
