export type Primitive = string | number | boolean | null | undefined;

export type Accessor<T = unknown> = () => T;

export type ChildValue = Primitive | VElement | ChildValue[];

export type VChild = ChildValue | Accessor<ChildValue>;

export type VNode = VChild;

export interface VElement {
  readonly tag: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly children: readonly VChild[];
}

export type Props = Readonly<Record<string, unknown>>;
