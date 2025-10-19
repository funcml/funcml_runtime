import "./style.css";
import { setupCounter } from "./counter.ts";
import { fml } from "../funml/funml.ts";

const buttonAttrs = {
  id: "submit-btn",
  class: "px-4 py-2 font-xl",
};
const arr = [1, 2, 3, 4, 5];
const element = fml("form", { class: "flex flex-col gap-2" }, [
  () => fml("h1", { class: "text-xl text-white mb-4" }, [() => "Login"]),
  () =>
    fml(
      "input",
      { placeholder: "Username", class: "border-2 border-white p-1" },
      [],
    ),
  () =>
    fml(
      "input",
      { placeholder: "Password", class: "border-2 border-white p-1" },
      [],
    ),
  () => fml("button", buttonAttrs, [() => "Submit"]),

  () =>
    fml("ul", {}, [() => arr.map((content) => fml("li", {}, [() => content]))]),
]);
document.querySelector<HTMLDivElement>("#app")!.append(element);

setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);
