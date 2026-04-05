import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay } from "date-fns";

export type ScheduleJob = {
  id: string;
  jobber_id: string;
  title: string | null;
  status: string;
  visit_status: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  client_name: string | null;
  client_phone: string | null;
  property_address: string | null;
  assigned_employee_names: string[] | null;
  internal_notes: string | null;
  job_number: string | null;
  service_items: any[] | null;
  total_amount: number | null;
  crew_id: string | null;
  property_id: string | null;
  // Geocoded coordinates
  lat?: number | null;
  lng?: number | null;
  // Route order (local state)
  routeOrder?: number;
};

export function useScheduleJobs(selectedDate: Date) {
  const [jobs, setJobs] = useState<ScheduleJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const dayStart = startOfDay(selectedDate).toISOString();
    const dayEnd = endOfDay(selectedDate).toISOString();

    const { data, error } = await supabase
      .from("jobber_jobs")
      .select("*")
      .gte("scheduled_start", dayStart)
      .lte("scheduled_start", dayEnd)
      .order("scheduled_start", { ascending: true });

    if (!error && data) {
      // Enrich with property coordinates
      const propertyIds = [...new Set(data.filter(j => j.property_id).map(j => j.property_id))];
      let propertyCoords: Record<string, { lat: number; lng: number }> = {};

      if (propertyIds.length > 0) {
        const { data: props } = await supabase
          .from("jobber_properties")
          .select("id, lat, lng")
          .in("id", propertyIds);
        if (props) {
          props.forEach(p => {
            if (p.lat && p.lng) propertyCoords[p.id] = { lat: Number(p.lat), lng: Number(p.lng) };
          });
        }
      }

      // Check geocode cache for addresses without coordinates
      const addressesNeedingGeocode: string[] = [];
      const enriched = data.map((j: any, i: number) => {
        const coords = j.property_id ? propertyCoords[j.property_id] : null;
        if (!coords && j.property_address) {
          addressesNeedingGeocode.push(j.property_address);
        }
        return {
          ...j,
          lat: coords?.lat || null,
          lng: coords?.lng || null,
          routeOrder: i,
          service_items: j.service_items as any[],
        } as ScheduleJob;
      });

      // Check geocode cache
      if (addressesNeedingGeocode.length > 0) {
        const { data: cached } = await supabase
          .from("geocode_cache")
          .select("address, lat, lng, status")
          .in("address", addressesNeedingGeocode)
          .eq("status", "success");

        const cacheMap = new Map((cached || []).map(c => [c.address, c]));
        const stillMissing: string[] = [];

        enriched.forEach(j => {
          if (!j.lat && j.property_address) {
            const c = cacheMap.get(j.property_address);
            if (c && c.lat && c.lng) {
              j.lat = Number(c.lat);
              j.lng = Number(c.lng);
            } else {
              stillMissing.push(j.property_address);
            }
          }
        });

        // Geocode remaining addresses via edge function
        if (stillMissing.length > 0) {
          setGeocoding(true);
          try {
            const { data: geoResult } = await supabase.functions.invoke("geocode", {
              body: { addresses: [...new Set(stillMissing)] },
            });
            if (geoResult?.results) {
              enriched.forEach(j => {
                if (!j.lat && j.property_address && geoResult.results[j.property_address]) {
                  const r = geoResult.results[j.property_address];
                  if (r.status === "success") {
                    j.lat = r.lat;
                    j.lng = r.lng;
                  }
                }
              });
            }
          } catch (e) {
            console.error("Geocoding failed:", e);
          }
          setGeocoding(false);
        }
      }

      setJobs(enriched);
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const crewNames = useMemo(() => {
    const names = new Set<string>();
    jobs.forEach(j => {
      const crew = j.assigned_employee_names?.join(", ") || "Unassigned";
      names.add(crew);
    });
    return [...names];
  }, [jobs]);

  const crewCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach(j => {
      const crew = j.assigned_employee_names?.join(", ") || "Unassigned";
      counts[crew] = (counts[crew] || 0) + 1;
    });
    return counts;
  }, [jobs]);

  const geocodedJobs = useMemo(() => jobs.filter(j => j.lat && j.lng), [jobs]);
  const ungeocodedJobs = useMemo(() => jobs.filter(j => !j.lat || !j.lng), [jobs]);

  return {
    jobs, setJobs, loading, geocoding, fetchJobs,
    crewNames, crewCounts, geocodedJobs, ungeocodedJobs,
  };
}
