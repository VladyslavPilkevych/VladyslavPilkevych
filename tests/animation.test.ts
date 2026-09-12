import { describe, expect, it } from 'vitest';
import profileConfig from '../profile.config.ts';
import { fixtureProfileData } from '../fixtures/profile.fixture.ts';
import { resolveConfig } from '../src/config/resolve.ts';
import { createMotion, seconds } from '../src/renderer/animation.ts';
import { buildTimeline, endOfEntrance } from '../src/renderer/timeline.ts';
import { splitCommand } from '../src/renderer/components/SectionHeader.tsx';
import { renderProfile } from '../src/renderer/renderProfile.tsx';
import { serializeElement } from '../src/svg/serialize.ts';
import { validateSvg } from '../src/validate/validateSvg.ts';
import type { SvgElement } from '../src/svg/jsx.ts';

const config = resolveConfig(profileConfig);
const motion = createMotion(config.animation);
const still = createMotion({ ...config.animation, enabled: false });
const animated = renderProfile(fixtureProfileData, config, 'dark');
const static_ = renderProfile(
  fixtureProfileData,
  { ...config, animation: { ...config.animation, enabled: false } },
  'dark',
);

function render(node: unknown): string {
  return serializeElement(node as SvgElement);
}

describe('seconds', () => {
  it('formats a SMIL clock value', () => {
    expect(seconds(1.5)).toBe('1.5s');
    expect(seconds(0)).toBe('0s');
    expect(seconds(-3)).toBe('0s');
  });
});

describe('motion helpers', () => {
  it('emits nothing at all when animation is disabled', () => {
    expect(still.enabled).toBe(false);
    expect(still.fadeIn(1)).toBeNull();
    expect(still.rise(1)).toBeNull();
    expect(still.blink()).toBeNull();
    expect(still.typeIn(1, 1, 100, 20)).toBeNull();
    expect(still.grow('width', 1, 1, 50)).toBeNull();
  });

  it('holds the start value until the reveal begins, then freezes', () => {
    const markup = render(motion.fadeIn(2, 0.5));
    expect(markup).toContain('attributeName="opacity"');
    expect(markup).toContain('values="0;0;1"');
    expect(markup).toContain('fill="freeze"');
    expect(markup).toContain('dur="2.5s"');
    expect(markup).not.toContain('repeatCount');
  });

  it('skips the holding keyframe when the reveal starts immediately', () => {
    const markup = render(motion.fadeIn(0, 0.4));
    expect(markup).toContain('from="0"');
    expect(markup).toContain('to="1"');
    expect(markup).not.toContain('keyTimes');
  });

  it('types in discrete steps that finish on the full width', () => {
    const markup = render(motion.typeIn(1, 0.5, 120, 20));
    expect(markup).toContain('calcMode="discrete"');
    expect(markup).toContain('attributeName="width"');
    expect(markup).toContain('fill="freeze"');
    const values = /values="([^"]+)"/.exec(markup)?.[1]?.split(';') ?? [];
    const keyTimes = /keyTimes="([^"]+)"/.exec(markup)?.[1]?.split(';') ?? [];
    expect(values.length).toBe(keyTimes.length);
    expect(values.length).toBeGreaterThan(4);
    expect(Number(values[0])).toBe(0);
    expect(Number(values[values.length - 1])).toBe(120);
    const numericTimes = keyTimes.map(Number);
    expect(numericTimes[0]).toBe(0);
    expect(numericTimes[numericTimes.length - 1]).toBeLessThanOrEqual(1);
    for (let index = 1; index < numericTimes.length; index += 1) {
      expect(numericTimes[index]).toBeGreaterThanOrEqual(numericTimes[index - 1] ?? 0);
    }
  });

  it('loops the cursor with a hard on/off rhythm rather than a fade', () => {
    const markup = render(motion.blink());
    expect(markup).toContain('calcMode="discrete"');
    expect(markup).toContain('values="1;0"');
    expect(markup).toContain('repeatCount="indefinite"');
    expect(config.animation.cursorBlinkPeriod / 2).toBeGreaterThanOrEqual(0.5);
    expect(config.animation.cursorBlinkPeriod / 2).toBeLessThanOrEqual(0.7);
  });

  it('never emits a non-finite time', () => {
    expect(render(motion.grow('width', 0, 0, 10))).not.toContain('NaN');
    expect(render(motion.fadeIn(0, 0))).not.toContain('NaN');
  });
});

