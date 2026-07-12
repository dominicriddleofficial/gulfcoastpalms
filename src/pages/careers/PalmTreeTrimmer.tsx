import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Loader2, DollarSign, Truck, Sun, TreePalm, GraduationCap, Users, Star, ChevronDown, CheckCircle2, Send } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdge } from "@/lib/invoke-edge";
import { sanitizeText } from "@/lib/validation";

const trimmerSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(100),
  phone: z.string().regex(/^[\d\s\-()+]{7,20}$/, "Valid phone required"),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  years_experience: z.string().min(1, "Select experience"),
  own_truck: z.enum(["yes", "no"], { errorMap: () => ({ message: "Select yes or no" }) }),
  can_tow: z.enum(["yes", "no"], { errorMap: () => ({ message: "Select yes or no" }) }),
  why_good_fit: z.string().trim().max(2000).optional().or(z.literal("")),
  resume_link: z.string().trim().max(500).optional().or(z.literal("")),
});

type FormShape = z.infer<typeof trimmerSchema>;

const EXPERIENCE_OPTIONS = [
  { value: "climber_rigging_removal", label: "Experienced climber — rigging & removals" },
  { value: "climb_trim_learning", label: "Climb & trim, learning rigging" },
  { value: "ground_crew", label: "Tree ground crew experience" },
  { value: "landscape_no_tree", label: "Landscaping/outdoor work — no tree experience yet" },
];

const DEAL_POINTS: Array<{ icon: React.ComponentType<{ className?: string }>; title: string; body: string; emoji: string }> = [
  { icon: DollarSign, emoji: "💰", title: "25% commission on job revenue", body: "You run the job, you earn a real cut. No made-up hourly ceiling." },
  { icon: Truck, emoji: "🚚", title: "Bring your own truck — tow-capable", body: "Bring your own truck — and be able to tow a trailer, or be willing to learn. You'll be hauling our equipment trailer to jobs." },
  { icon: Sun, emoji: "☀️", title: "Handle the Florida sun", body: "Full days outside on the Emerald Coast. Hot, humid, real work." },
  { icon: TreePalm, emoji: "🪜", title: "Trimming experience preferred", body: "Tree/palm trimming experience preferred — solid landscaping experience works too. We train." },
  { icon: GraduationCap, emoji: "📋", title: "Paid training week — $200/day", body: "One full paid week learning exactly how we run jobs before you lead your own." },
  { icon: Users, emoji: "👷", title: "We send $25/hr helpers on big jobs", body: "You run the show. We supply the groundsmen so you focus on the tree work." },
  { icon: Star, emoji: "⭐", title: "Join the #1 rated palm crew", body: "100+ five-star Google reviews on the Emerald Coast. We stay booked out." },
  { icon: DollarSign, emoji: "🪓", title: "Bonus: removal-capable earns more", body: "Can you climb, rig, and drop palms safely? Say so in your application — removal-capable trimmers run our biggest jobs and out-earn trim-only trimmers by a wide margin." },
];

const EARNINGS_ROWS = [
  { day: "Starting out (learning pace) · $800–1,200 days", cut: "$200–300" },
  { day: "At our pace · $1,500 days", cut: "$375" },
  { day: "Strong days · $2,500+", cut: "$625+" },
];

