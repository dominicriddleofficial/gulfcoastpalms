import { useState } from "react";
import { getBusinessLogo } from "@/lib/business-logos";

/**
 * Reusable brand mark for customer-facing quote/invoice/PDF document headers.
 * Renders the business logo at a clean square size; falls back to the
 * shortcode acronym badge only if the image fails to load or no logo is found.
 */
interface Props {
  shortcode: string;
  logoUrl?: string | null;
  accent: string;
  accentRgb: string;
  /** Pixel size of the square logo box. Defaults to 48px. */
  size?: number;
}

export default function DocumentBrandMark({
  shortcode,
  logoUrl,
  accent,
  accentRgb,
  size = 48,
}: Props) {
  const resolved = getBusinessLogo(shortcode || "", logoUrl);
  const [errored, setErrored] = useState(false);
  const showLogo = !!resolved && !errored;

  const boxStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: `rgba(${accentRgb}, 0.12)`,
    border: `1px solid rgba(${accentRgb}, 0.25)`,
    flexShrink: 0,
    overflow: "hidden",
  };

  if (showLogo) {
    return (
      <div style={boxStyle}>
        <img
          src={resolved as string}
          alt={`${shortcode} logo`}
          onError={() => setErrored(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            padding: 4,
            display: "block",
          }}
        />
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      <span
        style={{
          color: accent,
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: "0.05em",
        }}
      >
        {(shortcode || "").toUpperCase()}
      </span>
    </div>
  );
}
