import { describe, expect, it } from 'vitest';
import { checkWellFormed, parseRootBox, validateSvg } from '../src/validate/validateSvg.ts';
import { serializeDocument, serializeElement } from '../src/svg/serialize.ts';
import { h } from '../src/svg/jsx.ts';
import { resolveToken } from '../src/github/client.ts';
import { ConfigError, resolveConfig } from '../src/config/resolve.ts';
import profileConfig from '../profile.config.ts';

describe('checkWellFormed', () => {
  it('accepts a balanced document', () => {
    expect(checkWellFormed('<svg><g><rect/></g></svg>')).toEqual([]);
  });

  it('reports mismatched and unclosed tags', () => {
    expect(checkWellFormed('<svg><g></rect></svg>').length).toBeGreaterThan(0);
    expect(checkWellFormed('<svg><g></svg>').length).toBeGreaterThan(0);
  });

  it('reports raw angle brackets left in text content', () => {
    expect(checkWellFormed('<svg><text>a < b</text></svg>').length).toBeGreaterThan(0);
  });
});

describe('validateSvg', () => {
  const valid =
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50" viewBox="0 0 100 50">' +
    '<text x="10" y="20" textLength="40">hello</text></svg>';

  it('accepts a well formed document', () => {
    expect(() => validateSvg({ svg: valid, label: 'ok' })).not.toThrow();
  });

  it('rejects a viewBox that disagrees with the declared size', () => {
    const mismatched = valid.replace('viewBox="0 0 100 50"', 'viewBox="0 0 80 50"');
    expect(() => validateSvg({ svg: mismatched, label: 'bad' })).toThrow(/viewBox/);
  });

  it('rejects text that runs past the right edge', () => {
    const overflowing = valid.replace('textLength="40"', 'textLength="400"');
    expect(() => validateSvg({ svg: overflowing, label: 'bad' })).toThrow(/overflows/);
  });

  it('rejects NaN, undefined and null leaking into the output', () => {
    expect(() => validateSvg({ svg: valid.replace('x="10"', 'x="NaN"'), label: 'bad' })).toThrow(
      /NaN/,
    );
    expect(() =>
      validateSvg({ svg: valid.replace('>hello<', '>undefined<'), label: 'bad' }),
    ).toThrow(/undefined/);
    expect(() => validateSvg({ svg: valid.replace('>hello<', '> null <'), label: 'bad' })).toThrow(
      /null/,
    );
  });

  it('rejects embedded scripting', () => {
    const scripted = valid.replace('</svg>', '<script>alert(1)</script></svg>');
    expect(() => validateSvg({ svg: scripted, label: 'bad' })).toThrow();
  });

  it('rejects a document that embeds the caller-supplied secret', () => {
    expect(() =>
      validateSvg({
        svg: valid.replace('hello', 'sup3r-s3cret-value'),
        label: 'bad',
        secrets: ['sup3r-s3cret-value'],
      }),
    ).toThrow(/token/);
  });

  it('parses width, height and viewBox from the root element', () => {
    expect(parseRootBox(valid)).toEqual({ width: 100, height: 50 });
    expect(parseRootBox('<div></div>')).toBeNull();
  });
});

describe('serializer', () => {
  it('escapes attributes and text rather than trusting them', () => {
    const node = h('text', { 'data-label': 'a"b<c' }, 'x<y&z');
    expect(serializeElement(node)).toBe('<text data-label="a&quot;b&lt;c">x&lt;y&amp;z</text>');
  });

  it('omits null, undefined and false attributes', () => {
    expect(serializeElement(h('rect', { x: 1, y: null, width: undefined, hidden: false }))).toBe(
      '<rect x="1"/>',
    );
  });

  it('refuses to serialize a non-finite number', () => {
    expect(() => serializeElement(h('rect', { x: Number.NaN }))).toThrow();
    expect(() => serializeElement(h('rect', { x: Number.POSITIVE_INFINITY }))).toThrow();
  });

  it('refuses to serialize an object as an attribute value', () => {
    expect(() => serializeElement(h('rect', { x: { nested: true } }))).toThrow();
  });

  it('rounds coordinates so identical layouts serialize identically', () => {
    expect(serializeElement(h('rect', { x: 1.0000001 }))).toBe('<rect x="1"/>');
    expect(serializeElement(h('rect', { x: -0 }))).toBe('<rect x="0"/>');
  });

  it('emits an XML declaration for a full document', () => {
    expect(serializeDocument(h('svg', null))).toMatch(
      /^<\?xml version="1\.0" encoding="UTF-8"\?>\n/,
    );
  });
});

describe('resolveToken', () => {
  it('prefers the personal access token over the Actions token', () => {
    expect(resolveToken({ PROFILE_GITHUB_TOKEN: 'a', GITHUB_TOKEN: 'b' })).toEqual({
      token: 'a',
      source: 'PROFILE_GITHUB_TOKEN',
    });
  });

  it('falls back to the Actions token', () => {
    expect(resolveToken({ GITHUB_TOKEN: 'b' })).toEqual({
      token: 'b',
      source: 'GITHUB_TOKEN',
    });
  });

  it('treats blank values as absent', () => {
    expect(resolveToken({ PROFILE_GITHUB_TOKEN: '   ', GITHUB_TOKEN: '' })).toEqual({
      token: null,
      source: 'none',
    });
  });
});

describe('resolveConfig', () => {
  it('accepts the shipped configuration', () => {
    expect(() => resolveConfig(profileConfig)).not.toThrow();
  });

  it('rejects an invalid GitHub login', () => {
    expect(() => resolveConfig({ ...profileConfig, githubUsername: 'not a login!' })).toThrow(
      ConfigError,
    );
  });

  it('rejects a malformed codingSince date', () => {
    expect(() =>
      resolveConfig({
        ...profileConfig,
        personal: { ...profileConfig.personal, codingSince: 'January 2022' },
      }),
    ).toThrow(ConfigError);
  });

  it('rejects a palette entry that is not a hex colour', () => {
    expect(() =>
      resolveConfig({
        ...profileConfig,
        theme: {
          ...profileConfig.theme,
          dark: { ...profileConfig.theme.dark, accent: 'rebeccapurple' },
        },
      }),
    ).toThrow(ConfigError);
  });

  it('clamps avatar settings into a usable range', () => {
    const resolved = resolveConfig({
      ...profileConfig,
      avatar: { ...profileConfig.avatar, width: 500, contrast: 99, trimBorder: 0.9 },
    });
    expect(resolved.avatar.width).toBe(80);
    expect(resolved.avatar.contrast).toBe(4);
    expect(resolved.avatar.trimBorder).toBe(0.45);
  });
});
