// Allows transpiled output to defer evaluation until the DOM effect runs.
type Resolvable<T> = T | (() => Resolvable<T>);

type PrimitiveChild = string | number | null | undefined;
type ChildUnit = Node | PrimitiveChild;
type GuardResult = ChildUnit | ChildUnit[];

type GuardCondition = boolean | (() => boolean);
type GuardValue = Resolvable<GuardResult>;
export type GuardCase = readonly [GuardCondition, GuardValue];

function resolve<T>(value: Resolvable<T>): T {
  let current: Resolvable<T> | T = value;
  while (typeof current === "function") {
    current = (current as () => Resolvable<T>)();
  }
  return current as T;
}

function pushValue(value: GuardResult, bucket: ChildUnit[]): void {
  if (value == null) return;
  if (Array.isArray(value)) {
    for (const entry of value) {
      pushValue(entry as GuardResult, bucket);
    }
    return;
  }
  bucket.push(value);
}

function normalize(value: GuardResult): GuardResult {
  if (!Array.isArray(value)) return value;
  const bucket: ChildUnit[] = [];
  pushValue(value, bucket);
  return bucket;
}

function toBoolean(condition: GuardCondition): boolean {
  const resolved = typeof condition === "function" ? condition() : condition;
  return Boolean(resolved);
}

export function guard(
  cases: readonly GuardCase[],
  fallback?: GuardValue,
): GuardResult | null {
  for (const [condition, result] of cases) {
    if (toBoolean(condition)) {
      return normalize(resolve(result));
    }
  }

  if (arguments.length > 1) {
    return normalize(resolve(fallback!));
  }

  return null;
}

// Clauses describe how the transpiler wants the runtime to loop/filter values.
export type ComprehensionClause =
  | {
      readonly kind: "bind";
      readonly source: (...scope: readonly unknown[]) => Iterable<unknown> | null | undefined;
    }
  | {
      readonly kind: "filter";
      readonly when: (...scope: readonly unknown[]) => boolean;
    };

export interface ComprehensionPlan {
  readonly clauses: readonly ComprehensionClause[];
  readonly produce: (...scope: readonly unknown[]) => Resolvable<GuardResult>;
}

// Walks the clause list depth-first and flattens every emission for the DOM.
export function comprehension(plan: ComprehensionPlan): GuardResult {
  const scope: unknown[] = [];
  const results: ChildUnit[] = [];

  const emit = (value: Resolvable<GuardResult>) => {
    const resolved = resolve(value);
    pushValue(resolved, results);
  };

  const run = (index: number) => {
    if (index >= plan.clauses.length) {
      emit(plan.produce(...scope));
      return;
    }

    const clause = plan.clauses[index];
    if (clause.kind === "bind") {
      const iterable = clause.source(...scope);
      if (!iterable) return;
      for (const value of iterable) {
        scope.push(value);
        run(index + 1);
        scope.pop();
      }
      return;
    }

    if (clause.when(...scope)) {
      run(index + 1);
    }
  };

  run(0);
  return results;
}
