import { h, type SvgElement } from '../../svg/jsx.ts';
import type { AsciiPortrait } from '../../data/types.ts';
import type { Metrics } from '../layout.ts';
import { Text } from './primitives.tsx';

export interface AsciiAvatarProps {
  x: number;
  y: number;
  portrait: AsciiPortrait;
  metrics: Metrics;
  fill: string;
}

export function asciiAvatarWidth(portrait: AsciiPortrait, metrics: Metrics): number {
  return portrait.columns * metrics.asciiCellWidth;
}

export function asciiAvatarHeight(portrait: AsciiPortrait, metrics: Metrics): number {
  return portrait.lines * metrics.asciiLineHeight;
}

export function AsciiAvatar(props: AsciiAvatarProps): SvgElement {
  const { metrics, portrait } = props;
  const rows = portrait.rows.map((row, index) => {
    return (
      <Text
        x={props.x}
        y={props.y + (index + 1) * metrics.asciiLineHeight}
        value={row}
        fill={props.fill}
        cellWidth={metrics.asciiCellWidth}
        fontSize={metrics.asciiFontSize}
      />
    );
  });
  return <g>{rows}</g>;
}
