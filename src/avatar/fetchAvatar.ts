import sharp from 'sharp';
import type { GitHubClient } from '../github/client.ts';
import { GitHubApiError, errorMessage } from '../github/client.ts';
import type { AvatarConfig } from '../config/types.ts';
import type { AsciiPortrait } from '../data/types.ts';
import {
  computeAsciiSize,
  cropFrame,
  normalizeLuminance,
  renderAscii,
  resizeBox,
  trimBlankRows,
  rgbToGray,
  type GrayImage,
} from './imageToAscii.ts';

const SOURCE_SIZE = 460;

function withSize(avatarUrl: string, size: number): string {
  const url = new URL(avatarUrl);
  url.searchParams.set('s', String(size));
  return url.toString();
}

export async function decodeAvatar(buffer: Buffer, subjectBoost: number): Promise<GrayImage> {
  const { data, info } = await sharp(buffer)
    .flatten({ background: '#000000' })
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels < 3) {
    throw new GitHubApiError('The avatar could not be decoded into an RGB image.');
  }
  return rgbToGray(new Uint8Array(data), info.width, info.height, info.channels, subjectBoost);
}

async function resizeWithLanczos(
  image: GrayImage,
  columns: number,
  rows: number,
): Promise<GrayImage> {
  const { data, info } = await sharp(Buffer.from(image.pixels), {
    raw: { width: image.width, height: image.height, channels: 1 },
  })
    .resize(columns, rows, { fit: 'fill', kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return rgbToGray(new Uint8Array(data), info.width, info.height, info.channels, 0);
}

export async function portraitFromImage(
  decoded: GrayImage,
  config: AvatarConfig,
): Promise<AsciiPortrait> {
  const trimmed = cropFrame(decoded, config.trimBorder, config.focusX, config.focusY);
  const prepared = config.normalize ? normalizeLuminance(trimmed, config.normalizeClip) : trimmed;
  const size = computeAsciiSize(
    prepared.width,
    prepared.height,
    config.width,
    config.cellAspectRatio,
  );
  const resized =
    config.sampling === 'lanczos'
      ? await resizeWithLanczos(prepared, size.columns, size.rows)
      : resizeBox(prepared, size);
  const rows = trimBlankRows(renderAscii(resized, config));
  return {
    rows,
    columns: rows.reduce((widest, row) => Math.max(widest, [...row].length), 0),
    lines: rows.length,
  };
}

export async function buildAsciiPortrait(
  client: GitHubClient,
  avatarUrl: string,
  config: AvatarConfig,
): Promise<AsciiPortrait> {
  let buffer: Buffer;
  try {
    buffer = await client.binary(withSize(avatarUrl, SOURCE_SIZE), 'avatar download');
  } catch (cause) {
    throw new GitHubApiError(`Failed to download the GitHub avatar: ${errorMessage(cause)}`);
  }
  return portraitFromImage(await decodeAvatar(buffer, config.subjectBoost), config);
}
