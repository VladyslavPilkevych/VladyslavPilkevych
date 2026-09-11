import { h, type SvgElement } from '../../svg/jsx.ts';
import type { Palette, TerminalConfig } from '../../config/types.ts';
import type { Metrics } from '../layout.ts';
import { visualLength } from '../../utils/text.ts';
import { Rule, Text } from './primitives.tsx';

export interface TerminalChromeProps {
  metrics: Metrics;
  palette: Palette;
  terminal: TerminalConfig;
  totalHeight: number;
}

export function TerminalChrome(props: TerminalChromeProps): SvgElement {
  const { metrics, palette, terminal } = props;
  const height = metrics.chromeHeight;
  const baseline = height / 2 + metrics.fontSize / 2 - 2;
  const title = terminal.windowTitle ?? `${terminal.username}@${terminal.hostname}`;
  const right = `${terminal.username}@${terminal.hostname}  ${terminal.workingDirectory}  ${terminal.shell}`;
  const rightWidth = visualLength(right) * metrics.cellWidth;

  return (
    <g>
      <path
        d={`M0 ${String(metrics.cornerRadius)} A ${String(metrics.cornerRadius)} ${String(metrics.cornerRadius)} 0 0 1 ${String(metrics.cornerRadius)} 0 H ${String(metrics.width - metrics.cornerRadius)} A ${String(metrics.cornerRadius)} ${String(metrics.cornerRadius)} 0 0 1 ${String(metrics.width)} ${String(metrics.cornerRadius)} V ${String(height)} H 0 Z`}
        fill={palette.chrome}
      />
      <Rule x={0} y={height - 1} width={metrics.width} color={palette.border} />
      <rect
        x={metrics.padding}
        y={height / 2 - 5}
        width={4}
        height={10}
        rx={1}
        fill={palette.accent}
      />
      <rect
        x={metrics.padding + 7}
        y={height / 2 - 5}
        width={4}
        height={10}
        rx={1}
        fill={palette.accentAlt}
        opacity={0.75}
      />
      <rect
        x={metrics.padding + 14}
        y={height / 2 - 5}
        width={4}
        height={10}
        rx={1}
        fill={palette.textDim}
        opacity={0.55}
      />
      <Text
        x={metrics.padding + 30}
        y={baseline}
        value={title}
        fill={palette.text}
        cellWidth={metrics.cellWidth}
        weight={600}
      />
      <Text
        x={metrics.contentRight - rightWidth}
        y={baseline}
        value={right}
        fill={palette.textDim}
        cellWidth={metrics.cellWidth}
      />
    </g>
  );
}
