import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { isPrivateRoute } from "./indexing-policy.mjs";

export default function RouteIndexing() {
  const { pathname } = useLocation();
  const privateRoute = isPrivateRoute(pathname);

  useLayoutEffect(() => {
    // Static schema belongs to the initial URL. React now owns page schema;
    // retaining the initial payload would leak it across client navigation.
    document.querySelectorAll('script[data-gcp-prerender]').forEach((tag) => tag.remove());
    if (privateRoute) {
      document.querySelectorAll('link[rel="canonical"], meta[property="og:url"]').forEach((tag) => tag.remove());
    }
  }, [pathname, privateRoute]);

  return privateRoute ? (
    <Helmet>
      <title>Account | Gulf Coast Palms</title>
      <meta name="description" content="Gulf Coast Palms account and customer services." />
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  ) : null;
}
