import { f } from "@lib";

export function Component() {
    return f(
        "div",
        f("h1", "Hello world!"),
    );
}