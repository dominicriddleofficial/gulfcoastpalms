import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Navigation, MapPin, Play, CheckCircle2, Camera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface JobStatusProgressProps {
  jobId: string;
  businessId: string | null;
  clientName: string | null;
  clientPhone: string | null;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

const STEPS = [
  { key: "on_my_way", label: "On My Way", icon: Navigation, color: "text-blue-400" },
  { key: "on_site", label: "On Site", icon: MapPin, color: "text-amber-400" },
  { key: "in_progress", label: "In Progress", icon: Play, color: "text-orange-400" },
  { key: "complete", label: "Complete", icon: CheckCircle2, color: "text-green-400" },
] as const;

type StepKey = typeof STEPS[number]["key"];

function mapStatusToStep(status: string): number {
  const s = status.toLowerCase().replace(/\s+/g, "_");
  const idx = STEPS.findIndex(step => s.includes(step.key) || s === step.key);
  if (s === "completed" || s === "complete") return 3;
  return idx >= 0 ? idx : -1;
}

export default function JobStatusProgress({ jobId, businessId, clientName, clientPhone, currentStatus, onStatusChange }: JobStatusProgressProps) {
  const currentStep = mapStatusToStep(currentStatus);
  const [updating, setUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoType, setPhotoType] = useState<"before" | "after">("before");

  const advanceTo = async (stepIndex: number) => {
    const step = STEPS[stepIndex];
    if (!step) return;
    setUpdating(true);

    try {
      // Update job status
      const statusMap: Record<StepKey, string> = {
        on_my_way: "on_my_way",
        on_site: "on_site",
        in_progress: "in_progress",
        complete: "completed",
      };
      const newStatus = statusMap[step.key];
      await supabase.from("jobber_jobs").update({ visit_status: newStatus }).eq("id", jobId);

      // Persist timestamps so the live visit timer + completed duration work
      if (businessId && (step.key === "in_progress" || step.key === "complete" || step.key === "on_my_way" || step.key === "on_site")) {
        const nowIso = new Date().toISOString();
        const patch: {
          on_my_way_at?: string;
          arrived_at?: string;
          started_at?: string;
          completed_at?: string;
        } = {};
        if (step.key === "on_my_way") patch.on_my_way_at = nowIso;
        if (step.key === "on_site") patch.arrived_at = nowIso;
        if (step.key === "in_progress") patch.started_at = nowIso;
        if (step.key === "complete") patch.completed_at = nowIso;

        const { data: existing } = await supabase
          .from("job_visit_events")
          .select("id, started_at")
          .eq("jobber_job_id", jobId)
          .maybeSingle();
        if (existing) {
          // Don't overwrite an existing started_at on later transitions
          const safePatch: typeof patch = { ...patch };
          if (step.key !== "in_progress" && existing.started_at) delete safePatch.started_at;
          await supabase.from("job_visit_events").update(safePatch).eq("id", existing.id);
        } else {
          await supabase.from("job_visit_events").insert({
            jobber_job_id: jobId,
            business_id: businessId,
            ...patch,
          });
        }
      }

      // Step-specific actions
      if (step.key === "on_site") {
        setPhotoType("before");
        fileInputRef.current?.click();
      } else if (step.key === "complete") {
        setPhotoType("after");
        fileInputRef.current?.click();

        // Schedule review request
        if (clientPhone && businessId) {
          const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
          await supabase.from("review_requests").insert({
            job_id: jobId,
            business_id: businessId,
            customer_name: clientName,
            customer_phone: clientPhone,
            scheduled_for: scheduledFor,
            status: "pending",
          });
          toast.success(`Job complete! Review request scheduled for ${clientName || "customer"}`);
        } else {
          toast.success("Job marked complete!");
        }
      } else {
        toast.success(`Status → ${step.label}`);
      }

      onStatusChange?.(newStatus);
    } catch (e) {
      toast.error("Failed to update status");
    }
    setUpdating(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${jobId}/${photoType}.${ext}`;

    const { error } = await supabase.storage.from("job-photos").upload(path, file, { upsert: true });
    if (error) {
      toast.error(`Photo upload failed: ${error.message}`);
    } else {
      toast.success(`${photoType === "before" ? "Before" : "After"} photo uploaded`);
    }
    setUploadingPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const nextStepIndex = currentStep + 1;
  const nextStep = nextStepIndex < STEPS.length ? STEPS[nextStepIndex] : null;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isComplete = idx <= currentStep;
          const isCurrent = idx === currentStep;
          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className={cn(
                "flex flex-col items-center gap-0.5 flex-1",
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                  isComplete ? "bg-primary border-primary" : "border-border bg-card",
                  isCurrent && "ring-2 ring-primary/30"
                )}>
                  <Icon className={cn("w-4 h-4", isComplete ? "text-primary-foreground" : "text-muted-foreground")} />
                </div>
                <span className={cn(
                  "font-body text-[9px] text-center leading-tight",
                  isComplete ? "text-primary font-medium" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn("h-0.5 flex-1 -mt-3 mx-0.5", idx < currentStep ? "bg-primary" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Action button */}
      {nextStep && (
        <Button
          onClick={() => advanceTo(nextStepIndex)}
          disabled={updating}
          className="w-full font-body text-sm h-12"
          size="lg"
        >
          {updating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <nextStep.icon className="w-4 h-4 mr-2" />
          )}
          {updating ? "Updating…" : nextStep.label}
        </Button>
      )}

      {currentStep >= 3 && (
        <div className="text-center py-2">
          <p className="font-body text-sm text-green-400 font-medium flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Job Complete
          </p>
        </div>
      )}

      {/* Photo upload */}
      {uploadingPhoto && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
          <Loader2 className="w-3 h-3 animate-spin" /> Uploading photo…
        </div>
      )}

      {/* Manual photo buttons */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 font-body text-[10px] h-7"
          onClick={() => { setPhotoType("before"); fileInputRef.current?.click(); }}>
          <Camera className="w-3 h-3 mr-1" /> Before Photo
        </Button>
        <Button size="sm" variant="outline" className="flex-1 font-body text-[10px] h-7"
          onClick={() => { setPhotoType("after"); fileInputRef.current?.click(); }}>
          <Camera className="w-3 h-3 mr-1" /> After Photo
        </Button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
    </div>
  );
}
