import { h, type SvgElement } from '../../svg/jsx.ts';
import type { Palette } from '../../config/types.ts';
import type { FeaturedRepository } from '../../data/types.ts';
import type { Metrics } from '../layout.ts';
import type { Motion } from '../animation.ts';
import { formatCount } from '../../utils/numbers.ts';
import { pluralize, truncate } from '../../utils/text.ts';
import { type Token, TokenLine } from './primitives.tsx';

export interface FeaturedRepositoriesProps {
  x: number;
  y: number;
  width: number;
  repositories: FeaturedRepository[];
  metrics: Metrics;
  palette: Palette;
  motion: Motion;
  begin: number;
  stagger: number;
}

export function featuredHeight(repositories: FeaturedRepository[], metrics: Metrics): number {
  return Math.max(1, repositories.length * 2) * metrics.lineHeight;
}

export function FeaturedRepositories(props: FeaturedRepositoriesProps): SvgElement {
  const { metrics, palette, motion } = props;
  const totalColumns = Math.floor(props.width / metrics.cellWidth);

  if (props.repositories.length === 0) {
    return (
      <g>
        <TokenLine
          x={props.x}
          y={props.y + metrics.lineHeight - 5}
          cellWidth={metrics.cellWidth}
          tokens={[{ text: 'no repositories configured', fill: palette.textDim }]}
        />
        {motion.fadeIn(props.begin)}
      </g>
    );
  }

  const rows = props.repositories.flatMap((repository, index) => {
    const headline: Token[] = [
      { text: '> ', fill: palette.prompt },
      { text: truncate(repository.name, 28), fill: palette.text, weight: 600 },
    ];
    const meta: string[] = [];
    if (repository.primaryLanguage) meta.push(repository.primaryLanguage);
    meta.push(`${formatCount(repository.stars)} ${pluralize(repository.stars, 'star')}`);
    const metaText = meta.join('  ·  ');
    const headlineColumns = 2 + truncate(repository.name, 28).length;
    const pad = Math.max(2, totalColumns - headlineColumns - metaText.length);
    headline.push({ text: ' '.repeat(pad), fill: palette.border });
    headline.push({ text: metaText, fill: palette.textDim });

    const description = repository.description ?? 'no description provided';
    const begin = props.begin + index * props.stagger * 2;
    return [
      <g>
        <TokenLine
          x={props.x}
          y={props.y + (index * 2 + 1) * metrics.lineHeight - 5}
          cellWidth={metrics.cellWidth}
          tokens={headline}
        />
        <TokenLine
          x={props.x}
          y={props.y + (index * 2 + 2) * metrics.lineHeight - 7}
          cellWidth={metrics.cellWidth}
          tokens={[
            { text: '  ', fill: palette.border },
            { text: truncate(description, totalColumns - 3), fill: palette.textMuted },
          ]}
        />
        {motion.fadeIn(begin, 0.3)}
      </g>,
    ];
  });

  return <g>{rows}</g>;
}
