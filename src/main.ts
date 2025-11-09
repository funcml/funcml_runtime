import {
  createRouter,
  notFoundComponent,
  type Route,
  type RouteParams,
} from "fml-router";
import {
  createSignal,
  createStore,
  renderTo,
  updateRoot,
  f,
  type Accessor,
  type ChildValue,
  type VChild,
} from "@lib";

function matchRoute(
  pathname: string,
  routes: Route[],
): { route: Route; params: RouteParams } | null {
  const path = pathname === "/" ? "/" : pathname.slice(1);

  for (const route of routes) {
    const pattern = route.path
      .replace(/:[^/*]+/g, "([^/]+)")
      .replace(/:\w+\*$/, "(.*)");

    const regex = new RegExp(`^${pattern}$`);
    const match = path.match(regex);

    if (match) {
      const keys = (route.path.match(/:([^/*]+)/g) || []).map((k) =>
        k.slice(1),
      );
      const params: RouteParams = {};

      keys.forEach((key, i) => {
        params[key] = match[i + 1] ?? undefined;
      });

      return { route, params };
    }
  }
  return null;
}

function coerceToVNode(result: unknown, pathname: string): VChild {
  if (result == null || result === false) {
    return f("p", {}, `No view returned for ${pathname}`);
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

type RouterSnapshot = {
  pathname: string;
  params: RouteParams;
  view: VChild;
  title: string;
  notFound: boolean;
};

const routes = createRouter();
const navigableRoutes = routes.filter((route) => route.path !== "404");

function resolveRoute(pathname: string): RouterSnapshot {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const match = matchRoute(normalized, routes);

  if (match) {
    const { route, params } = match;
    const view = coerceToVNode(route.component(params), normalized);
    return {
      pathname: normalized,
      params,
      view,
      title: route.path,
      notFound: false,
    };
  }

  if (notFoundComponent) {
    return {
      pathname: normalized,
      params: {},
      view: coerceToVNode(notFoundComponent({}), normalized),
      title: "Not Found",
      notFound: true,
    };
  }

  return {
    pathname: normalized,
    params: {},
    view: f(
      "main",
      { class: "fml-not-found" },
      f("h1", {}, "404 Not Found"),
      f("p", {}, `No route matched ${normalized}`),
    ),
    title: "Not Found",
    notFound: true,
  };
}

const appRoot = document.getElementById("app");

if (appRoot) {
  const routerStore = createStore(resolveRoute(window.location.pathname));
  const pathnameAccessor = routerStore.select((state) => state.pathname);
  const viewAccessor = routerStore.select((state) => state.view);
  const titleAccessor = routerStore.select((state) => state.title);
  const notFoundAccessor = routerStore.select((state) => state.notFound);

  const [now, setNow] = createSignal(new Date());
  const tick = window.setInterval(() => setNow(new Date()), 1000);
  const timeAccessor: Accessor<string> = () => now().toLocaleTimeString();
  const viewContent: Accessor<ChildValue> = () => toChildValue(viewAccessor());
  const notFoundMessage: Accessor<ChildValue> = () =>
    notFoundAccessor()
      ? f(
          "p",
          { class: "fml-notice" },
          "Showing fallback content for an unknown route.",
        )
      : null;

  const navigate = (pathname: string) => {
    const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
    if (window.location.pathname !== normalized) {
      window.history.pushState({}, "", normalized);
    }
    routerStore.set(resolveRoute(normalized));
  };

  const onPopState = () => {
    routerStore.set(resolveRoute(window.location.pathname));
  };

  window.addEventListener("popstate", onPopState);

  const App = (): VChild =>
    f(
      "div",
      { class: "fml-shell" },
      f("header", { class: "fml-header" }, [
        f("h1", {}, "FUNML Runtime"),
        f(
          "p",
          { class: "fml-subtitle" },
          "Signals + store demonstrate shared state",
        ),
        f("div", { class: "fml-status" }, [
          f("span", { class: "fml-route" }, "Path: ", pathnameAccessor),
          f("span", { class: "fml-clock" }, "Time: ", timeAccessor),
        ]),
      ]),
      f(
        "nav",
        { class: "fml-nav" },
        navigableRoutes.map((route) =>
          f(
            "button",
            {
              type: "button",
              class: () =>
                pathnameAccessor() === route.path
                  ? "fml-nav__link is-active"
                  : "fml-nav__link",
              onClick: (event: MouseEvent) => {
                event.preventDefault();
                navigate(route.path);
              },
            },
            route.path === "/" ? "home" : route.path,
          ),
        ),
      ),
      f(
        "section",
        { class: "fml-view" },
        viewContent,
      ),
      notFoundMessage,
      f(
        "footer",
        { class: "fml-footer" },
        "Viewing ",
        titleAccessor,
      ),
    );

  let root = renderTo(appRoot, App());

  const unsubscribe = routerStore.subscribe(() => {
    root = updateRoot(root, App());
  });

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      unsubscribe();
      routerStore.destroy();
      window.removeEventListener("popstate", onPopState);
      clearInterval(tick);
    });
  }
}
