# Public website SEO

The route table in `src/seo/routes.data.mjs` controls runtime metadata, prerendered metadata, the known-route fallback guard, and the XML sitemap. Add every new public content route there. Dynamic article and guide routes also need explicit entries. Use `canonicalPath` for aliases and `noindex: true` for utility pages.

Run `npm run build` to generate static HTML and run the SEO validation gate. It checks every emitted page for titles, descriptions, canonical URLs, robots directives, headings, internal links, JSON-LD, sitemap membership, and fallback behavior. Run `npm run seo:check` against an existing build. The gate stops deployment builds when a content page is missing from the route table.

`src/seo/staticContent.ts` must match visible marketing copy. Data-driven services, cities, guides, articles, and FAQs share the page data modules. Inline landing-page text currently has explicit static copies; update both when editing those pages. Do not put customer, quote, invoice, or CRM data into prerendered content.

`SEOHead` reads the shared route table. Initial HTML head tags use `data-rh` so Helmet replaces them during navigation rather than leaving competing descriptions or canonicals. `RouteIndexing` removes initial structured data when React takes over and adds noindex to internal app/customer routes.

The business schema is shared in `src/seo/businessSchema.ts`. Service-area pages reference one business, not fictitious offices. Do not infer business coordinates or precise hours from city data. Google does not grant LocalBusiness review snippets for self-serving reviews. Visible customer reviews remain on the website.

The commercial alias `/commercial-palm-tree-services` uses `/commercial` as canonical and is excluded from the sitemap. Payment and thank-you pages are also excluded. The public `/quote` page is indexable; customer-specific `/quote/*` pages are not. Robots exclusions are crawl hints, not authorization controls.

The hosting platform's SPA fallback may still return HTTP 200 for unknown URLs. The early guard and React not-found page supply noindex and remove the homepage canonical. `dist/404.html` is also generated; a true HTTP 404 requires hosting support.

## Validation for the September 2026 update

- Production build: 68 HTML routes; 64 canonical, indexable sitemap URLs.
- SEO gate: passed across every generated route.
- SEO metadata/navigation tests: 6 passed.
- Targeted ESLint: passed.
- Existing full-suite issues observed: review badge test expects 100 while existing data contains 118; offline filter suite requires America/Chicago but the execution environment used America/New_York. Neither is caused by this change.
- No customer/database writes or third-party form submissions were used for validation.

After publishing, verify the raw HTML and rendered pages. Search Console indexing/ranking changes are not established by build checks and must be observed separately.
