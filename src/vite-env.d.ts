/// <reference types="vite/client" />
/// <reference types="vite-imagetools/client" />

// Allow imports of image assets with vite-imagetools query strings (?format=webp&w=...)
declare module "*.jpeg?*" {
  const src: string;
  export default src;
}
declare module "*.jpg?*" {
  const src: string;
  export default src;
}
declare module "*.png?*" {
  const src: string;
  export default src;
}
