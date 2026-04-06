import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "gcpalms_banner_dismissed";

const SeasonalBanner = () => {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
  });

  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();

  // Show between April 1 (month 3) and November 30 (month 10)
  const inSeason = month >= 3 && month <= 10;

  const { message, link, countdown } = useMemo(() => {
    const juneFirst = new Date(now.getFullYear(), 5, 1); // June 1
    if (month < 5 || (month === 5 && day === 0)) {
      // Before June 1 — countdown
      const diff = Math.ceil((juneFirst.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        message: `🌀 Hurricane Season Starts June 1st — Book Your Palm Prep Now`,
        link: "/emergency-palm-service",
        countdown: diff > 0 ? `${diff} days away` : null,
      };
    }
    return {
      message: "🌀 Hurricane Season is Here — Emergency Palm Service Available",
      link: "/emergency-palm-service",
      countdown: null,
    };
  }, [month, day]);

  if (!inSeason || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
  };

  return (
    <div className="bg-palm-gold text-palm-dark relative z-[60]">
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <p className="font-body font-semibold text-sm truncate">
            {message}
            {countdown && (
              <span className="hidden sm:inline ml-2 font-normal opacity-80">— {countdown}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={link}
            className="px-4 py-1.5 rounded-lg bg-palm-dark text-palm-gold font-body font-bold text-xs uppercase tracking-wider hover:bg-palm-dark/90 transition-colors whitespace-nowrap"
          >
            Schedule Now
          </Link>
          <button
            onClick={dismiss}
            className="p-1 rounded hover:bg-palm-dark/10 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeasonalBanner;
