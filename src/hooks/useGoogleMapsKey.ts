import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedKey: string | null = null;

export function useGoogleMapsKey() {
  const [apiKey, setApiKey] = useState<string | null>(cachedKey);
  const [loading, setLoading] = useState(!cachedKey);

  useEffect(() => {
    if (cachedKey) return;
    supabase.functions.invoke("maps-config").then(({ data, error }) => {
      if (!error && data?.apiKey) {
        cachedKey = data.apiKey;
        setApiKey(data.apiKey);
      }
      setLoading(false);
    });
  }, []);

  return { apiKey, loading };
}
