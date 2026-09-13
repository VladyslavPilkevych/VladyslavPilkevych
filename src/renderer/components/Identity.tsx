import { h, type SvgElement } from '../../svg/jsx.ts';
import type { Palette, TerminalConfig } from '../../config/types.ts';
import type { AsciiPortrait, IdentityField } from '../../data/types.ts';
import type { Metrics } from '../layout.ts';
import type { Motion } from '../animation.ts';
import { AsciiAvatar, asciiAvatarHeight, asciiAvatarWidth } from './AsciiAvatar.tsx';
import { TerminalKeyValue, terminalKeyValueHeight, type KeyValueRow } from './TerminalKeyValue.tsx';
import { Rule, Text } from './primitives.tsx';

export interface IdentityPanelProps {
  x: number;
  y: number;
  width: number;
  portrait: AsciiPortrait | null;
  fields: IdentityField[];
  login: string;
  terminal: TerminalConfig;
  metrics: Metrics;
  palette: Palette;
  motion: Motion;
  portraitFill: string;
  begin: number;
  avatarBegin: number;
  avatarDuration: number;
  stagger: number;
}

export const PANEL_PADDING = 20;
const PORTRAIT_GAP = 24;
const HANDLE_GAP = 12;

function keyValueRows(fields: IdentityField[]): KeyValueRow[] {
  return fields.map((field) => ({ key: field.label.toLowerCase(), value: field.value }));
}

function contentHeight(fields: IdentityField[], metrics: Metrics): number {
  return metrics.lineHeight + HANDLE_GAP + terminalKeyValueHeight(fields.length, metrics);
}

export function identityPanelHeight(
  portrait: AsciiPortrait | null,
  fields: IdentityField[],
  metrics: Metrics,
): number {
  const portraitHeight = portrait ? asciiAvatarHeight(portrait, metrics) : 0;
  return Math.max(contentHeight(fields, metrics), portraitHeight) + PANEL_PADDING * 2;
}

export function IdentityPanel(props: IdentityPanelProps): SvgElement {
  const { metrics, palette, motion, portrait } = props;
  const panelHeight = identityPanelHeight(portrait, props.fields, metrics);
  const top = props.y + PANEL_PADDING;
  const innerHeight = panelHeight - PANEL_PADDING * 2;

  const portraitWidth = portrait ? asciiAvatarWidth(portrait, metrics) : 0;
  const portraitHeight = portrait ? asciiAvatarHeight(portrait, metrics) : 0;
  const portraitTop = top + Math.max(0, (innerHeight - portraitHeight) / 2);

  const dividerX = portrait ? props.x + PANEL_PADDING + portraitWidth + PORTRAIT_GAP : 0;
  const listX = portrait ? dividerX + PORTRAIT_GAP : props.x + PANEL_PADDING;
  const listWidth = props.x + props.width - PANEL_PADDING - listX;
  const blockHeight = contentHeight(props.fields, metrics);
  const blockTop = top + Math.max(0, (innerHeight - blockHeight) / 2);
  const handle = `${props.terminal.username}@${props.terminal.hostname}`;

  return (
    <g>
      <g>
        <rect
          x={props.x}
          y={props.y}
          width={props.width}
          height={panelHeight}
          rx={10}
          ry={10}
          fill={palette.surface}
          stroke={palette.border}
          stroke-width={1}
        />
        {motion.fadeIn(Math.max(0, props.begin - 0.25))}
      </g>

      {portrait ? (
        <AsciiAvatar
          x={props.x + PANEL_PADDING}
          y={portraitTop}
          portrait={portrait}
          metrics={metrics}
          palette={palette}
          motion={motion}
          fill={props.portraitFill}
          begin={props.avatarBegin}
          duration={props.avatarDuration}
        />
      ) : null}

      {portrait ? (
        <g>
          <rect
            x={dividerX}
            y={top + 6}
            width={1}
            height={Math.max(0, innerHeight - 12)}
            fill={palette.borderStrong}
            opacity={0.6}
          />
          {motion.fadeIn(props.begin)}
        </g>
      ) : null}

      <g>
        <Text
          x={listX}
          y={blockTop + metrics.fontSize}
          value={handle}
          fill={palette.accent}
          cellWidth={metrics.cellWidth}
          weight={700}
        />
        <Rule
          x={listX}
          y={blockTop + metrics.lineHeight + 3}
          width={listWidth}
          color={palette.border}
          opacity={0.8}
        />
        {motion.fadeIn(Math.max(0, props.begin - 0.1))}
      </g>

      <TerminalKeyValue
        x={listX}
        y={blockTop + metrics.lineHeight + HANDLE_GAP}
        width={listWidth}
        rows={keyValueRows(props.fields)}
        metrics={metrics}
        palette={palette}
        motion={motion}
        begin={props.begin}
        stagger={props.stagger}
      />
    </g>
  );
}
