const TEXT_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

const ATTRIBUTE_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function stripControlCharacters(value: string): string {
  return value.replace(CONTROL_CHARACTERS, '');
}

export function escapeXmlText(value: string): string {
  return stripControlCharacters(value).replace(/[&<>]/g, (character) => {
    const replacement = TEXT_ESCAPES[character];
    return replacement ?? character;
  });
}

export function escapeXmlAttribute(value: string): string {
  return stripControlCharacters(value).replace(/[&<>"']/g, (character) => {
    const replacement = ATTRIBUTE_ESCAPES[character];
    return replacement ?? character;
  });
}
