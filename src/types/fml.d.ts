declare module "*.fml" {
  const content: () => HTMLElement; // or define a proper type if you know the shape
  export default content;
}
