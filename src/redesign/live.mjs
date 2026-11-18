/**
 * The one switch that puts the redesigned site on the real public addresses.
 *
 * false: the redesign shows only under the hidden preview address, and every real page
 *        (its layout, its title, its description, the copy search engines read) is
 *        exactly what it is today.
 * true:  the redesign is the site.
 *
 * Plain JavaScript so the SEO route table (src/seo/routes.data.mjs), which the build
 * scripts load directly, can read it as well as the app.
 */
export const REDESIGN_LIVE = false;
