import { effect } from "./signal";
import type { Accessor, ChildValue, Props, VChild, VElement, VNode } from "./types";

type Key = string | number | null;

interface TextInstance {
  readonly kind: "text";
  node: Text;
  value: string;
}

interface ElementInstance {
  readonly kind: "element";
  node: HTMLElement;
  vnode: VElement;
  props: Props;
  key: Key;
  children: VNodeInstance[];
}

interface DynamicInstance {
  readonly kind: "dynamic";
  marker: Comment;
  dispose: () => void;
}

type VNodeInstance = TextInstance | ElementInstance | DynamicInstance;

interface RootInstance {
  container: HTMLElement;
  instance: VNodeInstance | null;
  vnode: VNode | null;
}

type NodeMeta = {
  attrs?: Map<string, unknown>;
  accessors?: Map<string, () => void>;
  events?: Map<string, EventListener>;
};

const nodeDisposers = new WeakMap<Node, Array<() => void>>();
const nodeMeta = new WeakMap<HTMLElement, NodeMeta>();
const roots = new WeakMap<HTMLElement, RootInstance>();

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

function cleanupElementMeta(element: HTMLElement): void {
  const meta = nodeMeta.get(element);
  if (!meta) return;

  if (meta.events) {
    for (const [key, listener] of meta.events) {
      const eventName = key.slice(2).toLowerCase();
      element.removeEventListener(eventName, listener);
    }
    meta.events.clear();
  }

  if (meta.accessors) {
    for (const dispose of meta.accessors.values()) {
      try {
        dispose();
      } catch (error) {
        console.error(error);
      }
    }
    meta.accessors.clear();
  }

  meta.attrs?.clear();
  nodeMeta.delete(element);
}

function cleanupSubtree(node: Node): void {
  if (node instanceof HTMLElement) {
    cleanupElementMeta(node);
  }
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

function getNodeMeta(element: HTMLElement): NodeMeta {
  let meta = nodeMeta.get(element);
  if (!meta) {
    meta = {};
    nodeMeta.set(element, meta);
  }
  return meta;
}

function setAttributeValue(element: HTMLElement, key: string, value: unknown): void {
  const attrName = normalizeAttributeName(key);

  if (value == null || value === false) {
    element.removeAttribute(attrName);
    return;
  }

  if (value === true) {
    element.setAttribute(attrName, "");
    return;
  }

  element.setAttribute(attrName, String(value));
}

function removeProp(element: HTMLElement, key: string): void {
  if (key === "key") return;
  const meta = nodeMeta.get(element);
  if (!meta) return;

  const attrName = normalizeAttributeName(key);

  if (key.startsWith("on")) {
    const listener = meta.events?.get(key);
    if (listener) {
      element.removeEventListener(key.slice(2).toLowerCase(), listener);
      meta.events!.delete(key);
    }
    return;
  }

  if (meta.accessors?.has(key)) {
    const dispose = meta.accessors.get(key)!;
    try {
      dispose();
    } catch (error) {
      console.error(error);
    }
    meta.accessors.delete(key);
    element.removeAttribute(attrName);
    return;
  }

  if (meta.attrs?.has(key)) {
    element.removeAttribute(attrName);
    meta.attrs.delete(key);
  }
}

function setProp(element: HTMLElement, key: string, value: unknown): void {
  if (key === "key") return;
  const meta = getNodeMeta(element);
  const attrName = normalizeAttributeName(key);

  if (key.startsWith("on") && typeof value === "function") {
    const listener = value as EventListener;
    const existing = meta.events?.get(key);
    if (existing === listener) return;
    if (existing) {
      element.removeEventListener(key.slice(2).toLowerCase(), existing);
    }
    element.addEventListener(key.slice(2).toLowerCase(), listener);
    (meta.events ??= new Map()).set(key, listener);
    return;
  }

  if (typeof value === "function") {
    const accessor = value as Accessor<unknown>;
    if (meta.accessors?.has(key)) {
      const dispose = meta.accessors.get(key)!;
      dispose();
      meta.accessors.delete(key);
    }
    const stop = effect(() => {
      setAttributeValue(element, key, accessor());
    });
    const disposer = () => {
      try {
        stop();
      } finally {
        element.removeAttribute(attrName);
      }
    };
    (meta.accessors ??= new Map()).set(key, disposer);
    recordDisposer(element, disposer);
    return;
  }

  if (meta.accessors?.has(key)) {
    const dispose = meta.accessors.get(key)!;
    dispose();
    meta.accessors.delete(key);
  }

  setAttributeValue(element, key, value);
  (meta.attrs ??= new Map()).set(key, value);
}

function applyInitialProps(element: HTMLElement, props: Props): void {
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    setProp(element, key, value);
  }
}

