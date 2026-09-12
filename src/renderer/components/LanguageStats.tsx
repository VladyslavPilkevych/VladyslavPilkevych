import { h, type SvgElement } from '../../svg/jsx.ts';
import type { Palette } from '../../config/types.ts';
import type { LanguageShare } from '../../data/types.ts';
import type { Metrics } from '../layout.ts';
import type { Motion } from '../animation.ts';
import { formatPercent } from '../../utils/numbers.ts';
import { truncate, visualLength } from '../../utils/text.ts';
import { Text } from './primitives.tsx';

export interface LanguageStatsProps {
  x: number;
  y: number;
  width: number;
  entries: LanguageShare[];
  metrics: Metrics;
  palette: Palette;
  motion: Motion;
  begin: number;
  duration: number;
  stagger: number;
}

const LABEL_COLUMNS = 13;
const PERCENT_COLUMNS = 6;
const SEGMENTS = 26;
const BAR_HEIGHT = 9;

export function languageStatsHeight(entries: LanguageShare[], metrics: Metrics): number {
  return entries.length * metrics.lineHeight;
}

export function languageBarColor(
  rank: number,
  palette: Palette,
): { fill: string; opacity: number } {
  const levels = palette.contribution.levels;
  const ordered = [levels[3], levels[2], levels[1], levels[0]];
  if (rank < ordered.length) {
    return { fill: ordered[rank] ?? palette.accent, opacity: 1 };
  }
  const fade = Math.max(0.35, 0.85 - (rank - ordered.length) * 0.16);
  return { fill: levels[0], opacity: fade };
}

export function LanguageStats(props: LanguageStatsProps): SvgElement {
  const { metrics, palette, motion } = props;
  const labelWidth = LABEL_COLUMNS * metrics.cellWidth;
  const percentWidth = PERCENT_COLUMNS * metrics.cellWidth;
  const barX = props.x + labelWidth;
  const barWidth = props.width - labelWidth - percentWidth - 10;

  const rows = props.entries.map((entry, index) => {
    const baseline = props.y + (index + 1) * metrics.lineHeight - 5;
    const barY = baseline - metrics.fontSize + 3;
    const ratio = Math.max(0, Math.min(1, entry.percent / 100));
    const filled = barWidth * ratio;
    const color = languageBarColor(index, palette);
    const percentText = formatPercent(entry.percent, 1);
    const begin = props.begin + index * props.stagger;
    const slits: SvgElement[] = [];
    for (let segment = 1; segment < SEGMENTS; segment += 1) {
      slits.push(
        <rect
          x={barX + (barWidth * segment) / SEGMENTS - 1}
          y={barY}
          width={2}
          height={BAR_HEIGHT}
          fill={palette.background}
        />,
      );
    }
    return (
      <g>
        <g>
          <Text
            x={props.x}
            y={baseline}
            value={truncate(entry.name, LABEL_COLUMNS - 1)}
            fill={palette.text}
            cellWidth={metrics.cellWidth}
          />
          {motion.fadeIn(begin, 0.26)}
        </g>
        <g>
          <rect
            x={barX}
            y={barY}
            width={barWidth}
            height={BAR_HEIGHT}
            rx={1.5}
            fill={palette.barTrack}
          />
          {motion.fadeIn(Math.max(0, begin - 0.08), 0.22)}
        </g>
        {filled > 0 ? (
          <rect
            x={barX}
            y={barY}
            width={filled}
            height={BAR_HEIGHT}
            rx={1.5}
            fill={color.fill}
            opacity={color.opacity}
          >
            {motion.grow('width', begin, props.duration, filled)}
          </rect>
        ) : null}
        {slits}
        <g>
          <Text
            x={props.x + props.width - visualLength(percentText) * metrics.cellWidth}
            y={baseline}
            value={percentText}
            fill={palette.textMuted}
            cellWidth={metrics.cellWidth}
          />
          {motion.fadeIn(begin + props.duration * 0.55, 0.3)}
        </g>
      </g>
    );
  });

  return <g>{rows}</g>;
}
