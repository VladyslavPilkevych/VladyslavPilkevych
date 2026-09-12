import { h, type SvgChild, type SvgElement } from '../../svg/jsx.ts';
import type { Palette } from '../../config/types.ts';
import type { Metrics } from '../layout.ts';
import type { Motion } from '../animation.ts';
import { visualLength } from '../../utils/text.ts';
import { Rule, Text, type Token, TokenLine } from './primitives.tsx';

export interface SectionHeaderProps {
  x: number;
  y: number;
  width: number;
  command: string;
  promptSymbol: string;
  note?: string | null;
  metrics: Metrics;
  palette: Palette;
  motion: Motion;
  begin: number;
  idPrefix: string;
}

export function sectionHeaderHeight(metrics: Metrics): number {
  return metrics.lineHeight + 14;
}

export function splitCommand(command: string): { name: string; args: string } {
  const separator = command.indexOf(' ');
  if (separator === -1) return { name: command, args: '' };
  return { name: command.slice(0, separator), args: command.slice(separator) };
}

export function SectionHeader(props: SectionHeaderProps): SvgElement {
  const { metrics, palette, motion } = props;
  const baseline = props.y + metrics.fontSize;
  const markerHeight = metrics.fontSize + 2;
  const promptX = props.x + 12;
  const { name, args } = splitCommand(props.command);

  const tokens: Token[] = [
    { text: props.promptSymbol, fill: palette.prompt, weight: 700 },
    { text: ' ', fill: palette.text },
    { text: name, fill: palette.text, weight: 600 },
  ];
  if (args) tokens.push({ text: args, fill: palette.textMuted });

  const commandColumns = tokens.reduce((sum, token) => sum + visualLength(token.text), 0);
  const commandWidth = commandColumns * metrics.cellWidth;
  const noteWidth = props.note ? visualLength(props.note) * metrics.cellWidth : 0;
  const ruleStart = promptX + commandWidth + 14;
  const ruleEnd = props.x + props.width - (noteWidth > 0 ? noteWidth + 14 : 0);
  const clipId = `${props.idPrefix}-cmd`;

  const commandLine: SvgChild = motion.enabled ? (
    <g>
      <clipPath id={clipId}>
        <rect x={promptX} y={props.y - 2} width={commandWidth} height={metrics.lineHeight + 4}>
          {motion.typeIn(props.begin, motion.config.typingDuration, commandWidth, commandColumns)}
        </rect>
      </clipPath>
      <g clip-path={`url(#${clipId})`}>
        <TokenLine x={promptX} y={baseline} cellWidth={metrics.cellWidth} tokens={tokens} />
      </g>
    </g>
  ) : (
    <TokenLine x={promptX} y={baseline} cellWidth={metrics.cellWidth} tokens={tokens} />
  );

  return (
    <g>
      <g>
        <rect
          x={props.x}
          y={props.y + 2}
          width={3}
          height={markerHeight}
          rx={1.5}
          ry={1.5}
          fill={palette.accent}
        />
        {motion.fadeIn(props.begin)}
      </g>
      {commandLine}
      <Rule
        x={ruleStart}
        y={props.y + markerHeight / 2 + 1}
        width={ruleEnd - ruleStart}
        color={palette.border}
      >
        {motion.grow('width', props.begin + 0.18, 0.5, Math.max(0, ruleEnd - ruleStart))}
      </Rule>
      {props.note ? (
        <g>
          <Text
            x={props.x + props.width - noteWidth}
            y={baseline}
            value={props.note}
            fill={palette.textDim}
            cellWidth={metrics.cellWidth}
          />
          {motion.fadeIn(props.begin + 0.35)}
        </g>
      ) : null}
    </g>
  );
}
