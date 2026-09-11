# Terminal profile generator

This repository renders its own GitHub profile. A TypeScript generator reads live data from the
GitHub API, converts the account avatar into ASCII art, lays everything out as a terminal screen and
writes two static SVG files that the root `README.md` displays.

There is no server, no hosting and no third-party README service. The only runtime is GitHub Actions,
and the only artefacts are `generated/profile-dark.svg` and `generated/profile-light.svg`.

## Commands

```bash
pnpm install        # install dependencies from the lockfile
pnpm generate       # fetch live GitHub data and write generated/*.svg
pnpm generate:fixture  # render from fixtures/profile.fixture.ts, no network access
pnpm test           # vitest
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint
pnpm format         # prettier --write
pnpm check          # typecheck + lint + format:check + test
```

Useful environment variables:

| Variable               | Purpose                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `PROFILE_GITHUB_TOKEN` | Optional personal access token. Preferred when present.                                                         |
| `GITHUB_TOKEN`         | Fallback token. Set automatically inside GitHub Actions.                                                        |
| `PROFILE_HTTP_CACHE`   | Directory for caching HTTP responses during local development, for example `.cache/http`. Never set this in CI. |

## Architecture

```
profile.config.ts            typed configuration, the only file with personal values
        |
src/github/*                 GitHub REST + GraphQL access
src/avatar/*                 avatar download and ASCII conversion
        |
src/data/buildProfileData.ts normalised ProfileData model
        |
src/renderer/*               TSX components that emit an SVG element tree
src/svg/*                    JSX runtime and serializer that escapes by construction
        |
src/validate/validateSvg.ts  structural checks on the produced document
        |
generated/profile-*.svg      committed output rendered by README.md
```

Rendering components never call the network. They receive the fully normalised `ProfileData` model
and return SVG nodes, which makes the renderer testable against `fixtures/profile.fixture.ts`.

### Monospace alignment

The design depends on aligned columns, but an SVG displayed on GitHub is rendered with whatever
monospace font the viewer happens to have. Every text run therefore carries an explicit
`textLength` equal to `characterCount * cellWidth` together with `lengthAdjust="spacingAndGlyphs"`.
The renderer fixes the exact pixel width of each run, so columns line up on any machine and text can
never overflow its column, regardless of which font resolves from the stack. No font files are
downloaded at render time or embedded in the output.

## ASCII avatar pipeline

`src/avatar/` converts the real GitHub avatar into characters. Every stage is configurable under
`avatar` in `profile.config.ts`, and each step is a pure, tested function except the two that use
`sharp` for decoding and resampling.

1. **Download** — the avatar URL reported by the GitHub API, requested at `s=460`.
2. **Decode** — `sharp` decodes any format GitHub serves (PNG, JPEG, GIF, WebP) into raw RGB.
3. **Subject separation** — `mixLuminance` blends luma with chroma according to `subjectBoost`.
   At `0` this is plain Rec.709 luma. Higher values lift saturated pixels, which helps when a
   colourful subject sits on a neutral background.
4. **Crop** — `cropFrame` trims `trimBorder` from each edge and positions the window using
   `focusX` / `focusY`, so the framing can be biased towards a face.
5. **Auto levels** — `normalizeLuminance` clips `normalizeClip` of the histogram at each end and
   stretches the rest across the full range. Without this, a dark avatar maps almost entirely to the
   blank end of the ramp.
6. **Resample** — to `width` columns and a row count derived from `cellAspectRatio`, so a square
   image stays square once character cells are taken into account. `sampling: 'lanczos'` uses
   `sharp`; `sampling: 'box'` uses the pure-TypeScript area average in `resizeBox`.
7. **Tone map** — `adjustLuminance` applies `gamma`, then `contrast` around mid grey, then
   `brightness`, then optional `invert`.
8. **Map to characters** — each value indexes into `characterRamp`, dark to bright.
9. **Trim** — fully blank rows at the top and bottom are dropped so the portrait is framed tightly.

The pipeline is deterministic: the same avatar bytes and the same settings always produce the same
characters.

The current settings were chosen by rendering candidates and comparing them, not by accepting the
first result. If the avatar changes, re-tune `contrast`, `gamma`, `normalizeClip` and `subjectBoost`
and regenerate.

## GitHub data sources

The generator has two modes. With a token it uses GraphQL, which is fewer requests and richer data.
Without one it falls back to public endpoints so the project still runs locally with no setup.

