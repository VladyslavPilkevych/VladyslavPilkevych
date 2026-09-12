import { h, type SvgElement } from '../../svg/jsx.ts';
import type { Palette, StackConfig } from '../../config/types.ts';
import type { Metrics } from '../layout.ts';
import type { Motion } from '../animation.ts';
import { type Token } from './primitives.tsx';
import { TerminalTable, terminalTableHeight, type TableRow } from './TerminalTable.tsx';

export interface TechStackProps {
  x: number;
  y: number;
  width: number;
  stack: StackConfig;
  metrics: Metrics;
  palette: Palette;
  motion: Motion;
  begin: number;
  stagger: number;
}

const CATEGORY_COLUMNS = 14;

export function stackRows(stack: StackConfig): { label: string; items: string[] }[] {
  const groups = stack.groups.filter((group) => group.items.length > 0);
  if (groups.length > 0) {
    return groups.map((group) => ({ label: group.label, items: group.items }));
  }
  if (stack.technologies.length === 0) return [];
  return [{ label: 'stack', items: stack.technologies }];
}

export function techStackHeight(stack: StackConfig, metrics: Metrics): number {
  return terminalTableHeight(stackRows(stack).length, true, metrics);
}

export function TechStack(props: TechStackProps): SvgElement {
  const { metrics, palette, motion } = props;
  const rows: TableRow[] = stackRows(props.stack).map((row) => {
    const modules: Token[] = [];
    row.items.forEach((item, index) => {
      if (index > 0) modules.push({ text: ' · ', fill: palette.border });
      modules.push({ text: item, fill: palette.text });
    });
    return {
      key: row.label,
      cells: [[{ text: row.label, fill: palette.accent }], modules],
    };
  });

  return (
    <TerminalTable
      x={props.x}
      y={props.y}
      width={props.width}
      columns={[
        { label: 'category', columns: CATEGORY_COLUMNS },
        {
          label: 'modules',
          columns: Math.max(8, Math.floor(props.width / metrics.cellWidth) - CATEGORY_COLUMNS),
        },
      ]}
      rows={rows}
      showHeader={true}
      separator={true}
      metrics={metrics}
      palette={palette}
      motion={motion}
      begin={props.begin}
      stagger={props.stagger}
      reveal="wipe"
      idPrefix="tp-stack"
    />
  );
}
