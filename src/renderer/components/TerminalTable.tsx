import { h, type SvgChild, type SvgElement } from '../../svg/jsx.ts';
import type { Palette } from '../../config/types.ts';
import type { Metrics } from '../layout.ts';
import type { Motion } from '../animation.ts';
import { padEnd } from '../../utils/text.ts';
import { Rule, type Token, TokenLine } from './primitives.tsx';

export type TableReveal = 'fade' | 'wipe' | 'none';

export interface TableColumn {
  label: string;
  columns: number;
}

export interface TableRow {
  key: string;
  cells: Token[][];
}

export interface TerminalTableProps {
  x: number;
  y: number;
  width: number;
  columns: TableColumn[];
  rows: TableRow[];
  showHeader: boolean;
  separator: boolean;
  metrics: Metrics;
  palette: Palette;
  motion: Motion;
  begin: number;
  stagger: number;
  reveal: TableReveal;
  idPrefix: string;
}

const HEADER_GAP = 10;

export function terminalTableHeight(
  rowCount: number,
  showHeader: boolean,
  metrics: Metrics,
): number {
  const header = showHeader ? metrics.lineHeight + HEADER_GAP : 0;
  return header + rowCount * metrics.lineHeight;
}

function columnOffset(columns: TableColumn[], index: number, cellWidth: number): number {
  let offset = 0;
  for (let cursor = 0; cursor < index; cursor += 1) {
    offset += (columns[cursor]?.columns ?? 0) * cellWidth;
  }
  return offset;
}

export function TerminalTable(props: TerminalTableProps): SvgElement {
  const { metrics, palette, motion, columns, rows } = props;
  const cellWidth = metrics.cellWidth;
  const headerHeight = props.showHeader ? metrics.lineHeight + HEADER_GAP : 0;
  const bodyTop = props.y + headerHeight;
  const separatorX =
    columns.length > 1 ? props.x + columnOffset(columns, 1, cellWidth) - cellWidth : null;
  const bodyHeight = rows.length * metrics.lineHeight;

  const header: SvgChild = props.showHeader ? (
    <g>
      <TokenLine
        x={props.x}
        y={props.y + metrics.fontSize - 2}
        cellWidth={cellWidth}
        fontSize={metrics.fontSize - 2}
        tokens={columns.map((column, index) => ({
          text: padEnd(column.label, column.columns),
          fill: index === 0 ? palette.textDim : palette.textDim,
        }))}
      />
      <Rule
        x={props.x}
        y={props.y + metrics.lineHeight + 1}
        width={props.width}
        color={palette.border}
      />
      {motion.fadeIn(props.begin)}
    </g>
  ) : null;

  const columnDivider: SvgChild =
    props.separator && separatorX !== null ? (
      <g>
        <rect
          x={separatorX}
          y={bodyTop + 3}
          width={1}
          height={Math.max(0, bodyHeight - 6)}
          fill={palette.borderStrong}
          opacity={0.7}
        />
        {motion.fadeIn(props.begin + props.stagger)}
      </g>
    ) : null;

  const body = rows.map((row, rowIndex) => {
    const begin = props.begin + (rowIndex + 1) * props.stagger;
    const baseline = bodyTop + (rowIndex + 1) * metrics.lineHeight - 5;
    const clipId = `${props.idPrefix}-r${String(rowIndex)}`;
    const cells = row.cells.map((tokens, cellIndex) => (
      <TokenLine
        x={props.x + columnOffset(columns, cellIndex, cellWidth)}
        y={baseline}
        cellWidth={cellWidth}
        tokens={tokens}
      />
    ));

    if (props.reveal === 'wipe' && motion.enabled) {
      return (
        <g>
          <clipPath id={clipId}>
            <rect
              x={props.x}
              y={baseline - metrics.fontSize}
              width={props.width}
              height={metrics.lineHeight}
            >
              {motion.typeIn(begin, motion.config.sectionFadeDuration, props.width, 26)}
            </rect>
          </clipPath>
          <g clip-path={`url(#${clipId})`}>{cells}</g>
        </g>
      );
    }

    return (
      <g>
        {cells}
        {motion.fadeIn(begin)}
      </g>
    );
  });

  return (
    <g>
      {header}
      {columnDivider}
      {body}
    </g>
  );
}
