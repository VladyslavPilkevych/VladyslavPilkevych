export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs < 1000) return String(Math.trunc(value));
  if (abs < 1_000_000) {
    const scaled = value / 1000;
    return `${trimTrailingZero(scaled.toFixed(Math.abs(scaled) < 10 ? 1 : 0))}k`;
  }
  const scaled = value / 1_000_000;
  return `${trimTrailingZero(scaled.toFixed(Math.abs(scaled) < 10 ? 1 : 0))}M`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${roundTo(value, decimals).toFixed(decimals)}%`;
}

function trimTrailingZero(value: string): string {
  return value.replace(/\.0$/, '');
}

export function largestRemainderRound(shares: number[], decimals: number): number[] {
  const step = 10 ** -decimals;
  const total = shares.reduce((sum, share) => sum + share, 0);
  if (total === 0) return shares.map(() => 0);
  const scaled = shares.map((share) => share / step);
  const floored = scaled.map((value) => Math.floor(value));
  const targetUnits = Math.round(total / step);
  let deficit = targetUnits - floored.reduce((sum, value) => sum + value, 0);
  const order = scaled
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  let cursor = 0;
  while (deficit > 0 && order.length > 0) {
    const entry = order[cursor % order.length];
    if (!entry) break;
    floored[entry.index] = (floored[entry.index] ?? 0) + 1;
    deficit -= 1;
    cursor += 1;
  }
  return floored.map((units) => roundTo(units * step, decimals));
}
