/// <reference types="vite/client" />

// vite-imagetools: allow imports of optimized images via the @img/ alias.
// Usage: import job1 from "@img/gallery/job-1.jpeg?format=webp&w=800";
declare module "@img/*" {
  const src: string;
  export default src;
}
