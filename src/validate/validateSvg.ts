const TAG_PATTERN = /<(\/?)([a-zA-Z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g;
const ATTRIBUTE_PATTERN = /([\w:.-]+)\s*=\s*"([^"]*)"/g;
const SECRET_PATTERNS = [/gh[pousr]_[A-Za-z0-9]{16,}/, /github_pat_[A-Za-z0-9_]{20,}/];
const FORBIDDEN_SUBSTRINGS = ['NaN', 'undefined', 'javascript:', '<script', 'onload=', 'onclick='];

export interface ValidationInput {
  svg: string;
  label: string;
  secrets?: string[];
}

export interface TextBox {
  x: number;
  length: number;
}

export class SvgValidationError extends Error {
  constructor(label: string, problems: string[]) {
    super(`${label} failed validation:\n  - ${problems.join('\n  - ')}`);
    this.name = 'SvgValidationError';
  }
}

export function checkWellFormed(svg: string): string[] {
  const problems: string[] = [];
  const body = svg.replace(/^<\?xml[^>]*\?>\s*/, '');
  const stack: string[] = [];
  let consumed = 0;
  for (const match of body.matchAll(TAG_PATTERN)) {
    const [raw, closing, name, , selfClosing] = match;
    if (match.index > consumed) {
      const between = body.slice(consumed, match.index);
      if (between.includes('<') || between.includes('>')) {
        problems.push(`Unescaped angle bracket in text near index ${String(consumed)}.`);
      }
    }
    consumed = match.index + raw.length;
    if (!name) continue;
    if (closing === '/') {
      const open = stack.pop();
      if (open !== name) {
        problems.push(`Closing tag </${name}> does not match <${open ?? 'nothing'}>.`);
      }
    } else if (selfClosing !== '/') {
      stack.push(name);
    }
  }
  const trailing = body.slice(consumed);
  if (trailing.includes('<') || trailing.includes('>')) {
    problems.push('Unparsed markup remains at the end of the document.');
  }
  if (stack.length > 0) {
    problems.push(`Unclosed elements: ${stack.join(', ')}.`);
  }
  return problems;
}

export function parseRootBox(svg: string): { width: number; height: number } | null {
  const root = /<svg\b([^>]*)>/.exec(svg);
  if (!root?.[1]) return null;
  const attributes = new Map<string, string>();
  for (const match of root[1].matchAll(ATTRIBUTE_PATTERN)) {
    if (match[1] && match[2] !== undefined) attributes.set(match[1], match[2]);
  }
  const width = Number(attributes.get('width'));
  const height = Number(attributes.get('height'));
  const viewBox = (attributes.get('viewBox') ?? '').split(/\s+/).map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (viewBox.length !== 4 || viewBox[2] !== width || viewBox[3] !== height) return null;
  return { width, height };
}

export function collectTextBoxes(svg: string): TextBox[] {
  const boxes: TextBox[] = [];
  for (const match of svg.matchAll(/<text\b([^>]*)>/g)) {
    const attributes = new Map<string, string>();
    for (const attribute of (match[1] ?? '').matchAll(ATTRIBUTE_PATTERN)) {
      if (attribute[1] && attribute[2] !== undefined) attributes.set(attribute[1], attribute[2]);
    }
    const x = Number(attributes.get('x') ?? NaN);
    const length = Number(attributes.get('textLength') ?? NaN);
    if (Number.isFinite(x) && Number.isFinite(length)) boxes.push({ x, length });
  }
  return boxes;
}

export function validateSvg(input: ValidationInput): void {
  const problems: string[] = [...checkWellFormed(input.svg)];

  for (const needle of FORBIDDEN_SUBSTRINGS) {
    if (input.svg.includes(needle)) {
      problems.push(`Output contains the forbidden value "${needle}".`);
    }
  }
  if (/>\s*null\s*</.test(input.svg) || /="null"/.test(input.svg)) {
    problems.push('Output contains a literal "null" value.');
  }
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(input.svg)) problems.push('Output looks like it contains an access token.');
  }
  for (const secret of input.secrets ?? []) {
    if (secret.length > 8 && input.svg.includes(secret)) {
      problems.push('Output contains the configured GitHub token.');
    }
  }

  const box = parseRootBox(input.svg);
  if (!box) {
    problems.push('The root <svg> element is missing a consistent width/height/viewBox.');
  } else {
    if (box.width <= 0 || box.height <= 0)
      problems.push('The root canvas has a non-positive size.');
    for (const text of collectTextBoxes(input.svg)) {
      if (text.x < 0) problems.push(`A text run starts left of the canvas at x=${String(text.x)}.`);
      if (text.x + text.length > box.width + 0.5) {
        problems.push(
          `A text run overflows the canvas: x=${String(text.x)} length=${String(text.length)} width=${String(box.width)}.`,
        );
      }
    }
  }

  if (problems.length > 0) {
    throw new SvgValidationError(input.label, [...new Set(problems)]);
  }
}
