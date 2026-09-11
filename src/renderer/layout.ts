import type { ProfileConfig, ThemeName, Palette } from '../config/types.ts';

export interface Metrics {
  width: number;
  padding: number;
  innerWidth: number;
  contentLeft: number;
  contentRight: number;
  fontSize: number;
  cellWidth: number;
  lineHeight: number;
  asciiFontSize: number;
  asciiCellWidth: number;
  asciiLineHeight: number;
  columnGap: number;
  sectionGap: number;
  chromeHeight: number;
  cornerRadius: number;
  fontFamily: string;
  columns: number;
}

export const COLUMN_GAP = 30;

export function buildMetrics(config: ProfileConfig): Metrics {
  const { typography, spacing } = config.theme;
  const width = spacing.canvasWidth;
  const padding = spacing.padding;
  const innerWidth = width - padding * 2;
  const asciiCellWidth = typography.cellWidth * (typography.asciiFontSize / typography.fontSize);
  return {
    width,
    padding,
    innerWidth,
    contentLeft: padding,
    contentRight: width - padding,
    fontSize: typography.fontSize,
    cellWidth: typography.cellWidth,
    lineHeight: typography.lineHeight,
    asciiFontSize: typography.asciiFontSize,
    asciiCellWidth,
    asciiLineHeight: asciiCellWidth * config.avatar.cellAspectRatio,
    columnGap: COLUMN_GAP,
    sectionGap: spacing.sectionGap,
    chromeHeight: 38,
    cornerRadius: spacing.cornerRadius,
    fontFamily: typography.fontFamily,
    columns: Math.floor(innerWidth / typography.cellWidth),
  };
}

export function resolvePalette(config: ProfileConfig, theme: ThemeName): Palette {
  return theme === 'dark' ? config.theme.dark : config.theme.light;
}

export interface Column {
  x: number;
  width: number;
  columns: number;
}

export function splitColumns(metrics: Metrics, ratios: number[]): Column[] {
  const gaps = metrics.columnGap * (ratios.length - 1);
  const usable = metrics.innerWidth - gaps;
  const total = ratios.reduce((sum, ratio) => sum + ratio, 0);
  const columns: Column[] = [];
  let cursor = metrics.contentLeft;
  ratios.forEach((ratio, index) => {
    const isLast = index === ratios.length - 1;
    const width = isLast ? metrics.contentRight - cursor : Math.round((usable * ratio) / total);
    columns.push({ x: cursor, width, columns: Math.floor(width / metrics.cellWidth) });
    cursor += width + metrics.columnGap;
  });
  return columns;
}
