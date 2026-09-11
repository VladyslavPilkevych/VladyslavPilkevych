import { h, type SvgElement } from '../../svg/jsx.ts';
import type { Palette } from '../../config/types.ts';
import type { ContributionCalendar, ContributionLevel } from '../../data/types.ts';
import type { Metrics } from '../layout.ts';
import { monthAbbreviation, parseCalendarDate } from '../../utils/dates.ts';
import { visualLength } from '../../utils/text.ts';
import { Text } from './primitives.tsx';

export interface ContributionGraphProps {
  x: number;
  y: number;
  width: number;
  calendar: ContributionCalendar;
  metrics: Metrics;
  palette: Palette;
}

const DAY_LABEL_COLUMNS = 4;
const CELL_GAP = 3;
const MIN_CELL = 8;
const MAX_CELL = 15;
const MONTH_LABEL_HEIGHT = 18;
const LEGEND_HEIGHT = 22;
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''] as const;

export interface GraphGeometry {
  cell: number;
  pitch: number;
  gridX: number;
  gridWidth: number;
  gridHeight: number;
}

export function graphGeometry(weeks: number, width: number, metrics: Metrics): GraphGeometry {
  const labelWidth = DAY_LABEL_COLUMNS * metrics.cellWidth;
  const available = width - labelWidth;
  const pitch = weeks > 0 ? available / weeks : MIN_CELL + CELL_GAP;
  const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, pitch - CELL_GAP));
  return {
    cell,
    pitch,
    gridX: labelWidth,
    gridWidth: available,
    gridHeight: 7 * (cell + CELL_GAP) - CELL_GAP,
  };
}

export function contributionGraphHeight(
  calendar: ContributionCalendar,
  width: number,
  metrics: Metrics,
): number {
  const geometry = graphGeometry(calendar.weeks.length, width, metrics);
  return MONTH_LABEL_HEIGHT + geometry.gridHeight + LEGEND_HEIGHT;
}

export function levelColor(level: ContributionLevel, palette: Palette): string {
  if (level === 0) return palette.contribution.empty;
  const [first, second, third, fourth] = palette.contribution.levels;
  if (level === 1) return first;
  if (level === 2) return second;
  if (level === 3) return third;
  return fourth;
}

export function monthLabelPositions(
  calendar: ContributionCalendar,
): { week: number; label: string }[] {
  const labels: { week: number; label: string }[] = [];
  let previousMonth = -1;
  calendar.weeks.forEach((week, index) => {
    const firstDay = week.find((day) => day !== null);
    if (!firstDay) return;
    const { month } = parseCalendarDate(firstDay.date);
    if (month === previousMonth) return;
    previousMonth = month;
    if (index === calendar.weeks.length - 1) return;
    labels.push({ week: index, label: monthAbbreviation(month) });
  });
  return labels;
}

export function ContributionGraph(props: ContributionGraphProps): SvgElement {
  const { calendar, metrics, palette } = props;
  const geometry = graphGeometry(calendar.weeks.length, props.width, metrics);
  const gridLeft = props.x + geometry.gridX;
  const gridTop = props.y + MONTH_LABEL_HEIGHT;
  const step = geometry.cell + CELL_GAP;

  const monthLabels = monthLabelPositions(calendar).map((entry) => (
    <Text
      x={gridLeft + entry.week * geometry.pitch}
      y={props.y + 10}
      value={entry.label}
      fill={palette.textDim}
      cellWidth={metrics.cellWidth * 0.78}
      fontSize={metrics.fontSize - 3}
    />
  ));

  const weekdayLabels = WEEKDAY_LABELS.map((label, index) =>
    label ? (
      <Text
        x={props.x}
        y={gridTop + index * step + geometry.cell - 1}
        value={label}
        fill={palette.textDim}
        cellWidth={metrics.cellWidth * 0.78}
        fontSize={metrics.fontSize - 3}
      />
    ) : null,
  );

  const cells: SvgElement[] = [];
  calendar.weeks.forEach((week, weekIndex) => {
    week.forEach((day, dayIndex) => {
      if (!day) return;
      cells.push(
        <rect
          x={gridLeft + weekIndex * geometry.pitch}
          y={gridTop + dayIndex * step}
          width={geometry.cell}
          height={geometry.cell}
          rx={2.5}
          ry={2.5}
          fill={levelColor(day.level, palette)}
        />,
      );
    });
  });

  const legendY = gridTop + geometry.gridHeight + 15;
  const legendCell = Math.min(11, geometry.cell);
  const legendLabelWidth = visualLength('less') * metrics.cellWidth * 0.78;
  const legendWidth = legendLabelWidth * 2 + 12 + 5 * (legendCell + 3) + 8;
  const legendX = props.x + props.width - legendWidth;
  const legendCells = [0, 1, 2, 3, 4].map((level) => (
    <rect
      x={legendX + legendLabelWidth + 8 + level * (legendCell + 3)}
      y={legendY - legendCell + 1}
      width={legendCell}
      height={legendCell}
      rx={2}
      ry={2}
      fill={levelColor(level as ContributionLevel, palette)}
    />
  ));

  return (
    <g>
      {monthLabels}
      {weekdayLabels}
      {cells}
      <Text
        x={props.x}
        y={legendY}
        value={`${calendar.from}  ..  ${calendar.to}`}
        fill={palette.textDim}
        cellWidth={metrics.cellWidth * 0.82}
        fontSize={metrics.fontSize - 2}
      />
      <Text
        x={legendX}
        y={legendY}
        value="less"
        fill={palette.textDim}
        cellWidth={metrics.cellWidth * 0.78}
        fontSize={metrics.fontSize - 3}
      />
      {legendCells}
      <Text
        x={legendX + legendLabelWidth + 16 + 5 * (legendCell + 3)}
        y={legendY}
        value="more"
        fill={palette.textDim}
        cellWidth={metrics.cellWidth * 0.78}
        fontSize={metrics.fontSize - 3}
      />
    </g>
  );
}
