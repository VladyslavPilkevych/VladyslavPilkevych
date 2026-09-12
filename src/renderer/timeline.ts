import type { AnimationConfig } from '../config/types.ts';

const HEADER_LEAD = 0.28;

export interface SectionTiming {
  header: number;
  body: number;
  stagger: number;
}

export interface Timeline {
  chrome: number;
  hero: SectionTiming;
  avatar: { begin: number; duration: number };
  identity: SectionTiming;
  stats: SectionTiming;
  bars: { begin: number; duration: number; stagger: number };
  stack: SectionTiming;
  graph: SectionTiming & { duration: number };
  activity: SectionTiming;
  footer: number;
  typingDuration: number;
  sectionFade: number;
}

export function buildTimeline(config: AnimationConfig): Timeline {
  const lead = (body: number): number => Math.max(0, body - HEADER_LEAD);
  return {
    chrome: config.chromeDelay,
    hero: {
      header: config.heroDelay,
      body: config.avatarRevealDelay,
      stagger: 0,
    },
    avatar: {
      begin: config.avatarRevealDelay,
      duration: config.avatarRevealDuration,
    },
    identity: {
      header: config.identityRevealDelay,
      body: config.identityRevealDelay,
      stagger: config.identityRowStagger,
    },
    stats: {
      header: lead(config.statsRevealDelay),
      body: config.statsRevealDelay,
      stagger: config.statsRowStagger,
    },
    bars: {
      begin: config.barFillDelay,
      duration: config.barFillDuration,
      stagger: config.barFillStagger,
    },
    stack: {
      header: lead(config.stackRevealDelay),
      body: config.stackRevealDelay,
      stagger: config.stackRowStagger,
    },
    graph: {
      header: lead(config.graphRevealDelay),
      body: config.graphRevealDelay,
      stagger: 0,
      duration: config.graphRevealDuration,
    },
    activity: {
      header: lead(config.activityRevealDelay),
      body: config.activityRevealDelay,
      stagger: config.activityRowStagger,
    },
    footer: config.footerDelay,
    typingDuration: config.typingDuration,
    sectionFade: config.sectionFadeDuration,
  };
}

export function endOfEntrance(timeline: Timeline): number {
  return Math.max(
    timeline.footer,
    timeline.graph.body + timeline.graph.duration,
    timeline.avatar.begin + timeline.avatar.duration,
  );
}
