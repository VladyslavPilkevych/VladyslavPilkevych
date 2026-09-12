import { h, type SvgChild } from '../svg/jsx.ts';
import { serializeDocument } from '../svg/serialize.ts';
import type { Palette, ProfileConfig, ThemeName } from '../config/types.ts';
import type { ProfileData } from '../data/types.ts';
import { buildMetrics, resolvePalette, splitColumns, type Metrics } from './layout.ts';
import { createMotion, type Motion } from './animation.ts';
import { buildTimeline, type Timeline } from './timeline.ts';
import { buildStatRows } from './statRows.ts';
import { SectionHeader, sectionHeaderHeight } from './components/SectionHeader.tsx';
import { TerminalChrome } from './components/TerminalChrome.tsx';
import { ASCII_SCAN_GRADIENT_ID, AsciiScanGradient } from './components/AsciiAvatar.tsx';
import { IdentityPanel, identityPanelHeight } from './components/Identity.tsx';
import { GitHubStats, statsHeight } from './components/GitHubStats.tsx';
import { LanguageStats, languageStatsHeight } from './components/LanguageStats.tsx';
import { TechStack, stackRows, techStackHeight } from './components/TechStack.tsx';
import { ContributionGraph, contributionGraphHeight } from './components/ContributionGraph.tsx';
import { RecentActivity, recentActivityHeight } from './components/RecentActivity.tsx';
import { FeaturedRepositories, featuredHeight } from './components/FeaturedRepositories.tsx';
import { Footer, footerHeight } from './components/Footer.tsx';
import { Rule } from './components/primitives.tsx';
import { parseCalendarDate } from '../utils/dates.ts';
import { formatCount } from '../utils/numbers.ts';

const ASCII_GRADIENT_ID = 'tp-portrait';

interface SectionContext {
  nodes: SvgChild[];
  cursor: number;
  dividers: number[];
}

interface SectionOptions {
  command: string;
  note: string | null;
  bodyHeight: number;
  headerBegin: number;
  body: (y: number) => SvgChild;
  idPrefix: string;
}

function section(
  context: SectionContext,
  metrics: Metrics,
  palette: Palette,
  motion: Motion,
  promptSymbol: string,
  options: SectionOptions,
): void {
  if (context.nodes.length > 0) {
    context.dividers.push(context.cursor - metrics.sectionGap / 2);
  }
  context.nodes.push(
    <SectionHeader
      x={metrics.contentLeft}
      y={context.cursor}
      width={metrics.innerWidth}
      command={options.command}
      promptSymbol={promptSymbol}
      note={options.note}
      metrics={metrics}
      palette={palette}
      motion={motion}
      begin={options.headerBegin}
      idPrefix={options.idPrefix}
    />,
  );
  const bodyY = context.cursor + sectionHeaderHeight(metrics);
  context.nodes.push(options.body(bodyY));
  context.cursor = bodyY + options.bodyHeight + metrics.sectionGap;
}

