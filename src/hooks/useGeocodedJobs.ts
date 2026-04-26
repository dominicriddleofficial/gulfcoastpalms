import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GeocodedAddress = { lat: number; lng: number };

/**
 * Resolves a list of addresses to coordinates.
 * 1. Reads cached successes from `geocode_cache`.
 * 2. Calls the `geocode` edge function for any missing addresses (which itself caches).
 */
export function useGeocodedAddresses(addresses: string[]) {
  const [coords, setCoords] = useState<Record<string, GeocodedAddress>>({});
  const [loading, setLoading] = useState(false);

  // Stable signature to drive effect
  const key = [...new Set(addresses.filter(Boolean))].sort().join("|");

  useEffect(() => {
    let cancelled = false;
    const unique = [...new Set(addresses.filter(Boolean))];
    if (unique.length === 0) {
      setCoords({});
      return;
    }

    (async () => {
      setLoading(true);
      const next: Record<string, GeocodedAddress> = {};

      // 1. Read cache first
      const { data: cached } = await supabase
        .from("geocode_cache")
        .select("address, lat, lng, status")
        .in("address", unique)
        .eq("status", "success");

      const cachedAddresses = new Set<string>();
      (cached ?? []).forEach((row: any) => {
        if (row.lat != null && row.lng != null) {
          next[row.address] = { lat: Number(row.lat), lng: Number(row.lng) };
          cachedAddresses.add(row.address);
        }
      });

      const missing = unique.filter((a) => !cachedAddresses.has(a));

      // 2. Geocode missing via edge function (batches of 25)
      if (missing.length > 0) {
        for (let i = 0; i < missing.length; i += 25) {
          const batch = missing.slice(i, i + 25);
          try {
            const { data } = await supabase.functions.invoke("geocode", { body: { addresses: batch } });
            if (data?.results) {
              Object.entries(data.results).forEach(([addr, r]: [string, any]) => {
                if (r?.status === "success" && r.lat != null && r.lng != null) {
                  next[addr] = { lat: Number(r.lat), lng: Number(r.lng) };
                }
              });
            }
          } catch (e) {
            console.error("[useGeocodedAddresses] geocode failed", e);
          }
        }
      }

      if (!cancelled) {
        setCoords(next);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { coords, loading };
}