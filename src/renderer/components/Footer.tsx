import { h, type SvgElement } from '../../svg/jsx.ts';
import type { Palette, TerminalConfig } from '../../config/types.ts';
import type { Metrics } from '../layout.ts';
import { visualLength } from '../../utils/text.ts';
import { type Token, TokenLine } from './primitives.tsx';

export interface FooterProps {
  x: number;
  y: number;
  width: number;
  terminal: TerminalConfig;
  metrics: Metrics;
  palette: Palette;
}

export function footerHeight(terminal: TerminalConfig, metrics: Metrics): number {
  return (terminal.farewell ? 3 : 1) * metrics.lineHeight;
}

export function Footer(props: FooterProps): SvgElement {
  const { metrics, palette, terminal } = props;
  const prefix = `${terminal.username}@${terminal.hostname}:${terminal.workingDirectory}${terminal.promptSymbol}`;
  const promptTokens = (trailing: Token[]): Token[] => [
    { text: `${terminal.username}@${terminal.hostname}`, fill: palette.accent },
    { text: ':', fill: palette.textDim },
    { text: terminal.workingDirectory, fill: palette.textMuted },
    { text: terminal.promptSymbol, fill: palette.prompt, weight: 600 },
    ...trailing,
  ];

  const lines: SvgElement[] = [];
  let row = 0;

  if (terminal.farewell) {
    lines.push(
      <TokenLine
        x={props.x}
        y={props.y + (row + 1) * metrics.lineHeight - 5}
        cellWidth={metrics.cellWidth}
        tokens={promptTokens([
          { text: ' echo ', fill: palette.text },
          { text: `"${terminal.farewell}"`, fill: palette.success },
        ])}
      />,
    );
    row += 1;
    lines.push(
      <TokenLine
        x={props.x}
        y={props.y + (row + 1) * metrics.lineHeight - 5}
        cellWidth={metrics.cellWidth}
        tokens={[{ text: terminal.farewell, fill: palette.textMuted }]}
      />,
    );
    row += 1;
  }

  lines.push(
    <TokenLine
      x={props.x}
      y={props.y + (row + 1) * metrics.lineHeight - 5}
      cellWidth={metrics.cellWidth}
      tokens={promptTokens([{ text: ' ', fill: palette.text }])}
    />,
  );
  lines.push(
    <rect
      x={props.x + (visualLength(prefix) + 1) * metrics.cellWidth}
      y={props.y + row * metrics.lineHeight + 4}
      width={metrics.cellWidth}
      height={metrics.fontSize}
      fill={palette.accent}
      opacity={0.85}
    />,
  );

  return <g>{lines}</g>;
}
