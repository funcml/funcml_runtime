import { createStore } from "./store";
import type { Accessor, ChildValue, VChild } from "./types";

export interface RouteDefinition<Params extends Record<string, string | undefined> = Record<string, string | undefined>> {
  readonly path: string;
  readonly component: (params: Params) => unknown;
}

export interface RouterSnapshot<Params extends Record<string, string | undefined> = Record<string, string | undefined>> {
  readonly pathname: string;
  readonly params: Params;
  readonly view: VChild;
  readonly title: string;
  readonly notFound: boolean;
}

export interface RouterStore<Params extends Record<string, string | undefined> = Record<string, string | undefined>> {
  readonly state: () => Readonly<RouterSnapshot<Params>>;
  readonly select: <T>(selector: (snapshot: RouterSnapshot<Params>) => T) => Accessor<T>;
  readonly update: (snapshot: RouterSnapshot<Params>) => void;
  readonly subscribe: (listener: (snapshot: RouterSnapshot<Params>) => void) => () => void;
  readonly destroy: () => void;
}

interface RouterController<Params extends Record<string, string | undefined> = Record<string, string | undefined>> {
  readonly store: RouterStore<Params>;
  readonly navigate: (pathname: string, options?: { replace?: boolean }) => void;
  readonly dispose: () => void;
}

export type RouteTable<Params extends Record<string, string | undefined> = Record<string, string | undefined>> = readonly RouteDefinition<Params>[];

export function matchRoute<RouteParams extends Record<string, string | undefined>>(
  pathname: string,
  routes: RouteTable<RouteParams>,
): { route: RouteDefinition<RouteParams>; params: RouteParams } | null {
  const safePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const normalized = safePath === "/" ? "/" : safePath.slice(1);

  for (const route of routes) {
    const pattern = route.path
      .replace(/:[^/*]+/g, "([^/]+)")
      .replace(/:\w+\*$/, "(.*)");

    const regex = new RegExp(`^${pattern}$`);
    const match = normalized.match(regex);

    if (!match) continue;

    const keys = (route.path.match(/:([^/*]+)/g) || []).map((key) => key.slice(1)) as (keyof RouteParams)[];
    const params = {} as RouteParams;

    keys.forEach((key, index) => {
      const value = match[index + 1] ?? undefined;
      params[key] = value as RouteParams[typeof key];
    });

    return { route, params };
  }

  return null;
}

export function coerceToVNode(result: unknown, pathname: string): VChild {
  if (result == null || result === false) {
    return ["No view returned for ", pathname];
  }

  if (typeof result === "string" || typeof result === "number" || typeof result === "boolean") {
    return String(result);
  }

  if (typeof result === "function") {
    return result as VChild;
  }

  if (result instanceof HTMLElement) {
    return result.outerHTML;
  }

  if (result instanceof Node) {
    return result.textContent ?? "";
  }

  if (typeof result === "object" && "tag" in (result as Record<string, unknown>)) {
    return result as VChild;
  }

  return String(result);
}

function toChildValue(value: VChild): ChildValue {
  if (typeof value === "function") {
    return (value as Accessor<ChildValue>)();
  }
  return value as ChildValue;
}

export function resolveRoute<RouteParams extends Record<string, string | undefined>>(
  pathname: string,
  routes: RouteTable<RouteParams>,
  notFoundComponent?: (params: RouteParams) => unknown,
): RouterSnapshot<RouteParams> {
  const safePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const match = matchRoute(safePath, routes);

  if (match) {
    const { route, params } = match;
    return {
      pathname: safePath,
      params,
      view: coerceToVNode(route.component(params), safePath),
      title: route.path,
      notFound: false,
    };
  }

  if (notFoundComponent) {
    return {
      pathname: safePath,
      params: {} as RouteParams,
      view: coerceToVNode(notFoundComponent({} as RouteParams), safePath),
      title: "Not Found",
      notFound: true,
    };
  }

  return {
    pathname: safePath,
    params: {} as RouteParams,
    view: ["404 Not Found: ", safePath],
    title: "Not Found",
    notFound: true,
  };
}

export function createRouterStore<RouteParams extends Record<string, string | undefined>>(
  routes: RouteTable<RouteParams>,
  notFoundComponent?: (params: RouteParams) => unknown,
  options?: {
    readonly history?: Pick<History, "pushState" | "replaceState">;
    readonly location?: Pick<Location, "pathname">;
    readonly addEventListener?: (type: string, listener: (event: Event) => void) => void;
    readonly removeEventListener?: (type: string, listener: (event: Event) => void) => void;
  },
): RouterController<RouteParams> {
  const history = options?.history ?? window.history;
  const locationRef = options?.location ?? window.location;
  const addEventListener = options?.addEventListener ?? window.addEventListener.bind(window);
  const removeEventListener = options?.removeEventListener ?? window.removeEventListener.bind(window);

  const initialSnapshot = resolveRoute(locationRef.pathname, routes, notFoundComponent);
  const store = createStore(initialSnapshot);

  const navigate = (pathname: string, { replace = false }: { replace?: boolean } = {}) => {
    const safePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
    const snapshot = resolveRoute(safePath, routes, notFoundComponent);
    const currentPath = locationRef.pathname;

    if (replace) {
      history.replaceState({}, "", safePath);
    } else if (currentPath !== safePath) {
      history.pushState({}, "", safePath);
    }
    store.set(snapshot);
  };

  const onPopState = () => {
    store.set(resolveRoute(locationRef.pathname, routes, notFoundComponent));
  };

  addEventListener("popstate", onPopState);

  const dispose = () => {
    removeEventListener("popstate", onPopState);
    store.destroy();
  };

  return {
    store: {
      state: store.state,
      select: store.select,
      update: (snapshot) => store.set(snapshot),
      subscribe: store.subscribe,
      destroy: store.destroy,
    },
    navigate,
    dispose,
  };
}

export function viewAccessorToChild(accessor: Accessor<VChild>): Accessor<ChildValue> {
  return () => toChildValue(accessor());
}
