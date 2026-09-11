import { h, type SvgElement } from '../../svg/jsx.ts';
import type { Palette, StackConfig } from '../../config/types.ts';
import type { Metrics } from '../layout.ts';
import { padEnd } from '../../utils/text.ts';
import { type Token, TokenLine } from './primitives.tsx';

export interface TechStackProps {
  x: number;
  y: number;
  width: number;
  stack: StackConfig;
  metrics: Metrics;
  palette: Palette;
}

const LABEL_COLUMNS = 12;

export function stackRows(stack: StackConfig): { label: string; items: string[] }[] {
  const groups = stack.groups.filter((group) => group.items.length > 0);
  if (groups.length > 0) {
    return groups.map((group) => ({ label: group.label, items: group.items }));
  }
  if (stack.technologies.length === 0) return [];
  return [{ label: 'stack', items: stack.technologies }];
}

export function techStackHeight(stack: StackConfig, metrics: Metrics): number {
  return stackRows(stack).length * metrics.lineHeight;
}

export function TechStack(props: TechStackProps): SvgElement {
  const { metrics, palette } = props;
  const rows = stackRows(props.stack).map((row, index) => {
    const tokens: Token[] = [{ text: padEnd(row.label, LABEL_COLUMNS), fill: palette.accent }];
    row.items.forEach((item, itemIndex) => {
      if (itemIndex > 0) tokens.push({ text: '  ·  ', fill: palette.border });
      tokens.push({ text: item, fill: palette.text });
    });
    return (
      <TokenLine
        x={props.x}
        y={props.y + (index + 1) * metrics.lineHeight - 5}
        cellWidth={metrics.cellWidth}
        tokens={tokens}
      />
    );
  });
  return <g>{rows}</g>;
}
