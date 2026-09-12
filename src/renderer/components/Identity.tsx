import { h, type SvgElement } from '../../svg/jsx.ts';
import type { Palette, TerminalConfig } from '../../config/types.ts';
import type { AsciiPortrait, IdentityField } from '../../data/types.ts';
import type { Metrics } from '../layout.ts';
import type { Motion } from '../animation.ts';
import { AsciiAvatar, asciiAvatarHeight, asciiAvatarWidth } from './AsciiAvatar.tsx';
import { TerminalTable, terminalTableHeight, type TableRow } from './TerminalTable.tsx';
import { Text } from './primitives.tsx';

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
const PORTRAIT_GAP = 22;
const KEY_COLUMNS = 13;

function tableRows(fields: IdentityField[], palette: Palette): TableRow[] {
  return fields.map((field) => ({
    key: field.label,
    cells: [
      [{ text: field.label.toLowerCase(), fill: palette.accent }],
      [{ text: field.value, fill: palette.text }],
    ],
  }));
}

export function identityPanelHeight(
  portrait: AsciiPortrait | null,
  fields: IdentityField[],
  metrics: Metrics,
): number {
  const tableHeight = terminalTableHeight(fields.length, true, metrics);
  const portraitHeight = portrait ? asciiAvatarHeight(portrait, metrics) : 0;
  return Math.max(tableHeight, portraitHeight) + PANEL_PADDING * 2;
}

export function IdentityPanel(props: IdentityPanelProps): SvgElement {
  const { metrics, palette, motion, portrait } = props;
  const panelHeight = identityPanelHeight(portrait, props.fields, metrics);
  const contentTop = props.y + PANEL_PADDING;
  const contentHeight = panelHeight - PANEL_PADDING * 2;

  const portraitWidth = portrait ? asciiAvatarWidth(portrait, metrics) : 0;
  const portraitHeight = portrait ? asciiAvatarHeight(portrait, metrics) : 0;
  const portraitTop = contentTop + Math.max(0, (contentHeight - portraitHeight) / 2);

  const dividerX = portrait ? props.x + PANEL_PADDING + portraitWidth + PORTRAIT_GAP : 0;
  const tableX = portrait ? dividerX + PORTRAIT_GAP : props.x + PANEL_PADDING;
  const tableWidth = props.x + props.width - PANEL_PADDING - tableX;
  const tableHeight = terminalTableHeight(props.fields.length, true, metrics);
  const tableTop = contentTop + Math.max(0, (contentHeight - tableHeight) / 2);

  const valueColumns = Math.max(8, Math.floor(tableWidth / metrics.cellWidth) - KEY_COLUMNS);

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
            y={contentTop + 6}
            width={1}
            height={Math.max(0, contentHeight - 12)}
            fill={palette.borderStrong}
            opacity={0.6}
          />
          {motion.fadeIn(props.begin)}
        </g>
      ) : null}

      <g>
        <Text
          x={tableX}
          y={tableTop - 12}
          value={`${props.terminal.username}@${props.terminal.hostname}`}
          fill={palette.accent}
          cellWidth={metrics.cellWidth}
          fontSize={metrics.fontSize - 2}
          weight={700}
        />
        {motion.fadeIn(Math.max(0, props.begin - 0.1))}
      </g>

      <TerminalTable
        x={tableX}
        y={tableTop}
        width={tableWidth}
        columns={[
          { label: 'field', columns: KEY_COLUMNS },
          { label: 'value', columns: valueColumns },
        ]}
        rows={tableRows(props.fields, palette)}
        showHeader={true}
        separator={true}
        metrics={metrics}
        palette={palette}
        motion={motion}
        begin={props.begin}
        stagger={props.stagger}
        reveal="fade"
        idPrefix="tp-identity"
      />
    </g>
  );
}
