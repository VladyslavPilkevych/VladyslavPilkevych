import { escapeXmlAttribute, escapeXmlText } from '../utils/xml.ts';
import { FRAGMENT_TAG, type SvgChild, type SvgElement } from './jsx.ts';

const NUMBER_PRECISION = 3;

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`Refusing to serialize non-finite number: ${String(value)}`);
  }
  const rounded = Number(value.toFixed(NUMBER_PRECISION));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function serializeAttributes(element: SvgElement): string {
  const parts: string[] = [];
  for (const [name, value] of Object.entries(element.props)) {
    if (value === null || value === undefined || value === false) continue;
    if (typeof value === 'object') {
      throw new Error(`Attribute "${name}" received a non-primitive value.`);
    }
    const serialized = typeof value === 'number' ? formatNumber(value) : String(value);
    parts.push(`${name}="${escapeXmlAttribute(serialized)}"`);
  }
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

function serializeChild(child: SvgChild, output: string[]): void {
  if (child === null || child === undefined || child === false) return;
  if (Array.isArray(child)) {
    for (const item of child) serializeChild(item, output);
    return;
  }
  if (typeof child === 'string') {
    output.push(escapeXmlText(child));
    return;
  }
  if (typeof child === 'number') {
    output.push(escapeXmlText(formatNumber(child)));
    return;
  }
  output.push(serializeElement(child));
}

export function serializeElement(element: SvgElement): string {
  const children: string[] = [];
  for (const child of element.children) serializeChild(child, children);
  const body = children.join('');
  if (element.tag === FRAGMENT_TAG) return body;
  const attributes = serializeAttributes(element);
  if (body.length === 0) return `<${element.tag}${attributes}/>`;
  return `<${element.tag}${attributes}>${body}</${element.tag}>`;
}

export function serializeDocument(root: SvgElement): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serializeElement(root)}\n`;
}
