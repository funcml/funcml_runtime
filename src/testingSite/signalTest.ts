interface Subscriber {
  run: () => void;
  clean?: () => void;
}

interface FMLProps {
  [key: string]: any;
  children?: (() => any) | HTMLElement | Array<(() => any) | HTMLElement>;
}

let currentTracker: Subscriber | null = null;
const taskQueue = new Set<Subscriber>();
let flushing = false;

function flush() {
  for (const sub of Array.from(taskQueue)) {
    taskQueue.delete(sub);
    try {
      sub.run();
    } catch (e) {
      console.error(e);
    }
  }
  flushing = false;
}

function schedule(sub: Subscriber) {
  taskQueue.add(sub);
  if (!flushing) {
    flushing = true;
    queueMicrotask(flush);
  }
}

export function createSignal<T>(
  initial: T,
): [() => T, (v: T | ((prev: T) => T)) => void] {
  let value = initial;
  const subs = new Set<Subscriber>();

  const get = () => {
    if (currentTracker) subs.add(currentTracker);
    return value;
  };

  const set = (v: T | ((prev: T) => T)) => {
    const next = typeof v === "function" ? (v as any)(value) : v;
    if (Object.is(next, value)) return;
    value = next;
    for (const s of subs) schedule(s);
  };

  const removeSubscriber = (s: Subscriber) => subs.delete(s);

  (get as any).__removeSubscriber = removeSubscriber;

  return [get, set];
}

export function effect(fn: () => void): () => void {
  const sub: Subscriber = {
    run: () => {
      currentTracker = sub;
      try {
        fn();
      } finally {
        currentTracker = null;
      }
    },
    clean: undefined,
  };
  sub.run();
  return () => {
    sub.run = () => {};
    sub.clean?.();
  };
}

// ✅ FIXED createMemo - works with your reactivity system
export function createMemo<T>(fn: () => T): () => T {
  let value: T;
  let isDirty = true;
  const memoSubs = new Set<Subscriber>();

  // Create an effect that tracks dependencies and marks memo as dirty
  const cleanup = effect(() => {
    fn(); // Track dependencies by running fn
    isDirty = true;
    // Notify all subscribers of this memo
    for (const sub of memoSubs) {
      schedule(sub);
    }
  });

  // Initialize value
  isDirty = false;
  value = fn();

  const getter = () => {
    if (isDirty) {
      isDirty = false;
      value = fn();
    }
    // Let consumers track this memo
    if (currentTracker) {
      memoSubs.add(currentTracker);
    }
    return value;
  };

  // Cleanup function (optional but good practice)
  (getter as any).dispose = () => {
    cleanup();
    memoSubs.clear();
  };

  return getter;
}

const _fml = (
  tag: string,
  props: FMLProps,
  children: Array<(() => any) | HTMLElement | string | number | boolean>,
) => {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("on") && typeof value === "function") {
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, value);
    } else {
      if (typeof value === "function") {
        effect(() => {
          el.setAttribute(key, value());
        });
      } else if (value != null) {
        el.setAttribute(key, value);
      }
    }
  }

  function appendChild(
    child: (() => any) | HTMLElement | string | number | boolean | Array<any>,
  ) {
    if (Array.isArray(child)) {
      child.forEach(appendChild);
    } else if (child == null) {
      return;
    } else if (typeof child === "function") {
      const textNode = document.createTextNode("");
      effect(() => {
        const v = child();
        textNode.nodeValue = v != null ? String(v) : "";
      });
      el.appendChild(textNode);
    } else if (
      typeof child === "string" ||
      typeof child === "number" ||
      typeof child === "boolean"
    ) {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof HTMLElement) {
      el.appendChild(child);
    }
  }

  children.forEach(appendChild);

  return el;
};

export function FMLWithSignal() {
  const [test, setTest] = createSignal(0);
  const derivedTest = createMemo(() => test() + 1);

  return _fml("div", { class: "flex items-center justify-center w-full" }, [
    _fml("h1", {}, ["Counter App"]),
    _fml(
      "button",
      {
        onClick: () => setTest((t) => t + 1),
        style: "margin: 0 10px; padding: 10px; font-size: 20px;",
      },
      ["Increment"],
    ),
    _fml("h2", {}, [() => `Count: ${test()}`]),
    _fml("h3", {}, [() => `Derived count: ${derivedTest()}`]),
  ]);
}
