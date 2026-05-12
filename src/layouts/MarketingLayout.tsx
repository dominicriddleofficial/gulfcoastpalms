import { Outlet } from "react-router-dom";
import Layout from "@/components/Layout";

/**
 * Route-level wrapper that renders the marketing chrome (Navbar, Footer,
 * StickyContactBar, lazy ChatWidget, SeasonalBanner) once and lets nested
 * routes provide just their page content via `<Outlet />`.
 *
 * Adoption is incremental: pages that still render `<Layout>` themselves
 * keep working — `Layout` is idempotent in practice because Navbar/Footer
 * are sticky/fixed singletons and double-mounting them in a route tree
 * would be visually obvious. New marketing pages should be added under a
 * `<Route element={<MarketingLayout />}>` parent and skip `<Layout>`.
 */
export default function MarketingLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}