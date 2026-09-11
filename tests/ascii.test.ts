import { describe, expect, it } from 'vitest';
import {
  adjustLuminance,
  computeAsciiSize,
  cropFrame,
  imageToAscii,
  luminanceToCharacter,
  mixLuminance,
  normalizeLuminance,
  renderAscii,
  resizeBox,
  rgbToGray,
  trimBlankRows,
  type GrayImage,
} from '../src/avatar/imageToAscii.ts';

const RAMP = ' .:-=+*#%@';
const NEUTRAL = { characterRamp: RAMP, contrast: 1, brightness: 0, gamma: 1, invert: false };

function gradient(width: number, height: number): GrayImage {
  const pixels = new Uint8Array(width * height);
  for (let index = 0; index < pixels.length; index += 1) {
    pixels[index] = Math.round((index / (pixels.length - 1)) * 255);
  }
  return { width, height, pixels };
}

describe('computeAsciiSize', () => {
  it('compensates for the tall aspect ratio of a character cell', () => {
    expect(computeAsciiSize(400, 400, 62, 2.05)).toEqual({ columns: 62, rows: 30 });
  });

  it('keeps the source proportions for non-square images', () => {
    expect(computeAsciiSize(800, 400, 60, 2)).toEqual({ columns: 60, rows: 15 });
    expect(computeAsciiSize(400, 800, 60, 2)).toEqual({ columns: 60, rows: 60 });
  });

  it('never collapses to zero rows', () => {
    expect(computeAsciiSize(1000, 1, 40, 2.05).rows).toBe(1);
  });

  it('rejects impossible inputs', () => {
    expect(() => computeAsciiSize(0, 100, 40, 2)).toThrow();
    expect(() => computeAsciiSize(100, 100, 0, 2)).toThrow();
    expect(() => computeAsciiSize(100, 100, 40, 0)).toThrow();
  });
});

describe('luminance mapping', () => {
  it('maps the darkest value to the first ramp character and the brightest to the last', () => {
    expect(luminanceToCharacter(0, NEUTRAL)).toBe(' ');
    expect(luminanceToCharacter(1, NEUTRAL)).toBe('@');
  });

  it('walks the ramp monotonically', () => {
    const indices = [0, 0.25, 0.5, 0.75, 1].map((value) =>
      RAMP.indexOf(luminanceToCharacter(value, NEUTRAL)),
    );
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(new Set(indices).size).toBe(indices.length);
  });

  it('inverts the ramp when asked', () => {
    expect(luminanceToCharacter(0, { ...NEUTRAL, invert: true })).toBe('@');
    expect(luminanceToCharacter(1, { ...NEUTRAL, invert: true })).toBe(' ');
  });

  it('clamps out-of-range luminance instead of producing an undefined character', () => {
    expect(luminanceToCharacter(-5, NEUTRAL)).toBe(' ');
    expect(luminanceToCharacter(5, NEUTRAL)).toBe('@');
  });

  it('rejects an empty ramp', () => {
    expect(() => luminanceToCharacter(0.5, { ...NEUTRAL, characterRamp: '' })).toThrow();
  });

  it('pushes values away from mid grey as contrast rises', () => {
    expect(
      adjustLuminance(0.3, { contrast: 2, brightness: 0, gamma: 1, invert: false }),
    ).toBeCloseTo(0.1, 5);
    expect(
      adjustLuminance(0.7, { contrast: 2, brightness: 0, gamma: 1, invert: false }),
    ).toBeCloseTo(0.9, 5);
  });

  it('keeps results inside the unit range for extreme settings', () => {
    const value = adjustLuminance(0.9, { contrast: 4, brightness: 0.9, gamma: 0.2, invert: false });
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  });
});

describe('mixLuminance', () => {
  it('falls back to plain luma when no subject boost is requested', () => {
    expect(mixLuminance(255, 255, 255, 0)).toBeCloseTo(255, 5);
    expect(mixLuminance(0, 0, 0, 0)).toBe(0);
  });

  it('lifts saturated colours above neutral greys of the same brightness', () => {
    const grey = mixLuminance(90, 90, 90, 1);
    const green = mixLuminance(40, 130, 40, 1);
    expect(green).toBeGreaterThan(grey);
  });

  it('never leaves the 0..255 range', () => {
    expect(mixLuminance(255, 0, 0, 1)).toBeLessThanOrEqual(255);
    expect(mixLuminance(255, 255, 0, 1)).toBeLessThanOrEqual(255);
  });
});

