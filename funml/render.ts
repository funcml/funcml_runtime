import { effect } from "./signal";
import type { Accessor, ChildValue, Props, VChild, VElement, VNode } from "./types";

const nodeDisposers = new WeakMap<Node, Array<() => void>>();

function recordDisposer(node: Node, disposer: () => void): void {
  if (!nodeDisposers.has(node)) nodeDisposers.set(node, []);
  nodeDisposers.get(node)!.push(disposer);
}

function runDisposers(node: Node): void {
  const disposers = nodeDisposers.get(node);
  if (!disposers) return;
  nodeDisposers.delete(node);
  for (const dispose of disposers) {
    try {
      dispose();
    } catch (error) {
      console.error(error);
    }
  }
}

function cleanupSubtree(node: Node): void {
  runDisposers(node);

  if (node.hasChildNodes()) {
    for (const child of Array.from(node.childNodes)) {
      cleanupSubtree(child);
    }
  }
}

function normalizeAttributeName(name: string): string {
  if (name === "className") return "class";
  if (name === "htmlFor") return "for";
  return name;
}

function setAttribute(element: HTMLElement, name: string, value: unknown): void {
  if (value == null || value === false) {
    element.removeAttribute(name);
    return;
  }

  if (value === true) {
    element.setAttribute(name, "");
    return;
  }

  element.setAttribute(name, String(value));
}

function applyProps(element: HTMLElement, props: Props): void {
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("on") && typeof value === "function") {
      const eventName = key.slice(2).toLowerCase();
      const listener = value as EventListener;
      element.addEventListener(eventName, listener);
      recordDisposer(element, () => element.removeEventListener(eventName, listener));
      continue;
    }

    const attrName = normalizeAttributeName(key);

    if (typeof value === "function") {
      const accessor = value as Accessor<unknown>;
      const stop = effect(() => {
        setAttribute(element, attrName, accessor());
      });
      recordDisposer(element, stop);
      continue;
    }

    setAttribute(element, attrName, value);
  }
}

function isVElement(value: unknown): value is VElement {
  return Boolean(value) && typeof value === "object" && "tag" in (value as Record<string, unknown>);
}

function createElementNode(vnode: VElement): HTMLElement {
  const element = document.createElement(vnode.tag);
  applyProps(element, vnode.props);
  appendChildren(element, vnode.children);
  return element;
}

function toNodes(value: ChildValue): Node[] {
  const result: Node[] = [];

  const pushValue = (child: ChildValue | undefined | null) => {
    if (child == null || child === false) return;

    if (Array.isArray(child)) {
      for (const nested of child) pushValue(nested);
      return;
    }

    if (isVElement(child)) {
      result.push(createElementNode(child));
      return;
    }

    if (typeof child === "string" || typeof child === "number") {
      result.push(document.createTextNode(String(child)));
      return;
    }

    if (typeof child === "boolean") {
      result.push(document.createTextNode(String(child)));
      return;
    }
  };

  pushValue(value);
  return result;
}

function removeNodes(nodes: Node[]): void {
  for (const node of nodes) {
    cleanupSubtree(node);
    const parent = node.parentNode;
    if (parent) parent.removeChild(node);
  }
}

function mountReactiveChild(parent: Node, accessor: Accessor<ChildValue>): void {
  const marker = document.createComment("funml:dynamic");
  parent.appendChild(marker);
  let currentNodes: Node[] = [];

  const stop = effect(() => {
    const anchorParent = marker.parentNode;
    if (!anchorParent) return;

    const nextNodes = toNodes(accessor());
    for (const node of nextNodes) {
      anchorParent.insertBefore(node, marker);
    }
    removeNodes(currentNodes);
    currentNodes = nextNodes;
  });

  recordDisposer(marker, () => {
    stop();
    removeNodes(currentNodes);
    const anchorParent = marker.parentNode;
    if (anchorParent) {
      anchorParent.removeChild(marker);
    }
  });
}

function appendChild(parent: Node, child: VChild): void {
  if (child == null || child === false) return;

  if (Array.isArray(child)) {
    for (const nested of child) appendChild(parent, nested);
    return;
  }

  if (typeof child === "function") {
    mountReactiveChild(parent, child as Accessor<ChildValue>);
    return;
  }

  if (isVElement(child)) {
    parent.appendChild(createElementNode(child));
    return;
  }

  if (typeof child === "string" || typeof child === "number") {
    parent.appendChild(document.createTextNode(String(child)));
    return;
  }

  if (typeof child === "boolean") {
    parent.appendChild(document.createTextNode(String(child)));
    return;
  }
}

function appendChildren(parent: Node, children: readonly VChild[]): void {
  for (const child of children) appendChild(parent, child);
}

export function render(vnode: VNode): Node {
  const fragment = document.createDocumentFragment();
  appendChild(fragment, vnode);

  if (fragment.childNodes.length === 1) {
    const first = fragment.firstChild as Node;
    if (first.nodeType !== Node.COMMENT_NODE) {
      fragment.removeChild(first);
      return first;
    }
  }

  return fragment;
}

export function mount(vnode: VNode, container: HTMLElement): Node {
  const fragment = document.createDocumentFragment();
  appendChild(fragment, vnode);
  const inserted = Array.from(fragment.childNodes);
  container.appendChild(fragment);
  return inserted[0] ?? container;
}

export function clear(container: HTMLElement): void {
  for (const child of Array.from(container.childNodes)) {
    cleanupSubtree(child);
    container.removeChild(child);
  }
}

export function unmount(node: Node): void {
  cleanupSubtree(node);
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}
