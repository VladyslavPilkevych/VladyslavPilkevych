export type AttributeValue = string | number | boolean | null | undefined;

export interface SvgAttributes {
  [attribute: string]: AttributeValue;
}

export interface SvgElement {
  tag: string;
  props: SvgAttributes;
  children: SvgChild[];
}

export type SvgChild = SvgElement | string | number | false | null | undefined | SvgChild[];

export const FRAGMENT_TAG = '#fragment';

export type Component<P extends object = object> = (props: P) => SvgElement;

export type IntrinsicProps = { children?: SvgChild } & Record<string, AttributeValue | SvgChild>;

export function Fragment(props: { children?: SvgChild }): SvgElement {
  return { tag: FRAGMENT_TAG, props: {}, children: [props.children ?? null] };
}

export function h(
  type: string | Component<never>,
  props: Record<string, unknown> | null,
  ...children: SvgChild[]
): SvgElement {
  if (typeof type === 'function') {
    const componentProps = { ...(props ?? {}), children } as never;
    return type(componentProps);
  }
  const attributes: SvgAttributes = {};
  for (const [key, value] of Object.entries(props ?? {})) {
    if (key === 'children') continue;
    attributes[key] = value as AttributeValue;
  }
  const nested = (props?.children ?? null) as SvgChild;
  return {
    tag: type,
    props: attributes,
    children: children.length > 0 ? children : [nested],
  };
}

declare global {
  namespace JSX {
    type Element = SvgElement;
    interface ElementChildrenAttribute {
      children: Record<string, never>;
    }
    interface IntrinsicElements {
      [tag: string]: IntrinsicProps;
    }
  }
}
