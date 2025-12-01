import { effect } from "./signal";

type Props = { [key: string]: any };
type Child = Node | Node[] | Function | string | number | null | undefined;

export function f(
  tagName: string,
  propsOrFirstChild?: Props | Child,
  ...children: Child[]
) {
  function appendChildren(
    parent: DocumentFragment | HTMLElement,
    children: Child[],
  ) {
    for (const child of children) {
      if (child == null) continue;

      if (typeof child === "string" || typeof child === "number") {
        parent.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        parent.appendChild(child);
      } else if (typeof child === "function") {
        // Nested reactive function - use same comment placeholder approach
        const placeholder = document.createComment("nested-reactive");
        parent.appendChild(placeholder);

        effect(() => {
          const result = child();
          const newChildren = Array.isArray(result) ? result : [result];

          const fragment = document.createDocumentFragment();
          for (const newChild of newChildren) {
            if (newChild instanceof Node) {
              fragment.appendChild(newChild);
            } else if (
              typeof newChild === "string" ||
              typeof newChild === "number"
            ) {
              fragment.appendChild(document.createTextNode(String(newChild)));
            }
          }

          let nextSibling = placeholder.nextSibling;
          while (nextSibling && nextSibling.nodeType !== Node.COMMENT_NODE) {
            const toRemove = nextSibling;
            nextSibling = nextSibling.nextSibling;
            toRemove.parentNode?.removeChild(toRemove);
          }

          placeholder.parentNode?.insertBefore(fragment, nextSibling);
        });
      }
    }
  }
  const element = document.createElement(tagName);
  let allChildren: Child[] = children ?? [];

  // Handle props
  if (
    propsOrFirstChild &&
    typeof propsOrFirstChild === "object" &&
    !(propsOrFirstChild instanceof Node)
  ) {
    const props = propsOrFirstChild as Props;
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith("on") && typeof value === "function") {
        const eventName = key.slice(2).toLowerCase();
        element.addEventListener(eventName, value);
      } else if (typeof value === "function") {
        effect(() => {
          element.setAttribute(key === "className" ? "class" : key, value());
        });
      } else {
        element.setAttribute(key === "className" ? "class" : key, value);
      }
    }
  } else if (propsOrFirstChild) {
    allChildren.unshift(propsOrFirstChild);
  }

  // Process children
  const flatChildren = allChildren.flat(Infinity);

  for (const child of flatChildren) {
    if (typeof child === "function") {
      // ✅ Use comment node as placeholder - invisible in DOM structure
      const placeholder = document.createComment("reactive-content");
      element.appendChild(placeholder);

      effect(() => {
        // Get the new content
        const result = child();
        const newChildren = Array.isArray(result) ? result : [result];

        // Create a temporary fragment to hold new content
        const fragment = document.createDocumentFragment();
        for (const newChild of newChildren) {
          if (newChild instanceof Node) {
            fragment.appendChild(newChild);
          } else if (
            typeof newChild === "string" ||
            typeof newChild === "number"
          ) {
            fragment.appendChild(document.createTextNode(String(newChild)));
          }
        }

        // Replace content after the placeholder
        // Remove old content (everything after placeholder until next placeholder)
        let nextSibling = placeholder.nextSibling;
        while (
          nextSibling &&
          nextSibling.nodeType !== Node.COMMENT_NODE &&
          nextSibling.textContent !== "reactive-content-end"
        ) {
          const toRemove = nextSibling;
          nextSibling = nextSibling.nextSibling;
          toRemove.parentNode?.removeChild(toRemove);
        }

        // Insert new content
        placeholder.parentNode?.insertBefore(fragment, nextSibling);
      });
    } else {
      appendChildren(element, Array.isArray(child) ? child : [child]);
    }
  }

  return element;
}
