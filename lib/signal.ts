interface Subscriber {
  run: () => void;
  clean?: () => void;
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
