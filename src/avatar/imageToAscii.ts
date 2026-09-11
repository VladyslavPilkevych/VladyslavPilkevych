import { clamp } from '../utils/numbers.ts';

export interface GrayImage {
  width: number;
  height: number;
  pixels: Uint8Array;
}

export interface AsciiRenderOptions {
  characterRamp: string;
  contrast: number;
  brightness: number;
  gamma: number;
  invert: boolean;
}

export interface AsciiSize {
  columns: number;
  rows: number;
}

export function computeAsciiSize(
  sourceWidth: number,
  sourceHeight: number,
  targetColumns: number,
  cellAspectRatio: number,
): AsciiSize {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('Source image must have a positive size.');
  }
  if (targetColumns <= 0) {
    throw new Error('Target column count must be positive.');
  }
  if (cellAspectRatio <= 0) {
    throw new Error('Cell aspect ratio must be positive.');
  }
  const columns = Math.max(1, Math.round(targetColumns));
  const rows = Math.max(1, Math.round((columns * sourceHeight) / (sourceWidth * cellAspectRatio)));
  return { columns, rows };
}

export function cropFrame(
  image: GrayImage,
  fraction: number,
  focusX = 0.5,
  focusY = 0.5,
): GrayImage {
  const ratio = clamp(fraction, 0, 0.45);
  if (ratio === 0) return image;
  const width = image.width - Math.floor(image.width * ratio) * 2;
  const height = image.height - Math.floor(image.height * ratio) * 2;
  if (width <= 0 || height <= 0) return image;
  const left = Math.round(
    clamp(image.width * clamp(focusX, 0, 1) - width / 2, 0, image.width - width),
  );
  const top = Math.round(
    clamp(image.height * clamp(focusY, 0, 1) - height / 2, 0, image.height - height),
  );
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const sourceOffset = (y + top) * image.width + left;
    pixels.set(image.pixels.subarray(sourceOffset, sourceOffset + width), y * width);
  }
  return { width, height, pixels };
}

export function resizeBox(image: GrayImage, size: AsciiSize): GrayImage {
  const { columns, rows } = size;
  const pixels = new Uint8Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    const startY = Math.floor((row * image.height) / rows);
    const endY = Math.max(startY + 1, Math.floor(((row + 1) * image.height) / rows));
    for (let column = 0; column < columns; column += 1) {
      const startX = Math.floor((column * image.width) / columns);
      const endX = Math.max(startX + 1, Math.floor(((column + 1) * image.width) / columns));
      let total = 0;
      let samples = 0;
      for (let y = startY; y < endY; y += 1) {
        const rowOffset = y * image.width;
        for (let x = startX; x < endX; x += 1) {
          total += image.pixels[rowOffset + x] ?? 0;
          samples += 1;
        }
      }
      pixels[row * columns + column] = samples === 0 ? 0 : Math.round(total / samples);
    }
  }
  return { width: columns, height: rows, pixels };
}

export function adjustLuminance(
  value: number,
  options: Pick<AsciiRenderOptions, 'contrast' | 'brightness' | 'gamma' | 'invert'>,
): number {
  let luminance = clamp(value, 0, 1);
  luminance = clamp(luminance ** Math.max(options.gamma, 0.01), 0, 1);
  luminance = clamp((luminance - 0.5) * options.contrast + 0.5, 0, 1);
  luminance = clamp(luminance + options.brightness, 0, 1);
  return options.invert ? 1 - luminance : luminance;
}

export function luminanceToCharacter(value: number, options: AsciiRenderOptions): string {
  const ramp = [...options.characterRamp];
  if (ramp.length === 0) {
    throw new Error('Character ramp must not be empty.');
  }
  const adjusted = adjustLuminance(value, options);
  const index = clamp(Math.round(adjusted * (ramp.length - 1)), 0, ramp.length - 1);
  return ramp[index] ?? ' ';
}

export function trimBlankRows(rows: string[]): string[] {
  let start = 0;
  let end = rows.length;
  while (start < end && (rows[start] ?? '').trim().length === 0) start += 1;
  while (end > start && (rows[end - 1] ?? '').trim().length === 0) end -= 1;
  return rows.slice(start, end);
}

export function renderAscii(image: GrayImage, options: AsciiRenderOptions): string[] {
  const rows: string[] = [];
  for (let row = 0; row < image.height; row += 1) {
    let line = '';
    for (let column = 0; column < image.width; column += 1) {
      const pixel = image.pixels[row * image.width + column] ?? 0;
      line += luminanceToCharacter(pixel / 255, options);
    }
    rows.push(line.replace(/\s+$/, ''));
  }
  return rows;
}

export interface AsciiPipelineOptions extends AsciiRenderOptions {
  columns: number;
  cellAspectRatio: number;
  trimBorder: number;
  focusX: number;
  focusY: number;
  normalize: boolean;
  normalizeClip: number;
}

export function imageToAscii(image: GrayImage, options: AsciiPipelineOptions): string[] {
  const trimmed = cropFrame(image, options.trimBorder, options.focusX, options.focusY);
  const cropped = options.normalize ? normalizeLuminance(trimmed, options.normalizeClip) : trimmed;
  const size = computeAsciiSize(
    cropped.width,
    cropped.height,
    options.columns,
    options.cellAspectRatio,
  );
  const resized =
    cropped.width === size.columns && cropped.height === size.rows
      ? cropped
      : resizeBox(cropped, size);
  return trimBlankRows(renderAscii(resized, options));
}

export function normalizeLuminance(image: GrayImage, clip: number): GrayImage {
  const histogram = new Uint32Array(256);
  for (const value of image.pixels) histogram[value] = (histogram[value] ?? 0) + 1;
  const total = image.pixels.length;
  if (total === 0) return image;
  const cutoff = Math.floor(total * clamp(clip, 0, 0.45));

  let low = 0;
  let seen = 0;
  for (let value = 0; value < 256; value += 1) {
    seen += histogram[value] ?? 0;
    if (seen > cutoff) {
      low = value;
      break;
    }
  }

  let high = 255;
  seen = 0;
  for (let value = 255; value >= 0; value -= 1) {
    seen += histogram[value] ?? 0;
    if (seen > cutoff) {
      high = value;
      break;
    }
  }

  if (high <= low) return image;
  const scale = 255 / (high - low);
  const pixels = new Uint8Array(image.pixels.length);
  for (let index = 0; index < image.pixels.length; index += 1) {
    const value = image.pixels[index] ?? 0;
    pixels[index] = Math.round(clamp((value - low) * scale, 0, 255));
  }
  return { width: image.width, height: image.height, pixels };
}

export function mixLuminance(
  red: number,
  green: number,
  blue: number,
  subjectBoost: number,
): number {
  const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  if (subjectBoost <= 0) return clamp(luma, 0, 255);
  const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
  const boost = clamp(subjectBoost, 0, 1);
  return clamp(luma * (1 - 0.45 * boost) + chroma * 0.75 * boost, 0, 255);
}

export function rgbToGray(
  data: Uint8Array,
  width: number,
  height: number,
  channels: number,
  subjectBoost: number,
): GrayImage {
  const pixels = new Uint8Array(width * height);
  for (let index = 0; index < pixels.length; index += 1) {
    const offset = index * channels;
    const red = data[offset] ?? 0;
    const green = data[offset + 1] ?? red;
    const blue = data[offset + 2] ?? red;
    pixels[index] = Math.round(mixLuminance(red, green, blue, subjectBoost));
  }
  return { width, height, pixels };
}