| Displayed value                                     | With a token                                                                 | Without a token                                            |
| --------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Name, company, location, website, avatar, join date | GraphQL `user` fields                                                        | REST `GET /users/{login}`                                  |
| `repositories`                                      | GraphQL `repositories(privacy: PUBLIC, ownerAffiliations: OWNER).totalCount` | REST `public_repos`                                        |
| `stars received`                                    | Sum of `stargazerCount` over owned, non-fork repositories                    | Same, from REST `stargazers_count`                         |
| `forks received`                                    | Sum of `forkCount` over the same set                                         | Same, from REST `forks_count`                              |
| `followers`, `following`                            | GraphQL `followers`/`following` totals                                       | REST `followers`/`following`                               |
| `pull requests opened`                              | GraphQL `user.pullRequests.totalCount`                                       | REST `GET /search/issues?q=author:{login} type:pr`         |
| `issues opened`                                     | GraphQL `user.issues.totalCount`                                             | REST `GET /search/issues?q=author:{login} type:issue`      |
| `commits / last 12m`                                | GraphQL `contributionsCollection.totalCommitContributions`                   | Not available, the row is hidden                           |
| `contributions / last 12m`                          | `contributionsCollection.contributionCalendar` day totals                    | `https://github.com/users/{login}/contributions` day cells |
| `contributions / {year}`                            | A second `contributionsCollection` from 1 January to now                     | Not available, the row is hidden                           |
| Contribution graph                                  | `contributionCalendar.weeks[].contributionDays[]`                            | The same public calendar page                              |
| Language distribution                               | GraphQL `repositories.nodes.languages` byte sizes                            | REST `GET /repos/{owner}/{repo}/languages` per repository  |
| Recent activity                                     | REST `GET /users/{login}/events/public`                                      | Same                                                       |
| Featured repositories                               | Resolved from the repository list already fetched                            | Same                                                       |

Rows whose value cannot be computed are removed from the layout rather than shown as zero or
`unknown`. Missing essential data — the user, the repository list or the contribution calendar —
fails the run instead of producing a profile with invented numbers.

Each generation run makes a handful of requests: two GraphQL queries with a token, or roughly
`3 + N` REST calls without one, where `N` is the number of repositories that need language data.
Responses are memoised per run so nothing is fetched twice.

## Statistics accuracy

Read this before changing any label.

- **Commits.** GitHub does not expose a reliable all-time commit count for a user, so the profile
  never claims one. `commits / last 12m` is `totalCommitContributions` from the contributions
  collection: commits authored in the trailing twelve months to the default branch of repositories
  the account can contribute to. It excludes commits to non-default branches and to repositories the
  viewer cannot see.
- **Contributions.** `contributions / last 12m` is the sum of the contribution calendar, which is
  GitHub's own definition: commits, opened issues, opened pull requests, pull request reviews, and
  repository creation. `contributions / {year}` is the same calendar restricted to the current
  calendar year.
- **Private contributions.** The calendar includes private activity only when the request is made by
  the account itself. The generator compares the GraphQL `viewer.login` with the profile login, and
  records a note when they differ. With the default Actions `GITHUB_TOKEN` they differ, so the
  numbers are public-only. With a `PROFILE_GITHUB_TOKEN` owned by the profile account they match and
  private contributions are included, provided the account has enabled private contributions on its
  profile.
- **Streaks.** Current and longest streaks are computed from the twelve-month calendar in this
  repository, not fetched from GitHub. They therefore cannot report a streak that started before the
  window opens. The current streak tolerates an empty final day, because the current UTC day may not
  be over. Both are labelled inside a section whose header states the twelve-month range.
- **Stars and forks.** Summed over repositories the account owns, excluding forks and anything in
  `github.excludedRepositories`. Stars on a repository the account forked are not counted as stars
  received.
- **Pull requests and issues.** All-time counts of items the account authored, public-only unless a
  personal token with wider visibility is supplied.
- **Recent activity.** The public events API keeps roughly 90 days and at most 300 events, and lists
  public events only. A quiet stretch here does not contradict the contribution counters.
- **Private repositories.** The repository query returns whatever the token can see. With the default
  Actions token that is public repositories only. With a personal token that can read private
  repositories, their language bytes are folded into the distribution as well. Private repository
  names never reach the output: only repositories listed in `featuredRepositories` are named, and
  recent activity comes from the public events feed.

## Language percentages

1. Start from every repository the account owns.
2. Drop forks unless `includeForks`, archived repositories unless `includeArchived`, and anything
   named in `excludedRepositories`. The profile repository itself is excluded by default so the
   generator's own source does not dominate the chart.
3. Sum GitHub's byte count per language across the remaining repositories, skipping any language in
   `excludedLanguages`.
4. `percent = languageBytes / totalBytes * 100`, where `totalBytes` is the sum across all languages
   in step 3.
5. Keep the top `maxLanguages` entries that also reach `minLanguageShare`; fold the rest into
   `groupRemainderAs` when it is set, or drop them when it is `null`.
6. Round with the largest-remainder method so the displayed values still add up to the true total.

These are bytes of code as GitHub's linguist measures them. They describe what is checked into the
account's repositories, not skill or experience. That is why the technology stack is a separate,
hand-written section.

## Contribution graph

- **Window.** The rolling last twelve months. This matches what GitHub shows on a profile page, is
  always full, and does not shrink to a few columns each January the way a calendar year does.
- **Dates.** Every date is handled as a calendar date in UTC. `src/utils/dates.ts` parses
  `YYYY-MM-DD` into year/month/day integers and does arithmetic with `Date.UTC`, so a day can never
  drift into its neighbour through a local timezone or daylight saving change. The grid starts on
  the Sunday of the first week; days before the first returned date stay empty.