describe('rgbToGray', () => {
  it('reads pixels at the reported channel stride', () => {
    const data = new Uint8Array([255, 255, 255, 255, 0, 0, 0, 255]);
    const image = rgbToGray(data, 2, 1, 4, 0);
    expect(image.width).toBe(2);
    expect(image.pixels[0]).toBe(255);
    expect(image.pixels[1]).toBe(0);
  });
});

describe('cropFrame', () => {
  it('returns the image untouched when nothing is trimmed', () => {
    const image = gradient(10, 10);
    expect(cropFrame(image, 0)).toBe(image);
  });

  it('removes the requested border on every side', () => {
    const cropped = cropFrame(gradient(10, 10), 0.1);
    expect(cropped.width).toBe(8);
    expect(cropped.height).toBe(8);
    expect(cropped.pixels.length).toBe(64);
  });

  it('shifts the window towards the requested focus point', () => {
    const image = gradient(10, 10);
    const high = cropFrame(image, 0.2, 0.5, 0);
    const low = cropFrame(image, 0.2, 0.5, 1);
    expect(high.pixels[0]).toBeLessThan(low.pixels[0] ?? 0);
  });
});

describe('resizeBox', () => {
  it('averages source pixels into the target grid', () => {
    const image: GrayImage = { width: 2, height: 2, pixels: new Uint8Array([0, 100, 200, 255]) };
    const resized = resizeBox(image, { columns: 1, rows: 1 });
    expect(resized.pixels[0]).toBe(139);
  });

  it('produces exactly columns times rows pixels', () => {
    const resized = resizeBox(gradient(37, 53), { columns: 9, rows: 4 });
    expect(resized.pixels.length).toBe(36);
  });
});

describe('normalizeLuminance', () => {
  it('stretches a compressed tonal range across the full scale', () => {
    const pixels = new Uint8Array(100);
    for (let index = 0; index < pixels.length; index += 1) pixels[index] = 40 + (index % 20);
    const normalized = normalizeLuminance({ width: 10, height: 10, pixels }, 0);
    expect(Math.min(...normalized.pixels)).toBe(0);
    expect(Math.max(...normalized.pixels)).toBe(255);
  });

  it('leaves a flat image alone instead of dividing by zero', () => {
    const flat: GrayImage = { width: 2, height: 2, pixels: new Uint8Array([7, 7, 7, 7]) };
    expect(normalizeLuminance(flat, 0.01)).toBe(flat);
  });
});

describe('renderAscii', () => {
  it('emits one row per image line and strips trailing blanks', () => {
    const image: GrayImage = {
      width: 3,
      height: 2,
      pixels: new Uint8Array([255, 0, 0, 255, 255, 0]),
    };
    expect(renderAscii(image, NEUTRAL)).toEqual(['@', '@@']);
  });

  it('keeps leading blanks so columns stay aligned', () => {
    const image: GrayImage = { width: 3, height: 1, pixels: new Uint8Array([0, 0, 255]) };
    expect(renderAscii(image, NEUTRAL)).toEqual(['  @']);
  });
});

describe('trimBlankRows', () => {
  it('drops empty rows at both ends but keeps interior gaps', () => {
    expect(trimBlankRows(['', '  ', 'a', '', 'b', '', ''])).toEqual(['a', '', 'b']);
  });

  it('returns an empty list for a fully blank portrait', () => {
    expect(trimBlankRows(['', '   ', ''])).toEqual([]);
  });
});

describe('imageToAscii', () => {
  it('is deterministic for identical input', () => {
    const options = {
      ...NEUTRAL,
      columns: 24,
      cellAspectRatio: 2,
      trimBorder: 0.05,
      focusX: 0.5,
      focusY: 0.5,
      normalize: true,
      normalizeClip: 0.01,
    };
    const first = imageToAscii(gradient(64, 64), options);
    const second = imageToAscii(gradient(64, 64), options);
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it('never produces rows wider than the requested column count', () => {
    const rows = imageToAscii(gradient(64, 64), {
      ...NEUTRAL,
      columns: 24,
      cellAspectRatio: 2,
      trimBorder: 0,
      focusX: 0.5,
      focusY: 0.5,
      normalize: false,
      normalizeClip: 0,
    });
    for (const row of rows) expect([...row].length).toBeLessThanOrEqual(24);
  });
});
