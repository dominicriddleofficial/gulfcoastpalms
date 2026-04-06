import { useLocation } from "react-router-dom";
import PlatformLayout from "@/components/platform/PlatformLayout";

const MODULE_LABELS: Record<string, { title: string; description: string }> = {
  "/platform/leads": { title: "Leads", description: "Lead intake, pipeline, and conversion tracking" },
  "/platform/customers": { title: "Customers", description: "Customer and property management" },
  "/platform/quotes": { title: "Quotes", description: "Create, send, and track quotes" },
  "/platform/jobs": { title: "Jobs", description: "Job management and multi-visit tracking" },
  "/platform/schedule": { title: "Schedule", description: "Calendar, dispatch, and route planning" },
  "/platform/invoices": { title: "Invoices", description: "Business-branded invoicing" },
  "/platform/payments": { title: "Payments", description: "Payment recording and deposit tracking" },
  "/platform/analytics": { title: "Analytics", description: "Business performance and reporting" },
  "/platform/communications": { title: "Communications", description: "Email, SMS, and call logs" },
  "/platform/tasks": { title: "Tasks", description: "Internal tasks and follow-ups" },
  "/platform/settings": { title: "Settings", description: "Business settings and configuration" },
};

export default function PlatformModule() {
  const location = useLocation();
  const mod = MODULE_LABELS[location.pathname] || { title: "Module", description: "Coming soon" };

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{mod.title}</h1>
          <p className="font-body text-sm text-muted-foreground">{mod.description}</p>
        </div>
        <div className="bg-card border border-border/50 border-dashed rounded-xl p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
            <span className="font-display text-2xl text-muted-foreground/50">⚡</span>
          </div>
          <h2 className="font-display text-xl text-muted-foreground">Phase 2+</h2>
          <p className="font-body text-sm text-muted-foreground/60 max-w-md mx-auto">
            This module will be built in a future phase. The foundation schema and business-aware architecture are ready.
          </p>
          <span className="inline-block px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-body font-medium">
            Architecture Ready
          </span>
        </div>
      </div>
    </PlatformLayout>
  );
}
