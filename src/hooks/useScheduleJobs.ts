import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, format } from "date-fns";

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
  lat?: number | null;
  lng?: number | null;
  routeOrder?: number;
};

export type ScheduleDiagnostics = {
  selectedDate: string;
  queryStart: string;
  queryEnd: string;
  timezone: string;
  jobsFromDb: number;
  jobsGeocoded: number;
  jobsUngeocoded: number;
  fetchDurationMs: number;
  lastFetchAt: string;
};

export function useScheduleJobs(selectedDate: Date) {
  const [jobs, setJobs] = useState<ScheduleJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [diagnostics, setDiagnostics] = useState<ScheduleDiagnostics | null>(null);
  // Race condition guard: only apply results from the latest fetch
  const fetchIdRef = useRef(0);

  const fetchJobs = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;
    const fetchStart = performance.now();
    setLoading(true);

    // Use local timezone boundaries
    const dayStart = startOfDay(selectedDate).toISOString();
    const dayEnd = endOfDay(selectedDate).toISOString();

    console.log(`[Schedule] Fetching jobs for ${format(selectedDate, "yyyy-MM-dd")} | range: ${dayStart} → ${dayEnd} | fetchId: ${currentFetchId}`);

    const { data, error } = await supabase
      .from("jobber_jobs")
      .select("*")
      .gte("scheduled_start", dayStart)
      .lte("scheduled_start", dayEnd)
      .order("scheduled_start", { ascending: true });

    // Stale response guard
    if (currentFetchId !== fetchIdRef.current) {
      console.log(`[Schedule] Discarding stale response fetchId=${currentFetchId}, current=${fetchIdRef.current}`);
      return;
    }

    if (error) {
      console.error("[Schedule] Query error:", error);
      setJobs([]);
      setLoading(false);
      return;
    }

    const rawCount = data?.length ?? 0;
    console.log(`[Schedule] Got ${rawCount} jobs from DB for ${format(selectedDate, "yyyy-MM-dd")}`);

    if (!data || data.length === 0) {
      setJobs([]);
      setDiagnostics({
        selectedDate: format(selectedDate, "yyyy-MM-dd"),
        queryStart: dayStart,
        queryEnd: dayEnd,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        jobsFromDb: 0,
        jobsGeocoded: 0,
        jobsUngeocoded: 0,
        fetchDurationMs: Math.round(performance.now() - fetchStart),
        lastFetchAt: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

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

    // Stale check again after second query
    if (currentFetchId !== fetchIdRef.current) return;

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

      if (currentFetchId !== fetchIdRef.current) return;

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
          if (currentFetchId !== fetchIdRef.current) return;
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
          console.error("[Schedule] Geocoding failed:", e);
        }
        setGeocoding(false);
      }
    }

    // Final stale check before setting state
    if (currentFetchId !== fetchIdRef.current) return;

    const geocoded = enriched.filter(j => j.lat && j.lng).length;
    console.log(`[Schedule] Setting ${enriched.length} jobs (${geocoded} geocoded) for ${format(selectedDate, "yyyy-MM-dd")}`);

    setJobs(enriched);
    setDiagnostics({
      selectedDate: format(selectedDate, "yyyy-MM-dd"),
      queryStart: dayStart,
      queryEnd: dayEnd,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      jobsFromDb: enriched.length,
      jobsGeocoded: geocoded,
      jobsUngeocoded: enriched.length - geocoded,
      fetchDurationMs: Math.round(performance.now() - fetchStart),
      lastFetchAt: new Date().toISOString(),
    });
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
    diagnostics,
  };
}
