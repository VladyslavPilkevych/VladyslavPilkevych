import type { Palette, ProfileConfig } from './types.ts';
import { clamp } from '../utils/numbers.ts';

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

function assertColors(palette: Palette, themeName: string): void {
  const entries: [string, string][] = Object.entries(palette)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([key, value]) => [key, value]);
  for (const [key, value] of entries) {
    if (!HEX_COLOR.test(value)) {
      throw new ConfigError(`theme.${themeName}.${key} must be a hex color, received "${value}".`);
    }
  }
  const contribution = [palette.contribution.empty, ...palette.contribution.levels];
  contribution.forEach((value, index) => {
    if (!HEX_COLOR.test(value)) {
      throw new ConfigError(
        `theme.${themeName}.contribution entry ${String(index)} must be a hex color.`,
      );
    }
  });
}

export function resolveConfig(config: ProfileConfig): ProfileConfig {
  if (!config.githubUsername.trim()) {
    throw new ConfigError('githubUsername must not be empty.');
  }
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(config.githubUsername)) {
    throw new ConfigError(`githubUsername "${config.githubUsername}" is not a valid GitHub login.`);
  }
  const codingSince = config.personal.codingSince;
  if (codingSince !== null && !ISO_DATE.test(codingSince)) {
    throw new ConfigError('personal.codingSince must be an ISO date such as "2021-09-05".');
  }
  if (config.avatar.characterRamp.length < 2) {
    throw new ConfigError('avatar.characterRamp needs at least two characters.');
  }
  if (config.theme.typography.cellWidth <= 0 || config.theme.typography.fontSize <= 0) {
    throw new ConfigError('theme.typography sizes must be positive.');
  }
  if (config.theme.spacing.canvasWidth < 480) {
    throw new ConfigError('theme.spacing.canvasWidth must be at least 480.');
  }
  assertColors(config.theme.dark, 'dark');
  assertColors(config.theme.light, 'light');

  return {
    ...config,
    githubUsername: config.githubUsername.trim(),
    avatar: {
      ...config.avatar,
      width: Math.round(clamp(config.avatar.width, 8, 80)),
      cellAspectRatio: clamp(config.avatar.cellAspectRatio, 0.5, 4),
      contrast: clamp(config.avatar.contrast, 0.1, 4),
      brightness: clamp(config.avatar.brightness, -1, 1),
      gamma: clamp(config.avatar.gamma, 0.1, 4),
      trimBorder: clamp(config.avatar.trimBorder, 0, 0.45),
      focusX: clamp(config.avatar.focusX, 0, 1),
      focusY: clamp(config.avatar.focusY, 0, 1),
      normalizeClip: clamp(config.avatar.normalizeClip, 0, 0.2),
      subjectBoost: clamp(config.avatar.subjectBoost, 0, 1),
    },
    github: {
      ...config.github,
      maxLanguages: Math.round(clamp(config.github.maxLanguages, 1, 16)),
      minLanguageShare: clamp(config.github.minLanguageShare, 0, 50),
    },
  };
}
