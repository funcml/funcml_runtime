type Props = { [key: string]: any };
type VChild = VNode | string | number | null | undefined;

type VNode = {
    tagName: string;
    props: Props;
    children: VChild[];
}

function isPropsObject(value: Props | VChild | undefined): value is Props {
    if (typeof value !== 'object' || value == null || Array.isArray(value))
        return false;

    return !("children" in value);
}

export function f(
    tagName: string,
    propsOrFirstChild?: Props | VChild,
    ...children: VChild[]
) {
    let props: Props = {};
    let allChildren: VChild[] = children ?? [];

    if (isPropsObject(propsOrFirstChild)) {
        props = propsOrFirstChild;
    } else if (propsOrFirstChild) {
        allChildren.unshift(propsOrFirstChild);
    }

    return { tagName, props, children: allChildren }
}

export function render(vnode: VChild, container: HTMLElement) {
    if (vnode == null || vnode == undefined)
        return;

    if (typeof vnode === 'string' || typeof vnode === 'number') {
        container.appendChild(document.createTextNode(vnode.toString()));
        return;
    }

    const element = document.createElement(vnode.tagName);

    for (const [key, value] of Object.entries(vnode.props))
        element.setAttribute(key == 'className' ? 'class' : key, value)

    for (const child of vnode.children)
        render(child, element)

    container.appendChild(element);
}