export default function PalmTreeTrimmer() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  const renderTime = useRef(Date.now());
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormShape, string>>>({});
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [values, setValues] = useState<FormShape>({
    full_name: "",
    phone: "",
    email: "",
    city: "",
    years_experience: "",
    own_truck: "" as FormShape["own_truck"],
    can_tow: "" as FormShape["can_tow"],
    why_good_fit: "",
    resume_link: "",
  });

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth" });

  const setField = <K extends keyof FormShape>(key: K, value: FormShape[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const uploadResume = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "pdf";
    const path = `resumes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("applications").upload(path, file);
    if (error) {
      console.error("Resume upload failed:", error);
      return null;
    }
    return path;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const parsed = trimmerSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormShape, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") (fieldErrors as Record<string, string>)[key] = issue.message;
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
    try {
      let resume_url: string | null = null;
      if (resumeFile) resume_url = await uploadResume(resumeFile);

      const { data, error } = await invokeEdge<{ success: boolean; error?: string }>(
        "submit-application",
        {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
          email: parsed.data.email || null,
          city: parsed.data.city || null,
          position: "Palm Tree Trimmer / Team Lead",
          years_experience: parsed.data.years_experience,
          own_truck: parsed.data.own_truck,
          can_tow: parsed.data.can_tow,
          why_good_fit: [
            sanitizeText(parsed.data.why_good_fit || ""),
            parsed.data.resume_link ? `Resume link: ${sanitizeText(parsed.data.resume_link)}` : "",
          ].filter(Boolean).join("\n\n"),
          resume_url,
          acknowledged: true,
          website,
          formRenderTime: renderTime.current,
        },
      );

      if (error || !data?.success) {
        toast({
          title: "Could not submit",
          description: error?.message || data?.error || "Please try again or call (850) 910-1290.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      trackEvent("job_application_submit", { position: "Palm Tree Trimmer" });
      navigate("/careers/thank-you");
    } catch (err) {
      console.error(err);
      toast({
        title: "Something went wrong",
        description: "Please try again or call (850) 910-1290.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <SEOHead
        title="Palm Tree Trimmer / Team Lead — Hiring Now | Gulf Coast Palms"
        description="Run your own palm crew on the Emerald Coast. 25% of every job. $1,500 avg days, $5,000 best days. Paid training week. Must have your own truck."
        canonicalUrl="/careers/palm-tree-trimmer"
      />

      {/* HERO */}
      <section className="relative bg-foreground text-background overflow-hidden">
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-transparent to-palm-gold/20" />
        </div>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-palm-gold/60 to-transparent" />

        <div className="container mx-auto section-padding relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-palm-gold/40 bg-palm-gold/10 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-palm-gold animate-pulse" />
            <span className="font-body text-xs uppercase tracking-[0.25em] text-palm-gold font-semibold">
              Now Hiring · Emerald Coast
            </span>
          </div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-6">
            Palm Tree Trimmer <span className="text-primary">/ Team Lead</span>
          </h1>

          <p className="font-display text-2xl md:text-3xl text-white font-semibold mb-4 leading-tight">
            <span className="text-palm-gold">25%</span> of every job you run.
          </p>
          <p className="font-body text-lg md:text-xl text-white/80 mb-8 max-w-2xl leading-relaxed">
            Run your own jobs for the <span className="text-white font-semibold">#1 rated palm crew on the Emerald Coast</span>.{" "}
            <span className="text-white font-semibold">25% of every job you run</span> — your speed and skill set your pay.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              onClick={scrollToForm}
              className="font-body text-base md:text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-palm-light rounded-xl font-bold"
            >
              Apply Now <ChevronDown className="w-5 h-5 ml-2" />
            </Button>
            <a
              href="tel:8509101290"
              className="inline-flex items-center justify-center px-8 py-6 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-body text-base md:text-lg font-semibold transition-colors"
            >
              Or call (850) 910-1290
            </a>
          </div>
        </div>
      </section>

      {/* THE DEAL */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="font-body text-xs uppercase tracking-[0.25em] text-primary font-semibold mb-3">The Deal</p>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground">
              Real crew leaders wanted.
            </h2>
            <p className="font-body text-base md:text-lg text-muted-foreground mt-3 max-w-2xl mx-auto">
              No fluff. This is what you get, and what we need from you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {DEAL_POINTS.map(({ icon: Icon, title, body, emoji }) => (
              <div
                key={title}
                className="group relative bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
                    <span aria-hidden="true">{emoji}</span>
                    <Icon className="sr-only" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold text-foreground mb-1.5 leading-tight">{title}</h3>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EARNINGS MATH */}
      <section className="section-padding bg-foreground text-background">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <p className="font-body text-xs uppercase tracking-[0.25em] text-palm-gold font-semibold mb-3">Do the Math</p>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white">
              Your pace is your paycheck.
            </h2>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            {EARNINGS_ROWS.map((row, i) => (
              <div
                key={row.day}
                className={`flex items-center justify-between px-6 md:px-10 py-6 ${
                  i > 0 ? "border-t border-white/10" : ""
                }`}
              >
                <div className="font-display text-lg md:text-2xl text-white/80">{row.day}</div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block h-px w-10 bg-palm-gold/40" />
                  <div className="font-display text-2xl md:text-4xl font-bold text-palm-gold">{row.cut}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="font-body text-sm text-white/50 mt-6 text-center max-w-2xl mx-auto">
            These are our real numbers at our speed, built over years in the Florida heat. Most new trimmers start
            slower and build up — how fast you get here is up to you. Removal-capable climbers see the biggest days.
          </p>
        </div>
      </section>

      {/* APPLICATION FORM */}
      <section ref={formRef} id="apply" className="section-padding bg-secondary/30">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <p className="font-body text-xs uppercase tracking-[0.25em] text-primary font-semibold mb-3">Apply</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Get in the truck.</h2>
            <p className="font-body text-muted-foreground mt-3">
              We reach out to serious applicants fast. Takes about 2 minutes.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            noValidate
            className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-5 shadow-lg"
          >
            {/* Honeypot */}
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

            <Field label="Full name" error={errors.full_name} required>
              <Input
                value={values.full_name}
                onChange={(e) => setField("full_name", e.target.value)}
                placeholder="First and last"
                autoComplete="name"
                required
              />
            </Field>

            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Phone" error={errors.phone} required>
                <Input
                  type="tel"
                  value={values.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="(850) 555-1234"
                  autoComplete="tel"
                  required
                />
              </Field>
              <Field label="Email" error={errors.email}>
                <Input
                  type="email"
                  value={values.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Field>
            </div>

            <Field label="City" error={errors.city}>
              <Input
                value={values.city}
                onChange={(e) => setField("city", e.target.value)}
                placeholder="Navarre, Pensacola, Destin…"
                autoComplete="address-level2"
              />
            </Field>

            <Field label="Years of tree / landscape experience" error={errors.years_experience} required>
              <select
                value={values.years_experience}
                onChange={(e) => setField("years_experience", e.target.value)}
                required
                className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select…</option>
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Do you have your own truck?" error={errors.own_truck} required>
              <div className="grid grid-cols-2 gap-3">
                {(["yes", "no"] as const).map((v) => {
                  const active = values.own_truck === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setField("own_truck", v)}
                      className={`h-12 rounded-lg border font-body text-sm font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:border-primary/40"
                      }`}
                    >
                      {active && <CheckCircle2 className="inline w-4 h-4 mr-1.5 -mt-0.5" />}
                      {v === "yes" ? "Yes, I have a truck" : "No"}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Can you tow a trailer?" error={errors.can_tow} required>
              <div className="grid grid-cols-2 gap-3">
                {(["yes", "no"] as const).map((v) => {
                  const active = values.can_tow === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setField("can_tow", v)}
                      className={`h-12 rounded-lg border font-body text-sm font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:border-primary/40"
                      }`}
                    >
                      {active && <CheckCircle2 className="inline w-4 h-4 mr-1.5 -mt-0.5" />}
                      {v === "yes" ? "Yes, I can tow" : "Willing to learn"}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Tell us why you'd make this crew better" error={errors.why_good_fit}>
              <Textarea
                value={values.why_good_fit}
                onChange={(e) => setField("why_good_fit", e.target.value)}
                rows={4}
                placeholder="Experience, leadership, safety, whatever you want us to know."
              />
            </Field>

            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Resume (optional)">
                <label className="flex items-center justify-center h-11 rounded-md border border-dashed border-border bg-background text-sm text-muted-foreground cursor-pointer hover:border-primary/40">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.png"
                    className="hidden"
                    onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                  />
                  {resumeFile ? resumeFile.name : "Upload PDF or DOC"}
                </label>
              </Field>
              <Field label="Or resume link" error={errors.resume_link}>
                <Input
                  type="url"
                  value={values.resume_link}
                  onChange={(e) => setField("resume_link", e.target.value)}
                  placeholder="Google Drive, LinkedIn, etc."
                />
              </Field>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-palm-light font-body font-bold text-base gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" /> Apply — We'll reach out fast
                </>
              )}
            </Button>

            <p className="font-body text-xs text-muted-foreground text-center">
              By submitting you agree we may text or call you about this position at the number provided.
            </p>
          </form>
        </div>
      </section>
    </Layout>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, error, required, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="font-body text-sm font-semibold text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive font-body">{error}</p>}
    </div>
  );
}