import { h, type SvgChild, type SvgElement } from '../../svg/jsx.ts';
import type { Palette } from '../../config/types.ts';
import type { AsciiPortrait } from '../../data/types.ts';
import type { Metrics } from '../layout.ts';
import { seconds, type Motion } from '../animation.ts';
import { Text } from './primitives.tsx';

export interface AsciiAvatarProps {
  x: number;
  y: number;
  portrait: AsciiPortrait;
  metrics: Metrics;
  palette: Palette;
  motion: Motion;
  fill: string;
  begin: number;
  duration: number;
}

const ROW_FADE = 0.16;
const SCAN_HEIGHT = 12;

export const ASCII_SCAN_GRADIENT_ID = 'tp-scan';

export function asciiAvatarWidth(portrait: AsciiPortrait, metrics: Metrics): number {
  return portrait.columns * metrics.asciiCellWidth;
}

export function asciiAvatarHeight(portrait: AsciiPortrait, metrics: Metrics): number {
  return portrait.lines * metrics.asciiLineHeight;
}

export function AsciiScanGradient(props: { id: string; palette: Palette }): SvgElement {
  return (
    <linearGradient id={props.id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color={props.palette.accent} stop-opacity="0" />
      <stop offset="65%" stop-color={props.palette.accent} stop-opacity="0.14" />
      <stop offset="100%" stop-color={props.palette.accent} stop-opacity="0.4" />
    </linearGradient>
  );
}

export function AsciiAvatar(props: AsciiAvatarProps): SvgElement {
  const { metrics, portrait, motion, palette } = props;
  const width = asciiAvatarWidth(portrait, metrics);
  const height = asciiAvatarHeight(portrait, metrics);
  const lastIndex = Math.max(1, portrait.lines - 1);
  const rowStep = portrait.lines > 1 ? props.duration / lastIndex : 0;
  const finish = props.begin + props.duration;

  const rows = portrait.rows.map((row, index) => {
    const line = (
      <Text
        x={props.x}
        y={props.y + (index + 1) * metrics.asciiLineHeight}
        value={row}
        fill={props.fill}
        cellWidth={metrics.asciiCellWidth}
        fontSize={metrics.asciiFontSize}
      />
    );
    if (!motion.enabled || row.trim().length === 0) return line;
    return (
      <g>
        {line}
        {motion.fadeIn(props.begin + index * rowStep, ROW_FADE)}
      </g>
    );
  });

  const drawScan: SvgChild = motion.enabled ? (
    <g>
      <rect
        x={props.x - 5}
        y={props.y - SCAN_HEIGHT}
        width={width + 10}
        height={SCAN_HEIGHT}
        fill={`url(#${ASCII_SCAN_GRADIENT_ID})`}
        opacity={0}
      >
        <animate
          attributeName="opacity"
          values="0;1;1;0"
          keyTimes="0;0.04;0.85;1"
          begin={seconds(props.begin)}
          dur={seconds(props.duration + 0.25)}
          fill="freeze"
        />
      </rect>
      {motion.sweep(props.begin, props.duration, 0, height + SCAN_HEIGHT)}
    </g>
  ) : null;

  const idleScan: SvgChild = motion.enabled ? (
    <rect
      x={props.x - 5}
      y={props.y}
      width={width + 10}
      height={2}
      fill={palette.accent}
      opacity={0.05}
    >
      <animateTransform
        attributeName="transform"
        type="translate"
        values={`0 0;0 ${String(Math.round(height))}`}
        dur={seconds(motion.config.idleLoopDuration * 1.7)}
        begin={seconds(finish + 1.5)}
        repeatCount="indefinite"
      />
    </rect>
  ) : null;

  return (
    <g>
      <g>
        {rows}
        {motion.shimmer(finish + 0.8, 0.93)}
      </g>
      {drawScan}
      {idleScan}
    </g>
  );
}
