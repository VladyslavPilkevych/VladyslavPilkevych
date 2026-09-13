import { h, type SvgElement } from '../../svg/jsx.ts';
import type { Palette } from '../../config/types.ts';
import type { Metrics } from '../layout.ts';
import type { Motion } from '../animation.ts';
import { truncate, visualLength } from '../../utils/text.ts';
import { TokenLine } from './primitives.tsx';

export interface KeyValueRow {
  key: string;
  value: string;
}

export interface TerminalKeyValueProps {
  x: number;
  y: number;
  width: number;
  rows: KeyValueRow[];
  metrics: Metrics;
  palette: Palette;
  motion: Motion;
  begin: number;
  stagger: number;
}

const MIN_LEADER = 10;
const MIN_FIELD = 20;
const GAP = 1;

export function terminalKeyValueHeight(rowCount: number, metrics: Metrics): number {
  return rowCount * metrics.lineHeight;
}

export function leaderColumns(rows: KeyValueRow[]): number {
  const longestKey = rows.reduce((widest, row) => Math.max(widest, visualLength(row.key)), 0);
  return Math.max(MIN_FIELD, longestKey + GAP * 2 + MIN_LEADER);
}

export function buildLeader(key: string, field: number): string {
  const dots = field - visualLength(key) - GAP * 2;
  return dots > 0 ? '.'.repeat(dots) : '';
}

export function TerminalKeyValue(props: TerminalKeyValueProps): SvgElement {
  const { metrics, palette, motion } = props;
  const totalColumns = Math.floor(props.width / metrics.cellWidth);
  const field = leaderColumns(props.rows);
  const valueColumns = Math.max(8, totalColumns - field - GAP);

  const lines = props.rows.map((row, index) => (
    <g>
      <TokenLine
        x={props.x}
        y={props.y + (index + 1) * metrics.lineHeight - 5}
        cellWidth={metrics.cellWidth}
        tokens={[
          { text: row.key, fill: palette.textMuted },
          { text: ' ', fill: palette.border },
          { text: buildLeader(row.key, field), fill: palette.border },
          { text: ' ', fill: palette.border },
          { text: truncate(row.value, valueColumns), fill: palette.text, weight: 500 },
        ]}
      />
      {motion.fadeIn(props.begin + index * props.stagger, 0.28)}
    </g>
  ));

  return <g>{lines}</g>;
}
