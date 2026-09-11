import { stripControlCharacters } from './xml.ts';

export function sanitize(value: string): string {
  return stripControlCharacters(value).replace(/\s+/g, ' ').trim();
}

export function truncate(value: string, maxLength: number, ellipsis = '…'): string {
  const characters = [...value];
  if (characters.length <= maxLength) return value;
  if (maxLength <= ellipsis.length) return characters.slice(0, maxLength).join('');
  return characters.slice(0, maxLength - ellipsis.length).join('') + ellipsis;
}

export function padEnd(value: string, length: number, filler = ' '): string {
  const characters = [...value];
  if (characters.length >= length) return value;
  return value + filler.repeat(length - characters.length);
}

export function padStart(value: string, length: number, filler = ' '): string {
  const characters = [...value];
  if (characters.length >= length) return value;
  return filler.repeat(length - characters.length) + value;
}

export function visualLength(value: string): number {
  return [...value].length;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return Math.abs(count) === 1 ? singular : plural;
}
