import { createRouter, notFoundComponent } from "fml-router";
import {
  createSignal,
  renderTo,
  updateRoot,
  f,
  createRouterStore,
  viewAccessorToChild,
  type VChild,
} from "@lib";

const appRoot = document.getElementById("app");

if (!appRoot) {
  console.warn("funml: #app container not found");
} else {
  const routes = createRouter();
  const { store, navigate, dispose } = createRouterStore(
    routes,
    notFoundComponent ?? undefined,
  );

  const pathname = store.select((snapshot) => snapshot.pathname);
  const title = store.select((snapshot) => snapshot.title);
  const notFound = store.select((snapshot) => snapshot.notFound);
  const view = viewAccessorToChild(store.select((snapshot) => snapshot.view));

  const [now, setNow] = createSignal(new Date());
  const timer = window.setInterval(() => setNow(new Date()), 1000);
  const time = () => now().toLocaleTimeString();

  const toPathname = (path: string) =>
    path === "/" || path.startsWith("/") ? path : `/${path}`;
  const navigableRoutes = routes.filter((route) => route.path !== "404");
  const notFoundMessage = viewAccessorToChild(() =>
    notFound() ? f("p", { class: "fml-notice" }, "Showing fallback content.") : null,
  );

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
          f("span", { class: "fml-route" }, "Path: ", pathname),
          f("span", { class: "fml-clock" }, "Time: ", time),
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
                pathname() === toPathname(route.path)
                  ? "fml-nav__link is-active"
                  : "fml-nav__link",
              onClick: (event: MouseEvent) => {
                event.preventDefault();
                navigate(toPathname(route.path));
              },
            },
            route.path === "/" ? "home" : route.path,
          ),
        ),
      ),
      f("section", { class: "fml-view" }, view),
      notFoundMessage,
      f("footer", { class: "fml-footer" }, "Viewing ", title),
    );

  let root = renderTo(appRoot, App());

  const unsubscribe = store.subscribe(() => {
    root = updateRoot(root, App());
  });

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      unsubscribe();
      dispose();
      clearInterval(timer);
    });
  }
}
