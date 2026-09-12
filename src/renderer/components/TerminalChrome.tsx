import { h, type SvgElement } from '../../svg/jsx.ts';
import type { Palette, TerminalConfig } from '../../config/types.ts';
import type { Metrics } from '../layout.ts';
import type { Motion } from '../animation.ts';
import { visualLength } from '../../utils/text.ts';
import { Rule, Text, TokenLine } from './primitives.tsx';

export interface TerminalChromeProps {
  metrics: Metrics;
  palette: Palette;
  terminal: TerminalConfig;
  motion: Motion;
  begin: number;
}

const STATUS_LABEL = 'online';

export function TerminalChrome(props: TerminalChromeProps): SvgElement {
  const { metrics, palette, terminal, motion } = props;
  const height = metrics.chromeHeight;
  const baseline = height / 2 + metrics.fontSize / 2 - 2;
  const title = terminal.windowTitle ?? `${terminal.username}@${terminal.hostname}`;
  const context = `${terminal.username}@${terminal.hostname}  ${terminal.workingDirectory}  ${terminal.shell}`;
  const statusWidth = (visualLength(STATUS_LABEL) + 2) * metrics.cellWidth;
  const statusX = metrics.contentRight - statusWidth;
  const contextWidth = visualLength(context) * metrics.cellWidth;
  const contextX = statusX - 22 - contextWidth;

  return (
    <g>
      <path
        d={`M0 ${String(metrics.cornerRadius)} A ${String(metrics.cornerRadius)} ${String(metrics.cornerRadius)} 0 0 1 ${String(metrics.cornerRadius)} 0 H ${String(metrics.width - metrics.cornerRadius)} A ${String(metrics.cornerRadius)} ${String(metrics.cornerRadius)} 0 0 1 ${String(metrics.width)} ${String(metrics.cornerRadius)} V ${String(height)} H 0 Z`}
        fill={palette.chrome}
      />
      <Rule x={0} y={height - 1} width={metrics.width} color={palette.border} />
      <g>
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
        {motion.fadeIn(props.begin, 0.3)}
      </g>
      <g>
        <TokenLine
          x={contextX}
          y={baseline}
          cellWidth={metrics.cellWidth}
          tokens={[{ text: context, fill: palette.textDim }]}
        />
        {motion.fadeIn(props.begin + 0.12, 0.3)}
      </g>
      <g>
        <circle cx={statusX + 4} cy={height / 2 - 1} r={3.4} fill={palette.success}>
          {motion.pulse(0.28)}
        </circle>
        <Text
          x={statusX + 14}
          y={baseline}
          value={STATUS_LABEL}
          fill={palette.textMuted}
          cellWidth={metrics.cellWidth}
        />
        {motion.fadeIn(props.begin + 0.2, 0.3)}
      </g>
    </g>
  );
}
