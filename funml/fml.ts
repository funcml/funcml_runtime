import { VElement, VNode } from "./types";

export function fml(
  tag: string,
  props: Record<string, unknown> = {},
  ...children: VNode[]
): VElement {
  return {
    tag,
    props: { ...props }, // immutable copy
    children: flattenChildren(children),
  };
}

function flattenChildren(nodes: VNode[]): VNode[] {
  const result: VNode[] = [];
  for (const node of nodes) {
    if (Array.isArray(node)) {
      result.push(...flattenChildren(node));
    } else if (node != null) {
      result.push(node);
    }
  }
  return result;
}
