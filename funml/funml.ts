type Child = string | number | HTMLElement | Child[] | (() => Child);

export function fml(
  tagName: string,
  attr: Record<string, string>,
  children: Child[] = [],
): HTMLElement {
  const el = document.createElement(tagName);

  for (const [key, value] of Object.entries(attr)) {
    el.setAttribute(key, String(value));
  }

  const appendChild = (child: Child) => {
    if (typeof child === "function") {
      appendChild(child());
      return;
    }

    if (Array.isArray(child)) {
      child.forEach(appendChild);
      return;
    }

    el.append(child as HTMLElement);
  };

  children.forEach(appendChild);
  return el;
}
