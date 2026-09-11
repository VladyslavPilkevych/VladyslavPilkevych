import { Fragment, h, type SvgElement } from '../../svg/jsx.ts';
import { visualLength } from '../../utils/text.ts';

export interface TextProps {
  x: number;
  y: number;
  value: string;
  fill: string;
  cellWidth: number;
  fontSize?: number;
  weight?: number;
  opacity?: number;
  letterSpacing?: number;
}

export function Text(props: TextProps): SvgElement {
  const length = visualLength(props.value);
  if (length === 0) return <g />;
  return (
    <text
      x={props.x}
      y={props.y}
      fill={props.fill}
      font-size={props.fontSize}
      font-weight={props.weight}
      opacity={props.opacity}
      textLength={length * props.cellWidth}
      lengthAdjust="spacingAndGlyphs"
      xml:space="preserve"
    >
      {props.value}
    </text>
  );
}

export interface Token {
  text: string;
  fill: string;
  weight?: number;
  opacity?: number;
}

export interface TokenLineProps {
  x: number;
  y: number;
  tokens: Token[];
  cellWidth: number;
  fontSize?: number;
}

export function TokenLine(props: TokenLineProps): SvgElement {
  let column = 0;
  const parts: SvgElement[] = [];
  for (const token of props.tokens) {
    const length = visualLength(token.text);
    if (length > 0 && token.text.trim().length > 0) {
      parts.push(
        <Text
          x={props.x + column * props.cellWidth}
          y={props.y}
          value={token.text}
          fill={token.fill}
          weight={token.weight}
          opacity={token.opacity}
          cellWidth={props.cellWidth}
          fontSize={props.fontSize}
        />,
      );
    }
    column += length;
  }
  return <g>{parts}</g>;
}

export interface RuleProps {
  x: number;
  y: number;
  width: number;
  color: string;
  opacity?: number;
  thickness?: number;
}

export function Rule(props: RuleProps): SvgElement {
  return (
    <rect
      x={props.x}
      y={props.y}
      width={Math.max(0, props.width)}
      height={props.thickness ?? 1}
      fill={props.color}
      opacity={props.opacity}
    />
  );
}

export interface PanelProps {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  radius?: number;
  opacity?: number;
}

export function Panel(props: PanelProps): SvgElement {
  return (
    <rect
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      rx={props.radius ?? 8}
      ry={props.radius ?? 8}
      fill={props.fill}
      stroke={props.stroke}
      stroke-width={props.stroke ? 1 : undefined}
      opacity={props.opacity}
    />
  );
}

export function Group(props: { children?: unknown }): SvgElement {
  return <Fragment>{props.children as never}</Fragment>;
}
