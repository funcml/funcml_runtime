import { createMemo, createSignal, effect } from "./signal";

export type Accessor<T = unknown> = () => T;

export interface Store<T extends object> {
  readonly state: Accessor<Readonly<T>>;
  readonly set: (value: T | ((prev: Readonly<T>) => T)) => void;
  readonly update: (
    patch: Partial<T> | ((prev: Readonly<T>) => Partial<T> | void | T),
  ) => void;
  readonly select: <S>(selector: (state: Readonly<T>) => S) => Accessor<S>;
  readonly subscribe: (listener: (state: Readonly<T>) => void) => () => void;
  readonly destroy: () => void;
}

function applyPatch<T extends object>(prev: T, patch: Partial<T> | T): T {
  if (patch === prev) return prev;

  if (typeof patch !== "object" || patch === null) {
    return patch as T;
  }

  let next: T | null = null;
  const patchRecord = patch as Record<PropertyKey, unknown>;
  const prevRecord = prev as Record<PropertyKey, unknown>;

  for (const key of Reflect.ownKeys(patchRecord)) {
    const value = patchRecord[key];
    if (!Object.is(value, prevRecord[key])) {
      if (!next) {
        next = Array.isArray(prev)
          ? ([...(prev as unknown as unknown[])] as unknown as T)
          : ({ ...prev } as T);
      }
      (next as Record<PropertyKey, unknown>)[key] = value;
    }
  }

  return next ?? prev;
}

function toReadonly<T extends object>(value: T): Readonly<T> {
  return value;
}

export function createStore<T extends object>(initialState: T): Store<T> {
  if (typeof initialState !== "object" || initialState === null) {
    throw new TypeError("createStore expects an object as the initial state");
  }

  const [state, setState] = createSignal(initialState);
  const subscriptions = new Set<() => void>();
  const memoDisposers = new Set<() => void>();

  const wrappedState: Accessor<Readonly<T>> = () => toReadonly(state());

  const set = (value: T | ((prev: Readonly<T>) => T)) => {
    setState((prev) => {
      const resolved =
        typeof value === "function"
          ? (value as (prev: Readonly<T>) => T)(prev)
          : value;
      return resolved;
    });
  };

  const update: Store<T>["update"] = (patch) => {
    setState((prev) => {
      const resolved =
        typeof patch === "function"
          ? (patch as (prev: Readonly<T>) => Partial<T> | void | T)(prev)
          : patch;

      if (resolved === undefined) return prev;

      return applyPatch(prev, resolved as Partial<T> | T);
    });
  };

  const select: Store<T>["select"] = (selector) => {
    const memo = createMemo(() => selector(wrappedState()));
    const disposer = (memo as unknown as { dispose?: () => void }).dispose;

    if (disposer) memoDisposers.add(disposer);

    const accessor: Accessor<ReturnType<typeof selector>> = () => memo();

    (accessor as unknown as { dispose?: () => void }).dispose = () => {
      disposer?.();
      if (disposer) memoDisposers.delete(disposer);
    };

    return accessor;
  };

  const subscribe: Store<T>["subscribe"] = (listener) => {
    const stop = effect(() => {
      listener(wrappedState());
    });

    subscriptions.add(stop);

    return () => {
      stop();
      subscriptions.delete(stop);
    };
  };

  const destroy = () => {
    for (const stop of subscriptions) stop();
    subscriptions.clear();

    for (const dispose of memoDisposers) dispose();
    memoDisposers.clear();
  };

  return {
    state: wrappedState,
    set,
    update,
    select,
    subscribe,
    destroy,
  };
}
