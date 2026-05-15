let loaderPromise: Promise<typeof google> | null = null;

/**
 * Lazily loads the Google Maps JS SDK with the `places` library.
 * Resolves with `window.google` once available. Safe to call multiple times.
 */
export function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("window unavailable"));
  if ((window as any).google?.maps?.places) return Promise.resolve((window as any).google);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const cb = `__gm_cb_${Math.random().toString(36).slice(2)}`;
    (window as any)[cb] = () => {
      delete (window as any)[cb];
      resolve((window as any).google);
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async&callback=${cb}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      loaderPromise = null;
      reject(new Error("Failed to load Google Maps SDK"));
    };
    document.head.appendChild(s);
  });
  return loaderPromise;
}

export interface VerifiedAddress {
  formatted_address: string;
  street_number: string | null;
  route: string | null;
  street_address: string; // street_number + route, or first line
  city: string;
  state: string;
  postal_code: string;
  county: string | null;
  country: string;
  place_id: string;
  latitude: number;
  longitude: number;
  verified: true;
  geocode_source: "google_places";
}

export function placeToVerifiedAddress(p: google.maps.places.PlaceResult): VerifiedAddress | null {
  if (!p?.geometry?.location || !p.place_id) return null;
  const get = (type: string, short = false): string => {
    const c = (p.address_components || []).find((c) => c.types.includes(type));
    return (short ? c?.short_name : c?.long_name) || "";
  };
  const street_number = get("street_number") || null;
  const route = get("route") || null;
  const city = get("locality") || get("postal_town") || get("sublocality") || "";
  const state = get("administrative_area_level_1", true);
  const county = get("administrative_area_level_2") || null;
  const postal_code = get("postal_code");
  const country = get("country", true) || "US";
  return {
    formatted_address: p.formatted_address || "",
    street_number,
    route,
    street_address: [street_number, route].filter(Boolean).join(" ").trim() ||
      (p.formatted_address || "").split(",")[0] ||
      "",
    city,
    state: state || "FL",
    postal_code,
    county,
    country,
    place_id: p.place_id,
    latitude: p.geometry.location.lat(),
    longitude: p.geometry.location.lng(),
    verified: true,
    geocode_source: "google_places",
  };
}