function patchProps(instance: ElementInstance, nextProps: Props): void {
  const prevProps = instance.props as Record<string, unknown>;
  const next = nextProps as Record<string, unknown>;
  const element = instance.node;

  for (const key of Object.keys(prevProps)) {
    if (key === "key") continue;
    if (!(key in next)) {
      removeProp(element, key);
    }
  }

  for (const [key, value] of Object.entries(next)) {
    const previous = prevProps[key];
    if (key === "key" || previous === value) continue;
    setProp(element, key, value);
  }

  instance.props = nextProps;
}

function isVElement(value: unknown): value is VElement {
  return Boolean(value) && typeof value === "object" && "tag" in (value as Record<string, unknown>);
}

function getKeyFromProps(props: Props): Key {
  const record = props as Record<string, unknown>;
  const key = record.key;
  if (key == null) return null;
  if (typeof key === "string" || typeof key === "number") return key;
  return String(key);
}

function createTextInstance(value: string, parent: Node, anchor: Node | null): TextInstance {
  const node = document.createTextNode(value);
  if (anchor) parent.insertBefore(node, anchor);
  else parent.appendChild(node);
  return { kind: "text", node, value };
}

function createDynamicInstance(
  accessor: Accessor<ChildValue>,
  parent: Node,
  anchor: Node | null,
): DynamicInstance {
  const marker = document.createComment("funml:dynamic");
  if (anchor) parent.insertBefore(marker, anchor);
  else parent.appendChild(marker);
  let currentNodes: Node[] = [];

  const stop = effect(() => {
    const host = marker.parentNode;
    if (!host) return;
    const nextNodes = toNodes(accessor());
    for (const node of nextNodes) {
      host.insertBefore(node, marker);
    }
    removeNodes(currentNodes);
    currentNodes = nextNodes;
  });

  const dispose = () => {
    stop();
    removeNodes(currentNodes);
    currentNodes = [];
    if (marker.parentNode) {
      marker.parentNode.removeChild(marker);
    }
  };

  recordDisposer(marker, dispose);

  return { kind: "dynamic", marker, dispose };
}

function createElementInstance(
  vnode: VElement,
  parent: Node,
  anchor: Node | null,
): ElementInstance {
  const element = document.createElement(vnode.tag);
  if (anchor) parent.insertBefore(element, anchor);
  else parent.appendChild(element);

  applyInitialProps(element, vnode.props);

  const childInstances: VNodeInstance[] = [];
  for (const child of vnode.children) {
    const instance = createInstance(child, element, null);
    if (instance) childInstances.push(instance);
  }

  return {
    kind: "element",
    node: element,
    vnode,
    props: vnode.props,
    key: getKeyFromProps(vnode.props),
    children: childInstances,
  };
}

function createInstance(vnode: VChild, parent: Node, anchor: Node | null): VNodeInstance | null {
  if (vnode == null || vnode === false) return null;

  if (typeof vnode === "function") {
    return createDynamicInstance(vnode as Accessor<ChildValue>, parent, anchor);
  }

  if (typeof vnode === "string" || typeof vnode === "number" || typeof vnode === "boolean") {
    return createTextInstance(String(vnode), parent, anchor);
  }

  if (isVElement(vnode)) {
    return createElementInstance(vnode, parent, anchor);
  }

  return null;
}

function getDomNode(instance: VNodeInstance): Node {
  if (instance.kind === "element") return instance.node;
  if (instance.kind === "text") return instance.node;
  return instance.marker;
}

function removeInstance(instance: VNodeInstance | null | undefined): void {
  if (!instance) return;

  if (instance.kind === "element") {
    cleanupElementMeta(instance.node);
    cleanupSubtree(instance.node);
    if (instance.node.parentNode) instance.node.parentNode.removeChild(instance.node);
    return;
  }

  if (instance.kind === "text") {
    cleanupSubtree(instance.node);
    if (instance.node.parentNode) instance.node.parentNode.removeChild(instance.node);
    return;
  }

  instance.dispose();
}

function patchText(instance: TextInstance, nextValue: string): TextInstance {
  if (instance.value !== nextValue) {
    instance.node.data = nextValue;
    instance.value = nextValue;
  }
  return instance;
}

