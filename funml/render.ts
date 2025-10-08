import { VNode } from "./types";

export function render(vnode: VNode): Node {
  if (typeof vnode === "string" || typeof vnode === "number") {
    return document.createTextNode(String(vnode));
  }
  if (vnode == null) return document.createComment("");
  if (Array.isArray(vnode)) {
    throw new Error("Arrays must be flattened");
  }

  const el = document.createElement(vnode.tag);

  // Handle props (including events)
  for (const [key, value] of Object.entries(vnode.props)) {
    if (key.startsWith("on") && typeof value === "function") {
      const eventName = key.slice(2).toLowerCase();
      el.addEventListener(eventName, value as EventListener);
    } else {
      el.setAttribute(key, String(value));
    }
  }

  // Append children
  for (const child of vnode.children) {
    el.appendChild(render(child));
  }

  return el;
}
