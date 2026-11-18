/// <reference types="vite/client" />

// vite-imagetools: allow imports of optimized images via the @img/ alias.
// Usage: import job1 from "@img/gallery/job-1.jpeg?format=webp&w=800";
declare module "@img/*" {
  const src: string;
  export default src;
}

// Build-time identifier injected by Vite `define` in vite.config.ts.
declare const __BUILD_ID__: string;

// vite-imagetools picture output (several sizes and formats from one source file).
// Usage: import photo from "@/assets/redesign/x.jpg?w=480;960&format=avif;webp;jpg&as=picture";
declare module "*&as=picture" {
  const picture: import("@/redesign/components/Photo").Picture;
  export default picture;
}
