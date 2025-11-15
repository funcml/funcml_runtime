import { describe, expect, it } from "vitest";
import { guard, comprehension, type ComprehensionPlan } from "@lib";

const createElement = (text: string) => {
  const el = document.createElement("span");
  el.textContent = text;
  return el;
};

describe("guard", () => {
  it("returns the first matching branch", () => {
    const result = guard([
      [false, "no"],
      [() => true, () => "yep"],
    ]);

    expect(result).toBe("yep");
  });

  it("returns the fallback when nothing matches", () => {
    const result = guard([], () => "fallback");

    expect(result).toBe("fallback");
  });

  it("supports complex outputs", () => {
    const result = guard([
      [
        () => true,
        () => [createElement("first"), createElement("second")],
      ],
    ]);

    expect(Array.isArray(result)).toBe(true);
    const nodes = result as Element[];
    expect(nodes).toHaveLength(2);
    expect(nodes[0].textContent).toBe("first");
    expect(nodes[1].textContent).toBe("second");
  });
});

describe("comprehension", () => {
  it("builds nodes from bindings and filters", () => {
    const plan: ComprehensionPlan = {
      clauses: [
        { kind: "bind", source: () => [1, 2, 3, 4] },
        { kind: "filter", when: (value) => (value as number) % 2 === 0 },
      ],
      produce: (value) => createElement(`value-${value as number}`),
    };

    const result = comprehension(plan);

    expect(Array.isArray(result)).toBe(true);
    const nodes = result as Element[];
    expect(nodes).toHaveLength(2);
    expect(nodes[0].textContent).toBe("value-2");
    expect(nodes[1].textContent).toBe("value-4");
  });

  it("supports multi-level bindings", () => {
    const plan: ComprehensionPlan = {
      clauses: [
        { kind: "bind", source: () => ["a", "b"] },
        { kind: "bind", source: (_letter) => [1, 2] },
        { kind: "filter", when: (_, number) => Number(number) === 2 },
      ],
      produce: (letter, number) => `${String(letter)}${Number(number)}`,
    };

    const result = comprehension(plan);

    expect(result).toEqual(["a2", "b2"]);
  });
});
