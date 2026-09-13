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

export interface LeaderLayout {
  leader: string;
  value: string;
}

const MIN_LEADER = 4;
const GAP = 1;

export function terminalKeyValueHeight(rowCount: number, metrics: Metrics): number {
  return rowCount * metrics.lineHeight;
}

export function layoutLeaderRow(
  key: string,
  value: string,
  totalColumns: number,
  minLeader = MIN_LEADER,
): LeaderLayout {
  const keyLength = visualLength(key);
  const budget = totalColumns - keyLength - GAP * 2 - minLeader;
  const trimmed = truncate(value, Math.max(1, budget));
  const leader = Math.max(minLeader, totalColumns - keyLength - GAP * 2 - visualLength(trimmed));
  return { leader: '.'.repeat(leader), value: trimmed };
}

export function TerminalKeyValue(props: TerminalKeyValueProps): SvgElement {
  const { metrics, palette, motion } = props;
  const totalColumns = Math.floor(props.width / metrics.cellWidth);

  const lines = props.rows.map((row, index) => {
    const { leader, value } = layoutLeaderRow(row.key, row.value, totalColumns);
    return (
      <g>
        <TokenLine
          x={props.x}
          y={props.y + (index + 1) * metrics.lineHeight - 5}
          cellWidth={metrics.cellWidth}
          tokens={[
            { text: row.key, fill: palette.textMuted },
            { text: ' ', fill: palette.border },
            { text: leader, fill: palette.border },
            { text: ' ', fill: palette.border },
            { text: value, fill: palette.text, weight: 500 },
          ]}
        />
        {motion.fadeIn(props.begin + index * props.stagger, 0.28)}
      </g>
    );
  });

  return <g>{lines}</g>;
}
