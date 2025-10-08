export type VNode = string | number | null | VElement | VNode[];

export interface VElement {
  readonly tag: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly children: readonly VNode[];
}
