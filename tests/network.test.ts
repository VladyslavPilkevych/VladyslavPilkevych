import { describe, expect, it } from 'vitest';
import profileConfig from '../profile.config.ts';
import { buildTechNetwork, nodeId, phaseOffset } from '../src/renderer/techNetwork.ts';
import { buildLeader, leaderColumns } from '../src/renderer/components/TerminalKeyValue.tsx';
import { pulseProfile } from '../src/renderer/components/ContributionGraph.tsx';
import { normalizeContributionYears } from '../src/github/profile.ts';
import { buildAllTimeQuery } from '../src/github/queries.ts';
import type { StackConfig } from '../src/config/types.ts';

const baseStack: StackConfig = {
  technologies: [],
  groups: [
    { label: 'frontend', items: ['react', 'vue'] },
    { label: 'backend', items: ['node', 'spring', 'sqlite'] },
    { label: 'devops', items: ['docker'] },
  ],
  connections: [],
  fanOut: 2,
};

describe('buildTechNetwork', () => {
  it('turns configured groups into columns of nodes', () => {
    const network = buildTechNetwork(baseStack);
    expect(network.columns.map((column) => column.label)).toEqual([
      'frontend',
      'backend',
      'devops',
    ]);
    expect(network.nodes).toHaveLength(6);
    expect(network.rows).toBe(3);
    expect(network.longestLabel).toBe(6);
    expect(network.nodes[0]).toEqual({ id: nodeId(0, 0), label: 'react', column: 0, row: 0 });
  });

  it('only connects adjacent columns', () => {
    const network = buildTechNetwork(baseStack);
    const byId = new Map(network.nodes.map((node) => [node.id, node]));
    for (const edge of network.edges) {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      expect(to?.column).toBe((from?.column ?? 0) + 1);
    }
  });

  it('leaves no node in a middle or final column unreachable', () => {
    const network = buildTechNetwork(baseStack);
    for (const node of network.nodes) {
      if (node.column === 0) continue;
      expect(network.edges.some((edge) => edge.to === node.id)).toBe(true);
    }
  });

  it('gives every non-final node at least one outgoing edge', () => {
    const network = buildTechNetwork(baseStack);
    const lastColumn = network.columns.length - 1;
    for (const node of network.nodes) {
      if (node.column === lastColumn) continue;
      expect(network.edges.some((edge) => edge.from === node.id)).toBe(true);
    }
  });

  it('emits no duplicate edges', () => {
    const network = buildTechNetwork(baseStack);
    const keys = network.edges.map((edge) => `${edge.from}->${edge.to}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('prefers explicit connections when they are configured', () => {
    const network = buildTechNetwork({
      ...baseStack,
      connections: [{ from: 'react', to: 'node' }],
    });
    expect(network.edges).toEqual([{ from: nodeId(0, 0), to: nodeId(1, 0) }]);
  });

  it('ignores explicit connections that name unknown technologies', () => {
    const network = buildTechNetwork({
      ...baseStack,
      connections: [{ from: 'react', to: 'nonexistent' }],
    });
    expect(network.edges.length).toBeGreaterThan(1);
  });

  it('falls back to the flat technology list when no groups are configured', () => {
    const network = buildTechNetwork({ ...baseStack, groups: [], technologies: ['a', 'b'] });
    expect(network.columns).toEqual([{ label: 'stack', size: 2 }]);
    expect(network.edges).toEqual([]);
  });

  it('produces an empty network for an empty stack', () => {
    const network = buildTechNetwork({ ...baseStack, groups: [], technologies: [] });
    expect(network.nodes).toEqual([]);
    expect(network.rows).toBe(0);
  });

  it('normalizes the shipped configuration without orphan nodes', () => {
    const network = buildTechNetwork(profileConfig.stack);
    expect(network.nodes.length).toBe(
      profileConfig.stack.groups.reduce((sum, group) => sum + group.items.length, 0),
    );
    expect(network.edges.length).toBeGreaterThan(0);
  });
});

describe('phaseOffset', () => {
  it('stays inside the period and is deterministic', () => {
    for (let index = 0; index < 40; index += 1) {
      const offset = phaseOffset(index, 3.6);
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThan(3.6);
      expect(phaseOffset(index, 3.6)).toBe(offset);
    }
  });

  it('spreads neighbouring indices apart rather than clustering them', () => {
    const offsets = [0, 1, 2, 3, 4].map((index) => phaseOffset(index, 3.6));
    expect(new Set(offsets).size).toBeGreaterThan(1);
  });
});

describe('terminal key/value leaders', () => {
  const rows = [
    { key: 'name', value: 'Vladyslav Pilkevych' },
    { key: 'languages', value: 'Ukrainian / English' },
  ];

  it('uses one leader field wide enough for the longest key', () => {
    const field = leaderColumns(rows);
    expect(field).toBeGreaterThanOrEqual('languages'.length + 2);
  });

  it('aligns every value on the same column', () => {
    const field = leaderColumns(rows);
    for (const row of rows) {
      expect(row.key.length + 1 + buildLeader(row.key, field).length + 1).toBe(field);
    }
  });

  it('never produces a negative leader for an over-long key', () => {
    expect(buildLeader('an-extremely-long-key-name', 10)).toBe('');
  });
});

describe('contribution pulse mapping', () => {
  const config = {
    basePeriod: 3.4,
    jitter: 1.6,
    depth: [0.94, 0.88, 0.8, 0.68] as [number, number, number, number],
  };

  it('leaves empty cells completely still', () => {
    expect(pulseProfile(0, 5, config)).toBeNull();
  });

  it('pulses brighter cells more deeply than dim ones', () => {
    const dim = pulseProfile(1, 3, config);
    const bright = pulseProfile(4, 3, config);
    expect(dim?.minimum).toBeGreaterThan(bright?.minimum ?? 1);
  });

  it('keeps every period slow enough to read as breathing', () => {
    for (let index = 0; index < 200; index += 1) {
      for (const level of [1, 2, 3, 4] as const) {
        const profile = pulseProfile(level, index, config);
        expect(profile?.period).toBeGreaterThanOrEqual(1.6);
        expect(profile?.period).toBeLessThan(6);
      }
    }
  });

  it('staggers phases so neighbouring cells do not pulse in sync', () => {
    const phases = [0, 1, 2, 3, 4, 5].map((index) => pulseProfile(2, index, config)?.phase);
    expect(new Set(phases).size).toBe(phases.length);
    for (const phase of phases) {
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(1);
    }
  });

  it('is deterministic for the same cell', () => {
    expect(pulseProfile(3, 42, config)).toEqual(pulseProfile(3, 42, config));
  });
});

describe('all-time contributions', () => {
  it('covers every year from the join year to the current one', () => {
    const years = normalizeContributionYears(
      [2024, 2025],
      '2021-09-05T10:33:34Z',
      new Date('2026-09-13T00:00:00Z'),
    );
    expect(years).toEqual([2021, 2024, 2025, 2026]);
  });

  it('keeps the list sorted and free of duplicates', () => {
    const years = normalizeContributionYears(
      [2026, 2021, 2021],
      '2021-01-01T00:00:00Z',
      new Date('2026-09-13T00:00:00Z'),
    );
    expect(years).toEqual([2021, 2026]);
  });

  it('drops values GitHub could not have produced', () => {
    const years = normalizeContributionYears(
      [1998, 2999, 2022],
      '2022-01-01T00:00:00Z',
      new Date('2026-09-13T00:00:00Z'),
    );
    expect(years).toEqual([2022, 2026]);
  });

  it('builds one aliased collection per year inside a single query', () => {
    const query = buildAllTimeQuery([2021, 2022]);
    expect(query).toContain('y2021: contributionsCollection(from: "2021-01-01T00:00:00Z"');
    expect(query).toContain('y2022: contributionsCollection(from: "2022-01-01T00:00:00Z"');
    expect(query).toContain('to: "2021-12-31T23:59:59Z"');
    expect((query.match(/contributionsCollection/g) ?? []).length).toBe(2);
  });

  it('keeps each range inside the one-year window GraphQL allows', () => {
    const query = buildAllTimeQuery([2024]);
    const from = /from: "([^"]+)"/.exec(query)?.[1] ?? '';
    const to = /to: "([^"]+)"/.exec(query)?.[1] ?? '';
    const span = (Date.parse(to) - Date.parse(from)) / 86_400_000;
    expect(span).toBeLessThan(366);
  });
});
