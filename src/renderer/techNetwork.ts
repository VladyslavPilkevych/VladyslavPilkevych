import type { StackConfig } from '../config/types.ts';
import { visualLength } from '../utils/text.ts';

export interface NetworkNode {
  id: string;
  label: string;
  column: number;
  row: number;
}

export interface NetworkEdge {
  from: string;
  to: string;
}

export interface NetworkColumn {
  label: string;
  size: number;
  longestLabel: number;
}

export interface TechNetwork {
  columns: NetworkColumn[];
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  rows: number;
  longestLabel: number;
}

export function nodeId(column: number, row: number): string {
  return `${String(column)}:${String(row)}`;
}

function deriveEdges(
  nodes: NetworkNode[],
  columns: NetworkColumn[],
  fanOut: number,
): NetworkEdge[] {
  const edges: NetworkEdge[] = [];
  const seen = new Set<string>();
  const byColumn = columns.map((_, index) => nodes.filter((node) => node.column === index));

  for (let column = 0; column < byColumn.length - 1; column += 1) {
    const source = byColumn[column] ?? [];
    const target = byColumn[column + 1] ?? [];
    if (source.length === 0 || target.length === 0) continue;

    source.forEach((node, index) => {
      for (let branch = 0; branch < fanOut; branch += 1) {
        const offset = index * fanOut + branch;
        const partner = target[offset % target.length];
        if (!partner) continue;
        const key = `${node.id}->${partner.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ from: node.id, to: partner.id });
      }
    });

    for (const partner of target) {
      if (edges.some((edge) => edge.to === partner.id)) continue;
      const fallback = source[partner.row % source.length];
      if (!fallback) continue;
      const key = `${fallback.id}->${partner.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: fallback.id, to: partner.id });
    }
  }
  return edges;
}

export function buildTechNetwork(stack: StackConfig): TechNetwork {
  const groups = stack.groups.filter((group) => group.items.length > 0);
  const source =
    groups.length > 0
      ? groups
      : stack.technologies.length > 0
        ? [{ label: 'stack', items: stack.technologies }]
        : [];

  const columns: NetworkColumn[] = source.map((group) => ({
    label: group.label,
    size: group.items.length,
    longestLabel: group.items.reduce((widest, item) => Math.max(widest, visualLength(item)), 0),
  }));

  const nodes: NetworkNode[] = [];
  source.forEach((group, column) => {
    group.items.forEach((item, row) => {
      nodes.push({ id: nodeId(column, row), label: item, column, row });
    });
  });

  const explicit: NetworkEdge[] = [];
  const byLabel = new Map(nodes.map((node) => [node.label.toLowerCase(), node]));
  for (const connection of stack.connections) {
    const from = byLabel.get(connection.from.toLowerCase());
    const to = byLabel.get(connection.to.toLowerCase());
    if (from && to && from.id !== to.id) explicit.push({ from: from.id, to: to.id });
  }

  const edges = explicit.length > 0 ? explicit : deriveEdges(nodes, columns, stack.fanOut);

  return {
    columns,
    nodes,
    edges,
    rows: columns.reduce((tallest, column) => Math.max(tallest, column.size), 0),
    longestLabel: nodes.reduce((widest, node) => Math.max(widest, visualLength(node.label)), 0),
  };
}

export function phaseOffset(index: number, period: number, steps = 7): number {
  const scrambled = (index * 5 + Math.floor(index / steps) * 3) % steps;
  return (scrambled / steps) * period;
}

export interface ColumnGeometry {
  x: number;
  contentWidth: number;
}

export function distributeColumns(
  columns: NetworkColumn[],
  x: number,
  width: number,
  nodeArea: number,
  cellWidth: number,
  minGutter: number,
): ColumnGeometry[] {
  if (columns.length === 0) return [];
  const contents = columns.map((column) => nodeArea + column.longestLabel * cellWidth);
  if (columns.length === 1) return [{ x, contentWidth: contents[0] ?? 0 }];
  const used = contents.reduce((sum, value) => sum + value, 0);
  const gutter = Math.max(minGutter, (width - used) / (columns.length - 1));
  const geometry: ColumnGeometry[] = [];
  let cursor = x;
  contents.forEach((contentWidth) => {
    geometry.push({ x: cursor, contentWidth });
    cursor += contentWidth + gutter;
  });
  return geometry;
}
