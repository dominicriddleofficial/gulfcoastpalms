/**
 * Shared Google Maps customization for the platform schedule.
 *
 * - `darkMapStyle` is a subtle dark theme so the map blends with the platform UI.
 * - `buildNumberedMarkerIcon` returns a Symbol-based marker icon that draws a
 *   green pin with a white number inside, replacing the default red Google
 *   pushpin used by `MarkerF`.
 */

export const darkMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#111827" }] },
];

/**
 * Clean light map style — soft greys, hidden POIs, muted roads. Used by the
 * platform schedule map/route views to keep the focus on numbered job pins.
 */
export const lightMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#424242" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9e7f5" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
];

/**
 * Builds a circular numbered marker. Uses a Google Maps Symbol so it renders
 * crisp at any zoom and respects the marker `label`. Pass overrides to switch
 * to e.g. a larger amber icon for the selected stop.
 */
export function buildNumberedMarkerIcon(
  overrides: Partial<google.maps.Symbol> = {}
): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 14,
    fillColor: "#00C853",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2.5,
    ...overrides,
  };
}

export const NUMBERED_MARKER_LABEL_STYLE = {
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "700",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};