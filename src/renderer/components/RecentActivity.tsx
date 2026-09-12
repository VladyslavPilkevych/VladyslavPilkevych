import { h, type SvgElement } from '../../svg/jsx.ts';
import type { Palette } from '../../config/types.ts';
import type { ActivityEntry } from '../../data/types.ts';
import type { Metrics } from '../layout.ts';
import type { Motion } from '../animation.ts';
import { formatShortDate } from '../../utils/dates.ts';
import { padEnd, truncate } from '../../utils/text.ts';
import { type Token, TokenLine } from './primitives.tsx';

export interface RecentActivityProps {
  x: number;
  y: number;
  width: number;
  entries: ActivityEntry[];
  metrics: Metrics;
  palette: Palette;
  motion: Motion;
  begin: number;
  stagger: number;
}

const DATE_COLUMNS = 7;
const KIND_COLUMNS = 14;

export function recentActivityHeight(entries: ActivityEntry[], metrics: Metrics): number {
  return Math.max(1, entries.length) * metrics.lineHeight;
}

function kindColor(kind: ActivityEntry['kind'], palette: Palette): string {
  switch (kind) {
    case 'push':
      return palette.accent;
    case 'pull request':
      return palette.success;
    case 'release':
      return palette.accentAlt;
    case 'issue':
      return palette.warning;
    default:
      return palette.textMuted;
  }
}

export function RecentActivity(props: RecentActivityProps): SvgElement {
  const { metrics, palette, motion } = props;
  const totalColumns = Math.floor(props.width / metrics.cellWidth);
  const repositoryColumns = Math.max(8, totalColumns - DATE_COLUMNS - KIND_COLUMNS);

  if (props.entries.length === 0) {
    return (
      <g>
        <TokenLine
          x={props.x}
          y={props.y + metrics.lineHeight - 5}
          cellWidth={metrics.cellWidth}
          tokens={[{ text: 'no public events in the last 90 days', fill: palette.textDim }]}
        />
        {motion.fadeIn(props.begin)}
      </g>
    );
  }

  const rows = props.entries.map((entry, index) => {
    const tokens: Token[] = [
      { text: padEnd(formatShortDate(entry.date), DATE_COLUMNS), fill: palette.textDim },
      { text: padEnd(entry.kind, KIND_COLUMNS), fill: kindColor(entry.kind, palette) },
      { text: truncate(entry.repository, repositoryColumns - 1), fill: palette.text },
    ];
    return (
      <g>
        <TokenLine
          x={props.x}
          y={props.y + (index + 1) * metrics.lineHeight - 5}
          cellWidth={metrics.cellWidth}
          tokens={tokens}
        />
        {motion.fadeIn(props.begin + index * props.stagger, 0.28)}
      </g>
    );
  });
  return <g>{rows}</g>;
}
