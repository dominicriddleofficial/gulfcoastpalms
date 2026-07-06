import { Phone, MessageSquare } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { TEL_HREF, SMS_HREF } from "@/lib/business-info";

const StickyContactBar = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-primary flex">
      <a
        href={TEL_HREF}
        onClick={() => {
          trackEvent("sticky_bar_call_click", { source: "sticky_bar" });
          trackEvent("call_now_click", { source: "sticky_bar", click_location: "sticky_bar" });
        }}
        className="flex-1 flex items-center justify-center gap-2 py-4 text-primary-foreground font-body font-semibold text-sm border-r border-primary-foreground/20"
      >
        <Phone className="w-5 h-5" />
        Call Now
      </a>
      <a
        href={SMS_HREF}
        onClick={() => {
          trackEvent("sticky_bar_text_click", { source: "sticky_bar" });
          trackEvent("text_us_click", { source: "sticky_bar" });
        }}
        className="flex-1 flex items-center justify-center gap-2 py-4 text-primary-foreground font-body font-semibold text-sm"
      >
        <MessageSquare className="w-5 h-5" />
        Text Us a Photo
      </a>
    </div>
  );
};

export default StickyContactBar;
