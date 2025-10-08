/**
 * @jest-environment jsdom
 */

import { fml } from "../funml/funml";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom";

describe("fml() test", () => {
  test("it should create an Element", () => {
    const element = fml("h1", {}, ["Hello"]);

    document.body.appendChild(element);
    expect(element.tagName).toBe("H1");
    expect(element.textContent).toBe("Hello");
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  test("it should create an Element with these atrributes", () => {
    const attrs = {
      id: "submit-btn",
      class: "px-4 py-2 font-xl",
    };
    const element = fml("button", attrs, ["Click me!"]);

    document.body.appendChild(element);
    expect(element.tagName).toBe("BUTTON");
    expect(element.textContent).toBe("Click me!");
    expect(element.className).toBe("px-4 py-2 font-xl");
    expect(element.id).toBe("submit-btn");
    expect(screen.getByText("Click me!")).toBeInTheDocument();
  });

  test("it should create an Element with multiple children", () => {
    const buttonAttrs = {
      id: "submit-btn",
      class: "px-4 py-2 font-xl",
    };
    const element = fml("form", {}, [
      fml("input", {}, []),
      fml("button", buttonAttrs, ["Submit"]),
    ]);

    document.body.appendChild(element);
    expect(element.tagName).toBe("FORM");
    expect(element.children.length).toBe(2);

    expect(element.children[0].tagName).toBe("INPUT");

    expect(element.children[1].tagName).toBe("BUTTON");
    expect(element.children[1].id).toBe("submit-btn");
  });

  test("it should able to use map() to render multiple children", () => {
    const arr = [1, 2, 3, 4, 5];
    const element = fml("ul", {}, [
      arr.map((content) => fml("li", {}, [() => content])),
    ]);

    expect(element.children.length).toBe(5);
    arr.forEach((content, idx) => {
      expect(element.children[idx].textContent).toBe(String(content));
    });
  });
});

afterEach(() => {
  document.body.innerHTML = "";
});
