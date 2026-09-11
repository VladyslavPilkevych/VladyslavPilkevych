import { h, type SvgElement } from '../../svg/jsx.ts';
import type { Palette } from '../../config/types.ts';
import type { Metrics } from '../layout.ts';
import { visualLength } from '../../utils/text.ts';
import { Rule, Text } from './primitives.tsx';

export interface SectionHeaderProps {
  x: number;
  y: number;
  width: number;
  command: string;
  promptSymbol: string;
  note?: string | null;
  metrics: Metrics;
  palette: Palette;
}

export function sectionHeaderHeight(metrics: Metrics): number {
  return metrics.lineHeight + 14;
}

export function SectionHeader(props: SectionHeaderProps): SvgElement {
  const { metrics, palette } = props;
  const baseline = props.y + metrics.fontSize;
  const markerHeight = metrics.fontSize + 2;
  const promptX = props.x + 12;
  const commandX = promptX + metrics.cellWidth * (visualLength(props.promptSymbol) + 1);
  const commandWidth = visualLength(props.command) * metrics.cellWidth;
  const noteWidth = props.note ? visualLength(props.note) * metrics.cellWidth : 0;
  const ruleStart = commandX + commandWidth + 14;
  const ruleEnd = props.x + props.width - (noteWidth > 0 ? noteWidth + 14 : 0);

  return (
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
      <Text
        x={promptX}
        y={baseline}
        value={props.promptSymbol}
        fill={palette.prompt}
        cellWidth={metrics.cellWidth}
        weight={600}
      />
      <Text
        x={commandX}
        y={baseline}
        value={props.command}
        fill={palette.text}
        cellWidth={metrics.cellWidth}
      />
      <Rule
        x={ruleStart}
        y={props.y + markerHeight / 2 + 1}
        width={ruleEnd - ruleStart}
        color={palette.border}
      />
      {props.note ? (
        <Text
          x={props.x + props.width - noteWidth}
          y={baseline}
          value={props.note}
          fill={palette.textDim}
          cellWidth={metrics.cellWidth}
        />
      ) : null}
    </g>
  );
}
