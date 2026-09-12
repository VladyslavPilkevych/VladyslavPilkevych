import { h, type SvgChild } from '../svg/jsx.ts';
import type { AnimationConfig } from '../config/types.ts';
import { clamp, roundTo } from '../utils/numbers.ts';

const TIME_PRECISION = 3;
const VALUE_PRECISION = 2;
const MIN_DURATION = 0.001;

export function seconds(value: number): string {
  return `${String(roundTo(Math.max(0, value), TIME_PRECISION))}s`;
}

function amount(value: number): string {
  return String(roundTo(value, VALUE_PRECISION));
}

function keyTimeList(times: number[]): string {
  return times.map((time) => String(roundTo(clamp(time, 0, 1), 4))).join(';');
}

export interface Motion {
  readonly enabled: boolean;
  readonly config: AnimationConfig;
  fadeIn(begin: number, duration?: number): SvgChild;
  rise(begin: number, distance?: number, duration?: number): SvgChild;
  grow(attribute: string, begin: number, duration: number, to: number, from?: number): SvgChild;
  typeIn(begin: number, duration: number, to: number, characters: number): SvgChild;
  blink(): SvgChild;
  pulse(min?: number, period?: number): SvgChild;
  shimmer(begin: number, min?: number, period?: number): SvgChild;
  sweep(begin: number, duration: number, from: number, to: number, repeat?: boolean): SvgChild;
}

function hold(
  attributeName: string,
  from: string,
  to: string,
  begin: number,
  duration: number,
  extra: Record<string, string | number> = {},
): SvgChild {
  const safeDuration = Math.max(MIN_DURATION, duration);
  if (begin <= 0) {
    return h('animate', {
      attributeName,
      from,
      to,
      dur: seconds(safeDuration),
      fill: 'freeze',
      ...extra,
    });
  }
  const total = begin + safeDuration;
  return h('animate', {
    attributeName,
    values: `${from};${from};${to}`,
    keyTimes: keyTimeList([0, begin / total, 1]),
    dur: seconds(total),
    fill: 'freeze',
    ...extra,
  });
}

const DISABLED_MOTION: Motion = {
  enabled: false,
  config: {} as AnimationConfig,
  fadeIn: () => null,
  rise: () => null,
  grow: () => null,
  typeIn: () => null,
  blink: () => null,
  pulse: () => null,
  shimmer: () => null,
  sweep: () => null,
};

export function createMotion(config: AnimationConfig): Motion {
  if (!config.enabled) return { ...DISABLED_MOTION, config };

  return {
    enabled: true,
    config,

    fadeIn(begin, duration = config.sectionFadeDuration) {
      return hold('opacity', '0', '1', begin, duration);
    },

    rise(begin, distance = 5, duration = config.sectionFadeDuration) {
      const safeDuration = Math.max(MIN_DURATION, duration);
      const total = begin + safeDuration;
      const start = `0 ${amount(distance)}`;
      if (begin <= 0) {
        return h('animateTransform', {
          attributeName: 'transform',
          type: 'translate',
          from: start,
          to: '0 0',
          dur: seconds(safeDuration),
          fill: 'freeze',
        });
      }
      return h('animateTransform', {
        attributeName: 'transform',
        type: 'translate',
        values: `${start};${start};0 0`,
        keyTimes: keyTimeList([0, begin / total, 1]),
        dur: seconds(total),
        fill: 'freeze',
      });
    },

    grow(attribute, begin, duration, to, from = 0) {
      return hold(attribute, amount(from), amount(to), begin, duration);
    },

    typeIn(begin, duration, to, characters) {
      const steps = Math.round(clamp(characters / 2, 4, 14));
      const safeDuration = Math.max(MIN_DURATION, duration);
      const total = begin + safeDuration;
      const values: string[] = ['0'];
      const times: number[] = [0];
      for (let step = 1; step <= steps; step += 1) {
        values.push(amount((to * step) / steps));
        times.push((begin + (safeDuration * (step - 1)) / steps) / total);
      }
      return h('animate', {
        attributeName: 'width',
        values: values.join(';'),
        keyTimes: keyTimeList(times),
        calcMode: 'discrete',
        dur: seconds(total),
        fill: 'freeze',
      });
    },

    blink() {
      return h('animate', {
        attributeName: 'opacity',
        values: '1;0',
        keyTimes: '0;0.5',
        calcMode: 'discrete',
        dur: seconds(config.cursorBlinkPeriod),
        repeatCount: 'indefinite',
      });
    },

    pulse(min = 0.3, period = config.statusPulsePeriod) {
      return h('animate', {
        attributeName: 'opacity',
        values: `1;${amount(min)};1`,
        keyTimes: '0;0.5;1',
        dur: seconds(period),
        repeatCount: 'indefinite',
      });
    },

    shimmer(begin, min = 0.9, period = config.idleLoopDuration) {
      return h('animate', {
        attributeName: 'opacity',
        values: `1;1;${amount(min)};1`,
        keyTimes: '0;0.45;0.7;1',
        dur: seconds(period),
        begin: seconds(begin),
        repeatCount: 'indefinite',
      });
    },

    sweep(begin, duration, from, to, repeat = false) {
      const safeDuration = Math.max(MIN_DURATION, duration);
      return h('animateTransform', {
        attributeName: 'transform',
        type: 'translate',
        values: `0 ${amount(from)};0 ${amount(to)}`,
        dur: seconds(safeDuration),
        begin: seconds(begin),
        ...(repeat ? { repeatCount: 'indefinite' } : { fill: 'freeze' }),
      });
    },
  };
}
