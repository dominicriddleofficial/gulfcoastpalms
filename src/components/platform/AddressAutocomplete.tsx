import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGoogleMapsKey } from "@/hooks/useGoogleMapsKey";
import { loadGoogleMaps, placeToVerifiedAddress, type VerifiedAddress } from "@/lib/google-maps-loader";
import { AlertTriangle, CheckCircle2, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type { VerifiedAddress } from "@/lib/google-maps-loader";

// NW Florida bias — Pensacola center, ~80km radius covers Perdido Key → 30A.
const NW_FL_CENTER = { lat: 30.4213, lng: -87.2169 };
const NW_FL_RADIUS_M = 80_000;

interface Props {
  value: string;
  onTextChange: (v: string) => void;
  onSelect: (addr: VerifiedAddress) => void;
  /** Called when user manually edits text after a selection — clears verified state in parent. */
  onUnverify?: () => void;
  verified?: boolean;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  /** If supplied, will warn when geocoded city differs from this. */
  expectedCity?: string;
}

export default function AddressAutocomplete({
  value,
  onTextChange,
  onSelect,
  onUnverify,
  verified,
  label,
  placeholder = "Start typing an address…",
  required,
  className,
  inputClassName,
  expectedCity,
}: Props) {
  const { apiKey } = useGoogleMapsKey();
  const [ready, setReady] = useState(false);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [loadingPick, setLoadingPick] = useState(false);
  const [open, setOpen] = useState(false);
  const [mismatch, setMismatch] = useState<string | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const autoSvcRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesSvcRef = useRef<google.maps.places.PlacesService | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const wasVerifiedRef = useRef(!!verified);

  // Load SDK when key arrives
  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then((g) => {
        if (cancelled) return;
        autoSvcRef.current = new g.maps.places.AutocompleteService();
        const div = document.createElement("div");
        placesSvcRef.current = new g.maps.places.PlacesService(div);
        sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
        setReady(true);
      })
      .catch((e) => console.warn("[AddressAutocomplete] SDK load failed", e));
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // Debounced predictions
  useEffect(() => {
    if (!ready || !autoSvcRef.current) return;
    const q = value.trim();
    if (q.length < 3) {
      setPredictions([]);
      return;
    }
    const t = setTimeout(() => {
      autoSvcRef.current!.getPlacePredictions(
        {
          input: q,
          sessionToken: sessionTokenRef.current!,
          componentRestrictions: { country: "us" },
          locationBias: { center: NW_FL_CENTER, radius: NW_FL_RADIUS_M } as any,
          types: ["address"],
        },
        (res) => {
          setPredictions(res || []);
        },
      );
    }, 180);
    return () => clearTimeout(t);
  }, [value, ready]);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleText = (v: string) => {
    onTextChange(v);
    setOpen(true);
    setMismatch(null);
    if (wasVerifiedRef.current) {
      wasVerifiedRef.current = false;
      onUnverify?.();
    }
  };

  const handlePick = (p: google.maps.places.AutocompletePrediction) => {
    if (!placesSvcRef.current) return;
    setLoadingPick(true);
    placesSvcRef.current.getDetails(
      {
        placeId: p.place_id,
        sessionToken: sessionTokenRef.current!,
        fields: ["address_components", "formatted_address", "geometry", "place_id"],
      },
      (place, status) => {
        setLoadingPick(false);
        // Refresh session token after a getDetails completes (Google billing convention)
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return;
        const verified = placeToVerifiedAddress(place);
        if (!verified) return;
        if (
          expectedCity &&
          verified.city &&
          expectedCity.trim().toLowerCase() !== verified.city.trim().toLowerCase()
        ) {
          setMismatch(
            `Geocoded city "${verified.city}" doesn't match "${expectedCity}". Please confirm.`,
          );
        }
        onTextChange(verified.formatted_address);
        wasVerifiedRef.current = true;
        onSelect(verified);
        setOpen(false);
        setPredictions([]);
      },
    );
  };

  const showDropdown = open && predictions.length > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && (
        <Label className="text-foreground/90 text-xs font-medium mb-1.5 block">
          {label} {required && "*"}
        </Label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => handleText(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={ready ? placeholder : "Loading address search…"}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showDropdown}
          className={cn("pl-9 pr-9", inputClassName)}
        />
        {loadingPick ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        ) : verified ? (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" aria-label="Verified address" />
        ) : value.trim().length > 3 ? (
          <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" aria-label="Unverified address" />
        ) : null}
      </div>
      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
        >
          {predictions.map((p) => (
            <li
              key={p.place_id}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                handlePick(p);
              }}
              className="px-3 py-3 cursor-pointer hover:bg-secondary/60 active:bg-secondary border-b border-border/40 last:border-b-0"
            >
              <div className="text-sm text-foreground leading-tight">
                {p.structured_formatting?.main_text || p.description}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {p.structured_formatting?.secondary_text || ""}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!verified && value.trim().length > 0 && !showDropdown && ready && (
        <p className="mt-1.5 text-[11px] text-amber-500/90 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Address not verified — map pin may be inaccurate.
        </p>
      )}
      {mismatch && (
        <p className="mt-1.5 text-[11px] text-amber-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {mismatch}
        </p>
      )}
    </div>
  );
}