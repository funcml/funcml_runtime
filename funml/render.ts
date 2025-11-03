import type { Props, VElement, VNode } from "./types";

function normalizeAttributeName(name: string): string {
  if (name === "className") return "class";
  if (name === "htmlFor") return "for";
  return name;
}

function applyProps(element: HTMLElement, props: Props): void {
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;

    if (key.startsWith("on") && typeof value === "function") {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value as EventListener);
      continue;
    }

    const attrName = normalizeAttributeName(key);

    if (value === true) {
      element.setAttribute(attrName, "");
      continue;
    }

    element.setAttribute(attrName, String(value));
  }
}

function toNode(vnode: VNode): Node | null {
  if (vnode == null || vnode === false) return null;

  if (Array.isArray(vnode)) {
    const fragment = document.createDocumentFragment();
    for (const child of vnode) {
      const node = toNode(child);
      if (node) fragment.appendChild(node);
    }
    return fragment;
  }

  if (typeof vnode === "string" || typeof vnode === "number") {
    return document.createTextNode(String(vnode));
  }

  if (typeof vnode === "boolean") {
    return document.createTextNode(String(vnode));
  }

  const element = document.createElement((vnode as VElement).tag);
  applyProps(element, (vnode as VElement).props);

  for (const child of (vnode as VElement).children) {
    const node = toNode(child);
    if (node) element.appendChild(node);
  }

  return element;
}

export function render(vnode: VNode): Node {
  const node = toNode(vnode);
  return node ?? document.createDocumentFragment();
}

export function mount(vnode: VNode, container: HTMLElement): Node {
  const node = render(vnode);
  container.appendChild(node);
  return node;
}