describe('timeline', () => {
  const timeline = buildTimeline(config.animation);

  it('runs the headers ahead of their section bodies', () => {
    expect(timeline.stats.header).toBeLessThan(timeline.stats.body);
    expect(timeline.stack.header).toBeLessThan(timeline.stack.body);
    expect(timeline.graph.header).toBeLessThan(timeline.graph.body);
  });

  it('orders the entrance sequence from the frame to the footer', () => {
    expect(timeline.chrome).toBeLessThan(timeline.hero.header);
    expect(timeline.hero.header).toBeLessThan(timeline.avatar.begin);
    expect(timeline.avatar.begin).toBeLessThan(timeline.stats.body);
    expect(timeline.stats.body).toBeLessThan(timeline.stack.body);
    expect(timeline.stack.body).toBeLessThan(timeline.graph.body);
    expect(timeline.graph.body).toBeLessThan(timeline.footer);
  });

  it('finishes the entrance within a few seconds', () => {
    const end = endOfEntrance(timeline);
    expect(end).toBeGreaterThan(3);
    expect(end).toBeLessThan(7);
  });
});

describe('splitCommand', () => {
  it('separates the command name from its arguments', () => {
    expect(splitCommand('gh contributions --range 12m')).toEqual({
      name: 'gh',
      args: ' contributions --range 12m',
    });
    expect(splitCommand('whoami')).toEqual({ name: 'whoami', args: '' });
  });
});

describe('animated document', () => {
  it('animates with SMIL and never with script or CSS keyframes', () => {
    expect(animated).toContain('<animate ');
    expect(animated).not.toContain('<script');
    expect(animated).not.toContain('@keyframes');
    expect(animated).not.toContain('<style');
    expect(animated).not.toMatch(/\son[a-z]+=/i);
  });

  it('keeps only a handful of indefinite loops', () => {
    const loops = animated.match(/repeatCount="indefinite"/g) ?? [];
    expect(loops.length).toBeGreaterThan(0);
    expect(loops.length).toBeLessThanOrEqual(8);
  });

  it('freezes every non-looping animation on its final value', () => {
    const animations = animated.match(/<animate(?:Transform)?\b[^>]*>/g) ?? [];
    for (const node of animations) {
      const loops = node.includes('repeatCount="indefinite"');
      expect(loops || node.includes('fill="freeze"')).toBe(true);
    }
  });

  it('stays a reasonable size', () => {
    expect(animated.length).toBeLessThan(140_000);
  });

  it('is deterministic', () => {
    expect(renderProfile(fixtureProfileData, config, 'dark')).toBe(animated);
  });

  it('still passes output validation', () => {
    expect(() => validateSvg({ svg: animated, label: 'animated' })).not.toThrow();
  });
});

describe('static fallback', () => {
  it('renders without any animation node when motion is disabled', () => {
    expect(static_).not.toContain('<animate');
    expect(() => validateSvg({ svg: static_, label: 'static' })).not.toThrow();
  });

  it('keeps every clip rectangle open so a renderer that ignores SMIL shows everything', () => {
    const clipRects = animated.match(/<clipPath\b[^>]*>\s*<rect\b[^>]*/g) ?? [];
    expect(clipRects.length).toBeGreaterThan(0);
    for (const rect of clipRects) {
      const width = Number(/width="([\d.]+)"/.exec(rect)?.[1] ?? '0');
      expect(width).toBeGreaterThan(0);
    }
  });

  it('exposes the same visible text as the animated document', () => {
    const strip = (svg: string): string[] =>
      (svg.match(/<text\b[^>]*>([^<]*)<\/text>/g) ?? []).map((node) =>
        node.replace(/<[^>]+>/g, ''),
      );
    expect(strip(static_)).toEqual(strip(animated));
  });
});