- **Levels.** Computed in this repository rather than taken from GitHub, so both data sources agree.
  Zero contributions is level 0. Non-zero days are compared against the 25th, 50th and 75th
  percentiles of all active days in the window to produce levels 1 to 4.
- **Colours.** `theme.<mode>.contribution` holds an `empty` colour plus four level colours. The
  palette is a deep-blue to aqua progression in dark mode and a light-blue to deep-teal progression
  in light mode. It is deliberately not GitHub's green, and the same ramp colours the language bars
  so the two sections read as one system.
- **Legend.** A `less`/`more` swatch row plus the exact date range, so intensity is never conveyed
  by colour alone.

## Tokens

Everything works with the token GitHub Actions provides automatically. A personal access token is
optional and only changes how complete the contribution numbers are.

|                                         | `GITHUB_TOKEN` (default) | `PROFILE_GITHUB_TOKEN` (optional)                 |
| --------------------------------------- | ------------------------ | ------------------------------------------------- |
| Public profile, repositories, languages | yes                      | yes                                               |
| Contribution calendar and graph         | public activity          | public and private activity                       |
| `commits / last 12m`                    | public commits           | includes private commits                          |
| Pull request and issue totals           | public                   | public, plus private where the token can see them |

To enable the richer numbers, create a fine-grained personal access token with read-only access to
your own account (`Account permissions -> Profile: read` is enough for contribution data; add
repository read access if you also want private repositories counted), then add it as a repository
secret named `PROFILE_GITHUB_TOKEN`. Do not grant write scopes. The generator never prints a token,
and `validateSvg` fails the build if a token value or a token-shaped string reaches the output.

Running `pnpm generate` locally with no token at all still works and uses only public endpoints.

## GitHub Actions

`.github/workflows/update-profile.yml`:

- **Schedule** — `17 */6 * * *`, four times a day.
- **Manual** — `workflow_dispatch`.
- **On push to `main`** — only when generator sources change, never for `generated/**`.
- **Permissions** — `contents: read` at workflow level, raised to `contents: write` only for the job
  that pushes.
- **Steps** — checkout, pnpm, Node 22 with a pnpm cache, `pnpm install --frozen-lockfile`,
  `pnpm typecheck && pnpm lint && pnpm test`, `pnpm generate`, then commit only if
  `git diff --quiet -- generated` reports a change.
- **No empty commits** — the commit step is skipped entirely when the SVGs are byte identical.
- **Loop prevention** — three independent guards. Pushes made with the default `GITHUB_TOKEN` do not
  trigger workflow runs; the push trigger ignores `generated/**`; and the commit message carries
  `[skip ci]`.

Because the SVG contains no generation timestamp, a run only produces a commit when the underlying
GitHub data actually changed.

## Configuration

`profile.config.ts` is the only file that should need editing. It is fully typed by
`src/config/types.ts` and validated by `src/config/resolve.ts`, which rejects malformed dates,
invalid logins and non-hex colours, and clamps numeric settings into usable ranges.

| Group            | What it controls                                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `githubUsername` | The account to read.                                                                                                                                                                                      |
| `personal`       | Name, title, email, phone, website, location, company, spoken languages, `codingSince`. Any field may be `null`; the row then disappears from the layout. `personal` values override what GitHub reports. |
| `terminal`       | Prompt identity: username, hostname, shell, prompt symbol, working directory, window title, farewell line.                                                                                                |
| `avatar`         | The whole ASCII pipeline described above.                                                                                                                                                                 |
| `github`         | Repository selection, language grouping and featured repositories.                                                                                                                                        |
| `sections`       | Boolean switch per section. Disabled sections are not rendered and take no space.                                                                                                                         |
| `stack`          | Hand-written technology list. `groups` is used when non-empty, otherwise the flat `technologies` list.                                                                                                    |
| `theme`          | Dark and light palettes, contribution ramp, typography and spacing.                                                                                                                                       |

`personal.codingSince` drives the `UPTIME` row and defaults to the GitHub join date. Set it to when
you actually started writing code. `personal.languages` is for spoken languages and is empty by
default; leave it empty to hide the row.

## Output validation

`pnpm generate` validates both documents before writing them, and the same checks run in tests:

- tag balance and no unescaped angle brackets in text,
- `width`, `height` and `viewBox` present and mutually consistent,
- no `NaN`, `undefined`, `null`, `<script`, `javascript:` or inline event handlers,
- every text run inside the canvas, using its declared `textLength`,
- no token-shaped string and no occurrence of the token actually in use.

The renderer escapes by construction: JSX produces a node tree, and the serializer escapes every
attribute and text node. There is no raw-markup escape hatch, so a repository description, profile
field or configuration string cannot inject SVG.

## Backup and restore

The previous profile is preserved in two independent places:

- `archive/previous-profile/` — the old README, the `Platane/snk` snake workflow and both generated
  snake SVGs. Workflows there are inert, because GitHub only runs files under the repository root
  `.github/workflows/`.
- The `legacy-profile` branch, which points at the commit that was `main` before the redesign.

`archive/previous-profile/README.md` contains step-by-step restore instructions for both routes.
