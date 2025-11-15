import type { Props, VChild, VElement } from "./types";

type PropInput = Record<string, unknown>;

function isPropsObject(value: unknown): value is PropInput {
  if (value == null) return false;
  if (typeof value !== "object") return false;
  if (Array.isArray(value)) return false;

  const candidate = value as Record<string, unknown>;
  if ("tag" in candidate || "tagName" in candidate) return false;
  return true;
}

function normalizeChildren(children: readonly VChild[]): VChild[] {
  const result: VChild[] = [];

  const push = (child: VChild | undefined | null) => {
    if (child == null) return;
    if (Array.isArray(child)) {
      for (const nested of child) push(nested);
      return;
    }
    result.push(child);
  };

  for (const child of children) {
    push(child);
  }

  return result;
}

export function f(
  tag: string,
  propsOrFirstChild?: PropInput | VChild,
  ...restChildren: VChild[]
): VElement {
  let resolvedProps: Props = {} as Props;
  let children: VChild[] = restChildren;

  if (isPropsObject(propsOrFirstChild)) {
    resolvedProps = { ...propsOrFirstChild } as Props;
  } else if (propsOrFirstChild !== undefined && propsOrFirstChild !== null) {
    children = [propsOrFirstChild as VChild, ...restChildren];
  }

  return {
    tag,
    props: resolvedProps,
    children: normalizeChildren(children),
  };
}

export type { VElement };

