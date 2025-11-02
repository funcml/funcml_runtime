import fs from "fs";
import path from "path";

const ROUTES_DIR = "src/routes";
const ROUTER_ID = "fml-router";
const MANIFEST_ID = "fml-route-manifest";

interface IRouteFile {
  file: string;
  route: string;
}

function fileToRoute(file: string) {
  let route = file
    .replace(/\.[^/.]+$/, "") // remove extension
    .replace(/index$/, "") // /index → /
    .replace(/\[([^\]]+)\]/g, ":$1") // [slug] → :slug
    .replace(/\[\.\.\.([^\]]+)\]/g, ":$1*"); // [...all] → :all*

  return route === "" ? "/" : route;
}

function scanRoutes(dir: string) {
  const routes: IRouteFile[] = [];
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const relPath = path.relative(ROUTES_DIR, fullPath);

    if (fs.statSync(fullPath).isDirectory()) {
      routes.push(...scanRoutes(fullPath));
    } else if (file.endsWith(".fml")) {
      routes.push({
        file: fullPath,
        route: fileToRoute(relPath),
      });
    }
  }
  return routes;
}

function scanRoutesWith404(dir: string) {
  const routes = scanRoutes(dir); // your existing scanRoutes

  // Check if 404.fml exists
  const notFoundPath = path.resolve(dir, "404.fml");
  if (fs.existsSync(notFoundPath)) {
    const projectRelative = path
      .relative(process.cwd(), notFoundPath)
      .replace(/\\/g, "/");
    routes.push({
      file: "./" + projectRelative,
      route: "404", // special marker
    });
  }
  return routes;
}

export function fmlFileRoutePlugin() {
  let routeManifest: IRouteFile[] = [];

  return {
    name: "fml-file-router",

    // Generate route manifest on startup
    async buildStart() {
      const absRoutesDir = path.resolve(ROUTES_DIR);
      if (fs.existsSync(absRoutesDir)) {
        routeManifest = scanRoutesWith404(absRoutesDir);
      } else {
        routeManifest = [];
      }
    },

    // Resolve virtual modules
    resolveId(source: string) {
      if (source === ROUTER_ID || source === MANIFEST_ID) {
        return `\0${source}`;
      }
      return null;
    },

    // Load virtual modules
    load(id: string) {
      if (id === `\0${MANIFEST_ID}`) {
        // Generate dynamic imports for each route
        const imports = routeManifest
          .map((r, i) => `import route${i} from ${JSON.stringify(r.file)};`)
          .join("\n");

        const routesArray = routeManifest
          .map(
            (r, i) =>
              `{ path: ${JSON.stringify(r.route)}, component: route${i} }`,
          )
          .join(",\n  ");

        const notFoundIndex = routeManifest.findIndex((r) => r.route === "404");
        const notFoundRef =
          notFoundIndex >= 0 ? `route${notFoundIndex}` : "null";

        return `
${imports}

export const routes = [
  ${routesArray}
];

export const notFoundComponent = ${notFoundRef};
        `.trim();
      }

      if (id === `\0${ROUTER_ID}`) {
        return `
import { routes, notFoundComponent } from '${MANIFEST_ID}';

export function createRouter() {
  // Simple router: returns a map of path → component
  // In real app, you'd integrate with history API, etc.
  return routes;
}

export { notFoundComponent };
        `.trim();
      }

      return null;
    },
  };
}