function patchChildren(instance: ElementInstance, nextChildren: readonly VChild[]): void {
  const parent = instance.node;
  const oldChildren = instance.children;
  const newChildren: VNodeInstance[] = [];
  const length = Math.max(oldChildren.length, nextChildren.length);

  for (let i = 0; i < length; i++) {
    const oldChild = oldChildren[i];
    const nextChild = nextChildren[i];

    if (nextChild === undefined) {
      removeInstance(oldChild);
      continue;
    }

    const anchor = oldChild ? getDomNode(oldChild) : null;
    const updated = patchNode(parent, oldChild ?? null, nextChild, anchor);
    if (updated) {
      newChildren.push(updated);
    }
  }

  instance.children = newChildren;
}

function patchElement(instance: ElementInstance, vnode: VElement): ElementInstance {
  patchProps(instance, vnode.props);
  patchChildren(instance, vnode.children);
  instance.vnode = vnode;
  instance.key = getKeyFromProps(vnode.props);
  return instance;
}

function canPatchElement(instance: ElementInstance, vnode: VElement): boolean {
  if (instance.node.tagName.toLowerCase() !== vnode.tag.toLowerCase()) return false;
  const nextKey = getKeyFromProps(vnode.props);
  return instance.key === nextKey;
}

function patchNode(
  parent: Node,
  oldInstance: VNodeInstance | null,
  nextVNode: VChild,
  anchor: Node | null,
): VNodeInstance | null {
  if (nextVNode == null || nextVNode === false) {
    removeInstance(oldInstance);
    return null;
  }

  if (!oldInstance) {
    return createInstance(nextVNode, parent, anchor);
  }

  if (oldInstance.kind === "text" &&
      (typeof nextVNode === "string" || typeof nextVNode === "number" || typeof nextVNode === "boolean")) {
    return patchText(oldInstance, String(nextVNode));
  }

  if (oldInstance.kind === "element" && isVElement(nextVNode) && canPatchElement(oldInstance, nextVNode)) {
    return patchElement(oldInstance, nextVNode);
  }

  // Replace
  const referenceNode = getDomNode(oldInstance);
  const newInstance = createInstance(nextVNode, parent, referenceNode);
  removeInstance(oldInstance);
  return newInstance;
}

function createStandaloneElement(vnode: VElement): HTMLElement {
  const element = document.createElement(vnode.tag);
  applyInitialProps(element, vnode.props);
  for (const child of vnode.children) {
    createInstance(child, element, null);
  }
  return element;
}

function toNodes(value: ChildValue): Node[] {
  const nodes: Node[] = [];

  const push = (child: ChildValue | null | undefined) => {
    if (child == null || child === false) return;

    if (Array.isArray(child)) {
      for (const nested of child) push(nested);
      return;
    }

    if (isVElement(child)) {
      nodes.push(createStandaloneElement(child));
      return;
    }

    nodes.push(document.createTextNode(String(child)));
  };

  push(value);
  return nodes;
}

function removeNodes(nodes: Node[]): void {
  for (const node of nodes) {
    cleanupSubtree(node);
    if (node.parentNode) node.parentNode.removeChild(node);
  }
}

export function renderTo(container: HTMLElement, vnode: VNode): RootInstance {
  const existing = roots.get(container);
  if (!existing) {
    clear(container);
    const instance = createInstance(vnode, container, null);
    const root: RootInstance = { container, instance: instance ?? null, vnode };
    roots.set(container, root);
    return root;
  }

  const patched = patchNode(container, existing.instance, vnode, null);
  if (!patched) {
    clear(container);
  }
  existing.instance = patched;
  existing.vnode = vnode;
  return existing;
}

export function updateRoot(root: RootInstance, vnode: VNode): RootInstance {
  const patched = patchNode(root.container, root.instance, vnode, null);
  if (!patched) {
    clear(root.container);
  }
  root.instance = patched;
  root.vnode = vnode;
  return root;
}

export function render(vnode: VNode): Node {
  const fragment = document.createDocumentFragment();
  const instance = createInstance(vnode, fragment, null);

  if (!instance) return fragment;

  const node = getDomNode(instance);
  if (fragment.childNodes.length === 1 && node.parentNode === fragment) {
    fragment.removeChild(node);
    return node;
  }

  return fragment;
}

export function mount(vnode: VNode, container: HTMLElement): Node {
  const root = renderTo(container, vnode);
  return root.instance ? getDomNode(root.instance) : container;
}

export function clear(container: HTMLElement): void {
  const root = roots.get(container);
  if (root && root.instance) {
    removeInstance(root.instance);
    root.instance = null;
    root.vnode = null;
  }
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

