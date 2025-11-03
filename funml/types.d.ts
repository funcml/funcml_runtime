export type Primitive = string | number | boolean | null | undefined;

export type VNode = Primitive | VElement | VNode[];

export interface VElement {
  readonly tag: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly children: readonly VNode[];
}

export type Props = Readonly<Record<string, unknown>>;
