import { useParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export default function PaymentSuccess() {
  const { shortcode } = useParams();
  const isGcp = shortcode?.toLowerCase() !== "pps";
  const accent = isGcp ? "#22c55e" : "#ffffff";
  const accentRgb = isGcp ? "34, 197, 94" : "255, 255, 255";
  const name = isGcp ? "Gulf Coast Palms" : "Prestige Property Services";

  const pageBg = `radial-gradient(ellipse 70% 45% at 50% 0%, rgba(${accentRgb}, 0.22) 0%, rgba(${accentRgb}, 0.07) 45%, transparent 70%), radial-gradient(ellipse 35% 25% at 10% 50%, rgba(${accentRgb}, 0.09) 0%, transparent 60%), #080d08`;

  return (
    <div style={{ background: pageBg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter', sans-serif" }}>
      <div style={{
        maxWidth: 440, width: "100%", textAlign: "center",
        background: "rgba(255,255,255,0.04)",
        border: `1px solid rgba(${accentRgb}, 0.20)`,
        borderRadius: 20, padding: "48px 32px",
        boxShadow: `0 0 60px rgba(${accentRgb}, 0.08), 0 24px 48px rgba(0,0,0,0.4)`,
      }}>
        <CheckCircle className="mx-auto mb-5" style={{ width: 64, height: 64, color: accent }} />
        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Payment Received</h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Thank you for your payment. A receipt has been sent to your email.
        </p>
        <div style={{ borderTop: `1px solid rgba(${accentRgb}, 0.12)`, paddingTop: 20 }}>
          <p style={{ color: "rgba(255,255,255,0.30)", fontSize: 12 }}>Thank you for choosing {name}</p>
        </div>
        <p style={{ color: "rgba(255,255,255,0.20)", fontSize: 11, marginTop: 16 }}>You may close this page.</p>
      </div>
    </div>
  );
}
