import { h, type SvgChild, type SvgElement } from '../../svg/jsx.ts';
import type { Palette } from '../../config/types.ts';
import type { ContributionCalendar, ContributionLevel } from '../../data/types.ts';
import type { Metrics } from '../layout.ts';
import { seconds, type Motion } from '../animation.ts';
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
  motion: Motion;
  begin: number;
  duration: number;
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
  const { calendar, metrics, palette, motion } = props;
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
  const positions: { x: number; y: number }[] = [];
  calendar.weeks.forEach((week, weekIndex) => {
    week.forEach((day, dayIndex) => {
      if (!day) return;
      const cellX = gridLeft + weekIndex * geometry.pitch;
      const cellY = gridTop + dayIndex * step;
      positions.push({ x: cellX, y: cellY });
      cells.push(
        <rect
          x={cellX}
          y={cellY}
          width={geometry.cell}
          height={geometry.cell}
          rx={2.5}
          ry={2.5}
          fill={levelColor(day.level, palette)}
        />,
      );
    });
  });

  const clipId = 'tp-graph-wipe';
  const grid: SvgChild = motion.enabled ? (
    <g>
      <clipPath id={clipId}>
        <rect
          x={gridLeft - 2}
          y={gridTop - 2}
          width={geometry.gridWidth + 4}
          height={geometry.gridHeight + 4}
        >
          {motion.grow('width', props.begin, props.duration, geometry.gridWidth + 4)}
        </rect>
      </clipPath>
      <g clip-path={`url(#${clipId})`}>{cells}</g>
      <rect
        x={gridLeft - 1}
        y={gridTop - 2}
        width={2}
        height={geometry.gridHeight + 4}
        fill={palette.accent}
        opacity={0}
      >
        <animate
          attributeName="opacity"
          values="0;0.75;0.75;0"
          keyTimes="0;0.05;0.9;1"
          begin={seconds(props.begin)}
          dur={seconds(props.duration)}
          fill="freeze"
        />
        <animateTransform
          attributeName="transform"
          type="translate"
          values={`0 0;${String(Math.round(geometry.gridWidth))} 0`}
          begin={seconds(props.begin)}
          dur={seconds(props.duration)}
          fill="freeze"
        />
      </rect>
    </g>
  ) : (
    <g>{cells}</g>
  );

  const latest = positions[positions.length - 1];
  const todayPulse: SvgChild =
    motion.enabled && latest ? (
      <rect
        x={latest.x - 1.5}
        y={latest.y - 1.5}
        width={geometry.cell + 3}
        height={geometry.cell + 3}
        rx={3.5}
        ry={3.5}
        fill="none"
        stroke={palette.accent}
        stroke-width={1.2}
        opacity={0}
      >
        <animate
          attributeName="opacity"
          values="0;0.9;0.15;0.9"
          keyTimes="0;0.2;0.6;1"
          begin={seconds(props.begin + props.duration)}
          dur={seconds(3.2)}
          repeatCount="indefinite"
        />
      </rect>
    ) : null;

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
      <g>
        {monthLabels}
        {weekdayLabels}
        {motion.fadeIn(Math.max(0, props.begin - 0.12), 0.3)}
      </g>
      {grid}
      {todayPulse}
      <g>
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
        {motion.fadeIn(props.begin + props.duration * 0.6, 0.35)}
      </g>
    </g>
  );
}
