import { h, type SvgChild, type SvgElement } from '../../svg/jsx.ts';
import type { Palette, StackConfig } from '../../config/types.ts';
import type { Metrics } from '../layout.ts';
import { seconds, type Motion } from '../animation.ts';
import { buildTechNetwork, phaseOffset, type TechNetwork as Network } from '../techNetwork.ts';
import { visualLength } from '../../utils/text.ts';
import { Text } from './primitives.tsx';

export interface TechNetworkProps {
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

const HEADER_HEIGHT = 26;
const ROW_PITCH = 26;
const NODE_RADIUS = 3.6;
const HALO_RADIUS = 8.5;
const LABEL_GAP = 12;
const EDGE_GAP = 9;
const PULSE_RADIUS = 2.1;
const TRAVEL_SHARE = 0.45;

interface Placement {
  centerX: number;
  centerY: number;
  labelX: number;
  exitX: number;
}

export function techNetworkHeight(stack: StackConfig): number {
  const network = buildTechNetwork(stack);
  return network.rows === 0 ? 0 : HEADER_HEIGHT + network.rows * ROW_PITCH;
}

function nodeFontSize(metrics: Metrics): number {
  return metrics.fontSize - 1;
}

function nodeCellWidth(metrics: Metrics): number {
  return metrics.cellWidth * ((metrics.fontSize - 1) / metrics.fontSize);
}

function placements(
  network: Network,
  x: number,
  y: number,
  width: number,
  metrics: Metrics,
): Map<string, Placement> {
  const pitch = width / Math.max(1, network.columns.length);
  const cell = nodeCellWidth(metrics);
  const map = new Map<string, Placement>();
  for (const node of network.nodes) {
    const columnX = x + node.column * pitch + 2;
    const centerX = columnX + NODE_RADIUS + 2;
    const centerY = y + HEADER_HEIGHT + node.row * ROW_PITCH + ROW_PITCH / 2;
    const labelX = centerX + LABEL_GAP;
    map.set(node.id, {
      centerX,
      centerY,
      labelX,
      exitX: labelX + visualLength(node.label) * cell + EDGE_GAP,
    });
  }
  return map;
}

function edgePath(from: Placement, to: Placement): string {
  const startX = from.exitX;
  const startY = from.centerY;
  const endX = to.centerX - HALO_RADIUS - 1;
  const endY = to.centerY;
  const handle = Math.max(18, (endX - startX) * 0.45);
  return (
    `M ${startX.toFixed(1)} ${startY.toFixed(1)} ` +
    `C ${(startX + handle).toFixed(1)} ${startY.toFixed(1)} ` +
    `${(endX - handle).toFixed(1)} ${endY.toFixed(1)} ` +
    `${endX.toFixed(1)} ${endY.toFixed(1)}`
  );
}

export function TechNetwork(props: TechNetworkProps): SvgElement {
  const { metrics, palette, motion } = props;
  const network = buildTechNetwork(props.stack);
  if (network.rows === 0) return <g />;

  const spots = placements(network, props.x, props.y, props.width, metrics);
  const pitch = props.width / Math.max(1, network.columns.length);
  const period = motion.config.networkPulsePeriod;

  const headers = network.columns.map((column, index) => (
    <g>
      <Text
        x={props.x + index * pitch + 2}
        y={props.y + metrics.fontSize - 2}
        value={column.label.toUpperCase()}
        fill={palette.textDim}
        cellWidth={metrics.cellWidth * 0.8}
        fontSize={metrics.fontSize - 3}
        weight={600}
      />
      {motion.fadeIn(props.begin + index * props.stagger, 0.3)}
    </g>
  ));

  const paths: SvgChild[] = [];
  const pulses: SvgChild[] = [];
  network.edges.forEach((edge, index) => {
    const from = spots.get(edge.from);
    const to = spots.get(edge.to);
    if (!from || !to) return;
    const d = edgePath(from, to);
    paths.push(
      <path d={d} fill="none" stroke={palette.borderStrong} stroke-width={1} opacity={0.5} />,
    );
    if (!motion.enabled) return;
    const begin = props.begin + 0.6 + phaseOffset(index, period, 9);
    pulses.push(
      <circle r={PULSE_RADIUS} fill={palette.accentAlt} opacity={0}>
        <animateMotion
          path={d}
          dur={seconds(period)}
          begin={seconds(begin)}
          keyPoints="0;1;1"
          keyTimes={`0;${String(TRAVEL_SHARE)};1`}
          calcMode="linear"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0;0.95;0.95;0;0"
          keyTimes={`0;0.08;${String(TRAVEL_SHARE - 0.08)};${String(TRAVEL_SHARE)};1`}
          dur={seconds(period)}
          begin={seconds(begin)}
          repeatCount="indefinite"
        />
      </circle>,
    );
  });

  const nodes = network.nodes.map((node, index) => {
    const spot = spots.get(node.id);
    if (!spot) return null;
    const begin = props.begin + 0.2 + index * (props.stagger * 0.6);
    return (
      <g>
        <circle
          cx={spot.centerX}
          cy={spot.centerY}
          r={HALO_RADIUS}
          fill={palette.accent}
          opacity={0.14}
        >
          {motion.enabled ? (
            <animate
              attributeName="opacity"
              values="0.14;0.3;0.14"
              dur={seconds(period * 1.6)}
              begin={seconds(-phaseOffset(index, period * 1.6, 11))}
              repeatCount="indefinite"
            />
          ) : null}
        </circle>
        <circle cx={spot.centerX} cy={spot.centerY} r={NODE_RADIUS} fill={palette.accent} />
        <Text
          x={spot.labelX}
          y={spot.centerY + 4}
          value={node.label}
          fill={palette.text}
          cellWidth={nodeCellWidth(metrics)}
          fontSize={nodeFontSize(metrics)}
        />
        {motion.fadeIn(begin, 0.3)}
      </g>
    );
  });

  return (
    <g>
      {headers}
      <g>
        {paths}
        {motion.fadeIn(props.begin + 0.35, 0.5)}
      </g>
      {pulses}
      {nodes}
    </g>
  );
}