export function renderProfile(data: ProfileData, config: ProfileConfig, theme: ThemeName): string {
  const metrics = buildMetrics(config);
  const palette = resolvePalette(config, theme);
  const motion = createMotion(config.animation);
  const timeline: Timeline = buildTimeline(config.animation);
  const context: SectionContext = {
    nodes: [],
    cursor: metrics.chromeHeight + metrics.padding,
    dividers: [],
  };

  const year = parseCalendarDate(data.contributions.to).year;
  const statRows = buildStatRows(data.stats, year);

  const portrait = config.sections.asciiAvatar ? data.ascii : null;
  const identityFields = config.sections.identity ? data.identityFields : [];

  if (portrait || identityFields.length > 0) {
    section(context, metrics, palette, motion, config.terminal.promptSymbol, {
      command: 'whoami --system',
      note: `github.com/${data.identity.login}`,
      headerBegin: timeline.hero.header,
      idPrefix: 'tp-hero',
      bodyHeight: identityPanelHeight(portrait, identityFields, metrics),
      body: (y) => (
        <IdentityPanel
          x={metrics.contentLeft}
          y={y}
          width={metrics.innerWidth}
          portrait={portrait}
          fields={identityFields}
          login={data.identity.login}
          terminal={config.terminal}
          metrics={metrics}
          palette={palette}
          motion={motion}
          portraitFill={`url(#${ASCII_GRADIENT_ID})`}
          begin={timeline.identity.body}
          avatarBegin={timeline.avatar.begin}
          avatarDuration={timeline.avatar.duration}
          stagger={timeline.identity.stagger}
        />
      ),
    });
  }

  const showStats = config.sections.githubStats && statRows.length > 0;
  const showLanguages = config.sections.languageStats && data.languages.entries.length > 0;
  if (showStats || showLanguages) {
    const columns = splitColumns(metrics, [1, 1]);
    const left = columns[0];
    const right = columns[1];
    section(context, metrics, palette, motion, config.terminal.promptSymbol, {
      command: 'gh stats --telemetry',
      note: showLanguages
        ? `${String(data.languages.repositoriesCounted)} repositories analysed`
        : null,
      headerBegin: timeline.stats.header,
      idPrefix: 'tp-stats',
      bodyHeight: Math.max(
        showStats ? statsHeight(statRows, metrics) : 0,
        showLanguages ? languageStatsHeight(data.languages.entries, metrics) : 0,
      ),
      body: (y) => (
        <g>
          {showStats && left ? (
            <GitHubStats
              x={left.x}
              y={y}
              width={left.width}
              rows={statRows}
              metrics={metrics}
              palette={palette}
              motion={motion}
              begin={timeline.stats.body}
              stagger={timeline.stats.stagger}
            />
          ) : null}
          {showLanguages && right ? (
            <LanguageStats
              x={right.x}
              y={y}
              width={right.width}
              entries={data.languages.entries}
              metrics={metrics}
              palette={palette}
              motion={motion}
              begin={timeline.bars.begin}
              duration={timeline.bars.duration}
              stagger={timeline.bars.stagger}
            />
          ) : null}
        </g>
      ),
    });
  }

  if (config.sections.techStack && stackRows(config.stack).length > 0) {
    section(context, metrics, palette, motion, config.terminal.promptSymbol, {
      command: 'stack --list',
      note: 'configured by hand, not inferred',
      headerBegin: timeline.stack.header,
      idPrefix: 'tp-stackcmd',
      bodyHeight: techStackHeight(config.stack, metrics),
      body: (y) => (
        <TechStack
          x={metrics.contentLeft}
          y={y}
          width={metrics.innerWidth}
          stack={config.stack}
          metrics={metrics}
          palette={palette}
          motion={motion}
          begin={timeline.stack.body}
          stagger={timeline.stack.stagger}
        />
      ),
    });
  }

  if (config.sections.contributionGraph) {
    const note =
      `${formatCount(data.contributions.total)} contributions  ·  ` +
      `${formatCount(data.stats.activeDaysLastYear)} active days  ·  ` +
      `streak ${String(data.streaks.current)}d / max ${String(data.streaks.longest)}d`;
    section(context, metrics, palette, motion, config.terminal.promptSymbol, {
      command: 'gh contributions --range 12m',
      note,
      headerBegin: timeline.graph.header,
      idPrefix: 'tp-graph',
      bodyHeight: contributionGraphHeight(data.contributions, metrics.innerWidth, metrics),
      body: (y) => (
        <ContributionGraph
          x={metrics.contentLeft}
          y={y}
          width={metrics.innerWidth}
          calendar={data.contributions}
          metrics={metrics}
          palette={palette}
          motion={motion}
          begin={timeline.graph.body}
          duration={timeline.graph.duration}
        />
      ),
    });
  }

  const showActivity = config.sections.recentActivity;
  const showFeatured = config.sections.featuredRepositories && data.featured.length > 0;
  if (showActivity || showFeatured) {
    const columns = splitColumns(metrics, [1, 1]);
    const left = columns[0];
    const right = columns[1];
    section(context, metrics, palette, motion, config.terminal.promptSymbol, {
      command: 'git log --recent',
      note: 'public events',
      headerBegin: timeline.activity.header,
      idPrefix: 'tp-activity',
      bodyHeight: Math.max(
        showActivity ? recentActivityHeight(data.activity, metrics) : 0,
        showFeatured ? featuredHeight(data.featured, metrics) : 0,
      ),
      body: (y) => (
        <g>
          {showActivity && left ? (
            <RecentActivity
              x={left.x}
              y={y}
              width={left.width}
              entries={data.activity}
              metrics={metrics}
              palette={palette}
              motion={motion}
              begin={timeline.activity.body}
              stagger={timeline.activity.stagger}
            />
          ) : null}
          {showFeatured && right ? (
            <FeaturedRepositories
              x={right.x}
              y={y}
              width={right.width}
              repositories={data.featured}
              metrics={metrics}
              palette={palette}
              motion={motion}
              begin={timeline.activity.body}
              stagger={timeline.activity.stagger}
            />
          ) : null}
        </g>
      ),
    });
  }

  const footerTop = context.cursor;
  context.dividers.push(footerTop - metrics.sectionGap / 2);
  context.nodes.push(
    <Footer
      x={metrics.contentLeft}
      y={footerTop}
      width={metrics.innerWidth}
      terminal={config.terminal}
      metrics={metrics}
      palette={palette}
      motion={motion}
      begin={timeline.footer}
    />,
  );
  const totalHeight = Math.round(
    footerTop + footerHeight(config.terminal, metrics) + metrics.padding,
  );

  const dividers = context.dividers.map((y) => (
    <Rule
      x={metrics.contentLeft}
      y={Math.round(y)}
      width={metrics.innerWidth}
      color={palette.border}
      opacity={0.55}
    />
  ));

  const displayName = data.identity.name ?? data.identity.login;
  const document = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={metrics.width}
      height={totalHeight}
      viewBox={`0 0 ${String(metrics.width)} ${String(totalHeight)}`}
      role="img"
      aria-labelledby="profile-title profile-description"
      font-family={metrics.fontFamily}
      font-size={metrics.fontSize}
    >
      <title id="profile-title">{`${displayName} — terminal GitHub profile`}</title>
      <desc id="profile-description">{buildDescription(data)}</desc>
      <defs>
        <linearGradient id={ASCII_GRADIENT_ID} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stop-color={palette.text} />
          <stop offset="55%" stop-color={palette.textMuted} />
          <stop offset="100%" stop-color={palette.accent} />
        </linearGradient>
        <AsciiScanGradient id={ASCII_SCAN_GRADIENT_ID} palette={palette} />
      </defs>
      <rect
        x={0.5}
        y={0.5}
        width={metrics.width - 1}
        height={totalHeight - 1}
        rx={metrics.cornerRadius}
        ry={metrics.cornerRadius}
        fill={palette.background}
        stroke={palette.border}
      />
      <TerminalChrome
        metrics={metrics}
        palette={palette}
        terminal={config.terminal}
        motion={motion}
        begin={timeline.chrome}
      />
      {dividers}
      {context.nodes}
    </svg>
  );

  return serializeDocument(document);
}

function buildDescription(data: ProfileData): string {
  const parts = [
    `GitHub profile for ${data.identity.login}.`,
    `${String(data.stats.publicRepositories)} public repositories,`,
    `${String(data.stats.followers)} followers,`,
    `${String(data.contributions.total)} contributions between ${data.contributions.from} and ${data.contributions.to}.`,
  ];
  if (data.languages.entries.length > 0) {
    const top = data.languages.entries[0];
    if (top) parts.push(`Most used language: ${top.name} at ${String(top.percent)} percent.`);
  }
  return parts.join(' ');
}
