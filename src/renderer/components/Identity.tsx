import { h, type SvgElement } from '../../svg/jsx.ts';
import type { Palette, TerminalConfig } from '../../config/types.ts';
import type { IdentityField } from '../../data/types.ts';
import type { Metrics } from '../layout.ts';
import { padEnd, visualLength } from '../../utils/text.ts';
import { Rule, TokenLine } from './primitives.tsx';

export interface IdentityProps {
  x: number;
  y: number;
  width: number;
  fields: IdentityField[];
  login: string;
  terminal: TerminalConfig;
  metrics: Metrics;
  palette: Palette;
}

const LABEL_COLUMNS = 11;

const FIELDS_OFFSET = 14;

export function identityHeight(fields: IdentityField[], metrics: Metrics): number {
  return metrics.lineHeight + FIELDS_OFFSET + fields.length * metrics.lineHeight;
}

export function Identity(props: IdentityProps): SvgElement {
  const { metrics, palette, terminal } = props;
  const handle = `${terminal.username}@${terminal.hostname}`;
  const headerBaseline = props.y + metrics.fontSize;

  const rows = props.fields.map((field, index) => {
    const baseline =
      props.y + metrics.lineHeight + FIELDS_OFFSET + (index + 1) * metrics.lineHeight - 5;
    return (
      <TokenLine
        x={props.x}
        y={baseline}
        cellWidth={metrics.cellWidth}
        tokens={[
          { text: padEnd(field.label, LABEL_COLUMNS), fill: palette.textDim },
          { text: field.value, fill: palette.text },
        ]}
      />
    );
  });

  return (
    <g>
      <TokenLine
        x={props.x}
        y={headerBaseline}
        cellWidth={metrics.cellWidth}
        tokens={[
          { text: handle, fill: palette.accent, weight: 600 },
          { text: '  ', fill: palette.textDim },
          { text: `[ ${props.login} ]`, fill: palette.textDim },
        ]}
      />
      <Rule
        x={props.x}
        y={props.y + metrics.lineHeight + 2}
        width={Math.min(props.width, visualLength(handle) * metrics.cellWidth + 160)}
        color={palette.borderStrong}
        opacity={0.8}
      />
      {rows}
    </g>
  );
}
