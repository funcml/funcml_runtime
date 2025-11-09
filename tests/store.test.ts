import { describe, expect, it } from "vitest";

import { createStore } from "../funml/store";

const flushMicrotasks = async () => {
  await Promise.resolve();
};

describe("createStore", () => {
  it("notifies subscribers when state changes", async () => {
    const store = createStore({ count: 0, label: "zero" });
    const seen: number[] = [];

    const unsubscribe = store.subscribe((state) => {
      seen.push(state.count);
    });

    expect(seen).toEqual([0]);

    store.update({ count: 1 });
    await flushMicrotasks();
    expect(seen).toEqual([0, 1]);

    store.update((prev) => ({ count: prev.count + 1 }));
    await flushMicrotasks();
    expect(seen).toEqual([0, 1, 2]);

    unsubscribe();
    store.update({ count: 5 });
    await flushMicrotasks();
    expect(seen).toEqual([0, 1, 2]);
  });

  it("supports derived selectors that stay in sync", async () => {
    const store = createStore({ count: 0, label: "zero" });
    const count = store.select((state) => state.count);

    expect(count()).toBe(0);

    store.update({ count: 2 });
    await flushMicrotasks();
    expect(count()).toBe(2);

    store.update((prev) => ({ count: prev.count + 1 }));
    await flushMicrotasks();
    expect(count()).toBe(3);

    (count as unknown as { dispose?: () => void }).dispose?.();
    store.update({ count: 4 });
    await flushMicrotasks();
    expect(count()).toBe(3);
  });

  it("merges partial updates without creating churn", async () => {
    const store = createStore({ count: 0, label: "idle" });

    const first = store.state();
    expect(first).toEqual({ count: 0, label: "idle" });

    store.update({ count: 0 });
    await flushMicrotasks();
    expect(store.state()).toBe(first);

    store.update({ label: "busy" });
    await flushMicrotasks();
    expect(store.state()).toEqual({ count: 0, label: "busy" });

    store.update((prev) => ({ count: prev.count + 2 }));
    await flushMicrotasks();
    expect(store.state()).toEqual({ count: 2, label: "busy" });
  });

  it("cleans up subscriptions and selectors when destroyed", async () => {
    const store = createStore({ count: 0, label: "zero" });
    const seen: number[] = [];

    store.subscribe((state) => {
      seen.push(state.count);
    });

    const count = store.select((state) => state.count);
    expect(count()).toBe(0);

    store.destroy();

    store.update({ count: 3 });
    await flushMicrotasks();

    expect(seen).toEqual([0]);
    expect(count()).toBe(0);
  });
});
