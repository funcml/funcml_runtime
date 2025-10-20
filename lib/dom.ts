type Props = { [key: string]: any };
type Child = Node | string | number | null | undefined;

export function f(
    tagName: string,
    propsOrFirstChild?: Props | Child,
    ...children: Child[]
) {
    const element = document.createElement(tagName);
    let allChildren: Child[] = children ?? [];

    if (
        propsOrFirstChild
        && typeof propsOrFirstChild == "object"
        && !(propsOrFirstChild instanceof Node)
    ) {
        const props = propsOrFirstChild as Props;
        for (const [key, value] of Object.entries(props))
            element.setAttribute(key == "className" ? "class" : key, value);
    } else if (propsOrFirstChild) {
        allChildren.unshift(propsOrFirstChild);
    }

    for (const child of allChildren) {
        if (typeof child == "string" || typeof child == "number") {
            element.appendChild(document.createTextNode(child.toString()));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    }

    return element
}