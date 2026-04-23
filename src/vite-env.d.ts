/// <reference types="vite/client" />

// vite-imagetools: allow imports with query strings like ?format=webp&w=800
// TS module patterns only support one wildcard, so we match the full suffix.
declare module "*&format=webp*" {
  const src: string;
  export default src;
}
declare module "*?format=webp*" {
  const src: string;
  export default src;
}
