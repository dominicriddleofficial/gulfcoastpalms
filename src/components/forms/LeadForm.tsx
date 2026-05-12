import { useEffect, useRef, useState, FormEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Send } from "lucide-react";
import { z, ZodTypeAny, infer as zInfer } from "zod";
import { submitLead, LeadData } from "@/lib/submit-lead";
import { trackEvent } from "@/lib/analytics";
import { toast } from "@/hooks/use-toast";

export interface LeadFormFieldRender<T> {
  values: T;
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  errors: Partial<Record<keyof T, string>>;
  submitting: boolean;
}

export interface LeadFormProps<S extends ZodTypeAny> {
  /** Zod schema describing the form values. */
  schema: S;
  /** Initial form values matching the schema. */
  defaultValues: zInfer<S>;
  /** Maps validated form values → submit-lead payload. */
  toLead: (values: zInfer<S>) => LeadData;
  /** GA event source label (e.g. "quote_request_page", "emergency_form"). */
  source: string;
  /** Optional GA event names fired on lifecycle. */
  startEvent?: string;
  successEvent?: string;
  /** Where to navigate after a successful submit. Default: "/thank-you". */
  redirectTo?: string | null;
  /** Render prop for the actual fields. */
  children: (ctx: LeadFormFieldRender<zInfer<S>>) => ReactNode;
  /** Submit button label. */
  submitLabel?: string;
  className?: string;
  onSuccess?: (values: zInfer<S>) => void;
}

/**
 * Reusable lead-capture form primitive.
 *
 * Handles:
 *   - Zod validation
 *   - honeypot + render-time anti-spam
 *   - submit-lead.ts integration (UTM capture is automatic there)
 *   - GA4 lifecycle events (start / submit / success)
 *   - success/error UI + redirect
 *
 * Consumers only describe their fields via the `children` render prop.
 */
export function LeadForm<S extends ZodTypeAny>({
  schema,
  defaultValues,
  toLead,
  source,
  startEvent,
  successEvent,
  redirectTo = "/thank-you",
  children,
  submitLabel = "Submit",
  className,
  onSuccess,
}: LeadFormProps<S>) {
  type Values = zInfer<S>;
  const navigate = useNavigate();
  const renderTime = useRef(Date.now());
  const [values, setValues] = useState<Values>(defaultValues);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  useEffect(() => {
    if (startEvent) trackEvent(startEvent, { source });
  }, [startEvent, source]);

  const setField = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof Values, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" || typeof key === "number") {
          (fieldErrors as Record<string, string>)[String(key)] = issue.message;
        }
      }
      setErrors(fieldErrors);
      toast({
        title: "Please check the form",
        description: parsed.error.issues[0]?.message ?? "Some fields need attention.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const payload: LeadData = {
      ...toLead(parsed.data),
      source: toLead(parsed.data).source ?? source,
      website,
      formRenderTime: renderTime.current,
    };

    const result = await submitLead(payload);
    if (result.success) {
      if (successEvent) trackEvent(successEvent, { source });
      onSuccess?.(parsed.data);
      if (redirectTo) navigate(redirectTo);
      else setSubmitting(false);
    } else {
      toast({
        title: "Could not submit",
        description: result.error ?? "Please try again or call us directly.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className={className} noValidate>
      {/* Honeypot — keep visually hidden, must remain empty for real users */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      {children({ values, setField, errors, submitting })}

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-body font-bold text-base hover:bg-palm-light transition-colors disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Submitting…
          </>
        ) : (
          <>
            <Send className="w-5 h-5" /> {submitLabel}
          </>
        )}
      </button>
    </form>
  );
}

/** Convenience re-export so consumers don't need a separate zod import for inference. */
export type { ZodTypeAny } from "zod";
export { z };