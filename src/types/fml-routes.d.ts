declare module "fml-router" {
  export type RouteParams = Record<string, string | undefined>;
  export type Route<P extends RouteParams = RouteParams> = {
    path: string;
    component: (params: P) => HTMLElement; // or your component type (e.g., JSX.Element)
  };
  export const notFoundComponent:
    | ((params: RouteParams) => HTMLElement | string)
    | null;
  export function createRouter(): Route[];
}
