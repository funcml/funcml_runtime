import {
  createRouter,
  notFoundComponent,
  type Route,
  type RouteParams,
} from "fml-router";

// Router state - don't cache routes, get them fresh each time
let initialized = false;

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

// Render function - get fresh routes each time
export function renderApp() {
  const appRoot = document.getElementById("app");
  if (!appRoot) {
    console.error("No element with id 'app' found");
    return;
  }

  // ✅ Get fresh routes every time renderApp is called
  const routes = createRouter();

  if (!routes || routes.length === 0) {
    console.error("No routes found");
    return;
  }

  const currentPath = window.location.pathname;
  console.log("Rendering route:", currentPath, "with", routes.length, "routes");

  const match = matchRoute(currentPath, routes);

  if (match) {
    console.log("Route match found:", match.route.path);
    const { route, params } = match;
    const element = route.component(params);

    if (element instanceof HTMLElement) {
      appRoot.replaceChildren(element);
      console.log("DOM updated with HTMLElement");
    } else if (typeof element === "string") {
      appRoot.innerHTML = element;
      console.log("DOM updated with string");
    } else {
      console.error(
        "Component must return HTMLElement or string, got:",
        typeof element,
      );
    }
  } else {
    console.log("No route match found for:", currentPath);
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

// Navigation function
export function navigateTo(path: string) {
  console.log("Navigating to:", path);
  window.history.pushState(null, "", path);
  renderApp();
}

// Replace current location (no history entry)
export function replaceWith(path: string) {
  console.log("Replacing with:", path);
  window.history.replaceState(null, "", path);
  renderApp();
}

// Initialize router
export function initRouter() {
  if (initialized) return;

  initialized = true;

  // Handle browser back/forward buttons
  window.addEventListener("popstate", () => {
    console.log("Popstate event, current path:", window.location.pathname);
    renderApp();
  });

  // Handle link clicks for client-side navigation
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    if (target.tagName === "A") {
      const link = target as HTMLAnchorElement;

      if (link.origin === window.location.origin && !link.target) {
        e.preventDefault();
        console.log("Intercepted link click to:", link.pathname);
        navigateTo(link.pathname);
      }
    }
  });

  // Initial render
  console.log("Initial render, current path:", window.location.pathname);
  renderApp();
}

// Get current path
export function getCurrentPath(): string {
  return window.location.pathname;
}
