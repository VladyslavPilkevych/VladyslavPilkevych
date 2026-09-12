import { h, type SvgElement } from '../../svg/jsx.ts';
import type { Palette } from '../../config/types.ts';
import type { Metrics } from '../layout.ts';
import type { Motion } from '../animation.ts';
import { visualLength } from '../../utils/text.ts';
import { TokenLine } from './primitives.tsx';

export interface StatRow {
  label: string;
  value: string;
  emphasis?: boolean;
}

export interface GitHubStatsProps {
  x: number;
  y: number;
  width: number;
  rows: StatRow[];
  metrics: Metrics;
  palette: Palette;
  motion: Motion;
  begin: number;
  stagger: number;
}

export function statsHeight(rows: StatRow[], metrics: Metrics): number {
  return rows.length * metrics.lineHeight;
}

export function GitHubStats(props: GitHubStatsProps): SvgElement {
  const { metrics, palette, motion } = props;
  const totalColumns = Math.floor(props.width / metrics.cellWidth);
  const lines = props.rows.map((row, index) => {
    const labelLength = visualLength(row.label);
    const valueLength = visualLength(row.value);
    const leader = Math.max(1, totalColumns - labelLength - valueLength - 2);
    return (
      <g>
        <TokenLine
          x={props.x}
          y={props.y + (index + 1) * metrics.lineHeight - 5}
          cellWidth={metrics.cellWidth}
          tokens={[
            { text: row.label, fill: row.emphasis ? palette.text : palette.textMuted },
            { text: ' ', fill: palette.border },
            { text: '.'.repeat(leader), fill: palette.border },
            { text: ' ', fill: palette.border },
            {
              text: row.value,
              fill: row.emphasis ? palette.accent : palette.text,
              weight: row.emphasis ? 600 : undefined,
            },
          ]}
        />
        {motion.fadeIn(props.begin + index * props.stagger, 0.28)}
      </g>
    );
  });
  return <g>{lines}</g>;
}
