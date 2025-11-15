import {
  createRouter,
  notFoundComponent,
  type Route,
  type RouteParams,
} from "fml-router";

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

// Main app
const appRoot = document.getElementById("app");
if (appRoot) {
  const routes = createRouter();
  const match = matchRoute(window.location.pathname, routes);

  if (match) {
    const { route, params } = match;

    const element = route.component(params);
    // console.log(element);
    // console.log(typeof element);

    if (element instanceof HTMLElement) {
      appRoot.replaceChildren(element); // modern alternative to appendChild
    } else if (typeof element === "string") {
      appRoot.innerHTML = element;
    } else {
      console.error("Component must return HTMLElement or string");
    }
  } else {
    if (notFoundComponent) {
      const element = notFoundComponent({});
      if (element instanceof HTMLElement) {
        appRoot.replaceChildren(element);
      } else if (typeof element === "string") {
        appRoot.innerHTML = element;
      }
    } else {
      appRoot.innerHTML = "<p>404 Not Found</p>";
    }
  }
}
