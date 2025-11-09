import { createMemo, createSignal, f, render } from "@lib";

export function FMLWithSignal(): HTMLElement {
  const [count, setCount] = createSignal(0);
  const doubled = createMemo(() => count() * 2);

  const view = f(
    "div",
    { class: "flex items-center justify-center w-full", "data-count": () => count() },
    f("h1", {}, "Counter App"),
    f(
      "button",
      {
        onClick: () => setCount((value) => value + 1),
        style: "margin: 0 10px; padding: 10px; font-size: 20px;",
      },
      "Increment",
    ),
    f("h2", {}, () => `Count: ${count()}`),
    f("h3", {}, () => `Doubled count: ${doubled()}`),
    f(
      "ul",
      { class: "list-disc" },
      () =>
        Array.from({ length: count() }, (_, idx) =>
          f("li", { "data-idx": idx }, `Item ${idx + 1}`),
        ),
    ),
  );

  const node = render(view);
  if (!(node instanceof HTMLElement)) {
    throw new Error("FMLWithSignal must return a single root element");
  }
  return node;
}
