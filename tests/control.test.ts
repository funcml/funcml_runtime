import { describe, expect, it } from "vitest";
import { guard } from "@lib";

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
