import {
  createRouter,
  notFoundComponent,
  type Route,
  type RouteParams,
} from "fml-router";
import { clear, mount, type VChild } from "@lib";

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

function renderIntoApp(container: HTMLElement, result: unknown) {
  clear(container);

  if (result instanceof HTMLElement) {
    container.appendChild(result);
    return;
  }

  if (typeof result === "string") {
    container.textContent = result;
    return;
  }

  if (result != null) {
    mount(result as VChild, container);
    return;
  }

  container.textContent = "";
}

// Main app
const appRoot = document.getElementById("app");
if (appRoot) {
  const routes = createRouter();
  console.log("routes", routes);
  const match = matchRoute(window.location.pathname, routes);
  console.log("match", match);

  if (match) {
    const { route, params } = match;
    const result = route.component(params);
    console.log("route component result", result);
    renderIntoApp(appRoot, result);
  } else {
    if (notFoundComponent) {
      const result = notFoundComponent({});
      console.log("not found result", result);
      renderIntoApp(appRoot, result);
    } else {
      renderIntoApp(appRoot, "<p>404 Not Found</p>");
    }
  }
}
