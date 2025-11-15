import { describe, expect, it, vi } from "vitest";

import {
  createRouterStore,
  matchRoute,
  resolveRoute,
  viewAccessorToChild,
  type RouteDefinition,
  type RouterSnapshot,
} from "../funml/router";

const flushMicrotasks = async () => {
  await Promise.resolve();
};

type ProfileParams = { id?: string };

const routes: RouteDefinition<ProfileParams>[] = [
  { path: "/", component: () => "home" },
  {
    path: "profile/:id",
    component: (params) => `profile:${params.id ?? ""}`,
  },
];

describe("router helpers", () => {
  it("matches dynamic segments and extracts parameters", () => {
    const match = matchRoute("/profile/123", routes);
    expect(match).not.toBeNull();
    expect(match?.params.id).toBe("123");
  });

  it("resolves to a fallback snapshot when no route matches", () => {
    const snapshot: RouterSnapshot<ProfileParams> = resolveRoute("/missing", routes);
    expect(snapshot.notFound).toBe(true);
    expect(snapshot.pathname).toBe("/missing");
    expect(typeof snapshot.view === "string" || Array.isArray(snapshot.view)).toBe(true);
  });

  it("bridges nested accessors to child values", () => {
    const accessor = viewAccessorToChild(() => () => "nested");
    expect(accessor()).toBe("nested");
  });

  it("navigates and reacts to popstate events", async () => {
    const listeners = new Map<string, (event: Event) => void>();
    const location = { pathname: "/" };
    const history = {
      pushState: vi.fn((_state: unknown, _title: string, url?: string | URL | null) => {
        if (typeof url === "string") location.pathname = url;
      }),
      replaceState: vi.fn((_state: unknown, _title: string, url?: string | URL | null) => {
        if (typeof url === "string") location.pathname = url;
      }),
    } satisfies Pick<History, "pushState" | "replaceState">;

    const controller = createRouterStore(routes, undefined, {
      history,
      location,
      addEventListener: (type, listener) => listeners.set(type, listener),
      removeEventListener: (type) => listeners.delete(type),
    });

    const seen: string[] = [];
    const unsubscribe = controller.store.subscribe((snapshot) => {
      seen.push(snapshot.pathname);
    });

    expect(seen).toEqual(["/"]);

    controller.navigate("profile/42");
    await flushMicrotasks();

    expect(history.pushState).toHaveBeenCalled();
    expect(location.pathname).toBe("/profile/42");
    expect(seen.pop()).toBe("/profile/42");

    location.pathname = "/";
    listeners.get("popstate")?.(new PopStateEvent("popstate"));
    await flushMicrotasks();
    expect(seen.pop()).toBe("/");

    unsubscribe();
    controller.dispose();
  });
});
