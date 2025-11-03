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
    } catch (error) {
      console.error(error);
    }
  }
  flushing = false;
}

function schedule(subscriber: Subscriber) {
  taskQueue.add(subscriber);
  if (!flushing) {
    flushing = true;
    queueMicrotask(flush);
  }
}

export function createSignal<T>(
  initial: T,
): [() => T, (value: T | ((prev: T) => T)) => void] {
  let value = initial;
  const subscribers = new Set<Subscriber>();

  const get = () => {
    if (currentTracker) subscribers.add(currentTracker);
    return value;
  };

  const set = (nextValue: T | ((prev: T) => T)) => {
    const resolved =
      typeof nextValue === "function"
        ? (nextValue as (prev: T) => T)(value)
        : nextValue;

    if (Object.is(resolved, value)) return;

    value = resolved;
    for (const subscriber of subscribers) schedule(subscriber);
  };

  const removeSubscriber = (subscriber: Subscriber) => {
    subscribers.delete(subscriber);
  };

  (get as any).__removeSubscriber = removeSubscriber;

  return [get, set];
}

export function effect(fn: () => void): () => void {
  const subscriber: Subscriber = {
    run: () => {
      currentTracker = subscriber;
      try {
        fn();
      } finally {
        currentTracker = null;
      }
    },
    clean: undefined,
  };

  subscriber.run();

  return () => {
    subscriber.run = () => {};
    subscriber.clean?.();
  };
}

export function createMemo<T>(compute: () => T): () => T {
  let value: T;
  let isDirty = true;
  const memoSubscribers = new Set<Subscriber>();

  const cleanup = effect(() => {
    compute();
    isDirty = true;
    for (const subscriber of memoSubscribers) schedule(subscriber);
  });

  isDirty = false;
  value = compute();

  const getter = () => {
    if (isDirty) {
      isDirty = false;
      value = compute();
    }

    if (currentTracker) memoSubscribers.add(currentTracker);
    return value;
  };

  (getter as any).dispose = () => {
    cleanup();
    memoSubscribers.clear();
  };

  return getter;
}
