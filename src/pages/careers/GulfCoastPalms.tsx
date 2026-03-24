import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronDown, Truck, Users, Shield, Wrench, Clock, TrendingUp,
  CheckCircle, MapPin, Upload, Mic, Star, Headphones
} from "lucide-react";

const POSITIONS = ["Team Leader", "Groundsman", "Sales & Operations Coordinator", "Open to Best Fit"] as const;

const GulfCoastPalmsCareers = () => {
  const formRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    age: "",
    phone: "",
    email: "",
    city: "",
    position: "",
    has_transportation: "",
    has_experience: "",
    work_experience: "",
    comfortable_outdoors: "",
    why_good_fit: "",
    best_contact_time: "",
    acknowledged: false,
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const uploadFile = async (file: File, prefix: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("applications").upload(path, file);
    if (error) { console.error("Upload error:", error); return null; }
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.phone || !form.position || !form.acknowledged) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      let resume_url: string | null = null;
      let voice_note_url: string | null = null;

      if (resumeFile) resume_url = await uploadFile(resumeFile, "resumes");
      if (voiceFile) voice_note_url = await uploadFile(voiceFile, "voice-notes");

      const { error } = await supabase.from("job_applications").insert({
        full_name: form.full_name,
        age: form.age ? parseInt(form.age) : null,
        phone: form.phone,
        email: form.email || null,
        city: form.city || null,
        position: form.position,
        has_transportation: form.has_transportation === "yes",
        has_experience: form.has_experience || null,
        work_experience: form.work_experience || null,
        comfortable_outdoors: form.comfortable_outdoors === "yes",
        why_good_fit: form.why_good_fit || null,
        resume_url,
        voice_note_url,
        best_contact_time: form.best_contact_time || null,
        acknowledged: form.acknowledged,
      });

      if (error) throw error;

      navigate("/careers/thank-you");
    } catch (err) {
      console.error(err);
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="relative bg-foreground text-background overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent" />
        </div>
        <div className="container mx-auto section-padding relative z-10 text-center max-w-4xl">
          <p className="font-body text-sm uppercase tracking-[0.2em] text-primary mb-4 font-semibold">Now Hiring</p>
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 text-white">
            Join the Gulf Coast Palms Team
          </h1>
          <p className="font-body text-lg md:text-xl text-white/70 mb-4 max-w-2xl mx-auto">
            Work with a fast-growing local palm tree trimming company that values speed, quality, safety, and professionalism.
          </p>
          <p className="font-body text-base text-white/60 mb-10 max-w-2xl mx-auto">
            We are looking for dependable, hard-working people who can help us run efficient, high-quality palm tree trimming jobs. This is a real opportunity for someone who wants to work, grow, and become a key part of a serious company.
          </p>
          <Button
            size="lg"
            onClick={scrollToForm}
            className="font-body text-lg px-10 py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
          >
            Apply Now <ChevronDown className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Compensation */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
            What We Offer
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: TrendingUp, title: "Competitive Pay", desc: "Hourly pay based on position and experience. Groundsman positions typically start around $20/hr in the first month and can move up to $25/hr. Operations roles offer performance-based upside." },
              { icon: Star, title: "Room to Grow", desc: "Strong opportunity to grow into a bigger leadership role over time — in the field or on the operations side." },
              { icon: Shield, title: "Performance Matters", desc: "Efficiency, reliability, and work ethic are what get you ahead here — not just showing up." },
              { icon: Clock, title: "Real Opportunity", desc: "This isn't a dead-end gig. If you want to build something real and become a key part of a serious company, this is the place." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card border border-border rounded-xl p-6 flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">{title}</h3>
                  <p className="font-body text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Positions */}
      <section className="section-padding bg-secondary/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">
            Positions We're Hiring For
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Team Leader */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="bg-foreground p-5">
                <div className="flex items-center gap-3">
                  <Truck className="w-6 h-6 text-primary" />
                  <h3 className="font-display text-xl font-bold text-white">Team Leader</h3>
                </div>
              </div>
              <ul className="p-6 space-y-3">
                {[
                  "Drives the truck and trailer",
                  "Leads the crew in the field",
                  "Talks to the customer on arrival and confirms scope",
                  "Keeps the job moving efficiently",
                  "Protects the property",
                  "Manages trailer flow, cleanup, and final walkthrough",
                  "Handles tools, batteries, chargers, and equipment",
                  "Makes sure nothing gets left behind",
                ].map((item) => (
                  <li key={item} className="flex gap-3 items-start font-body text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Groundsman */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="bg-foreground p-5">
                <div className="flex items-center gap-3">
                  <Wrench className="w-6 h-6 text-primary" />
                  <h3 className="font-display text-xl font-bold text-white">Groundsman</h3>
                </div>
              </div>
              <ul className="p-6 space-y-3">
                {[
                  "Helps the climber and team leader from the ground",
                  "Drags brush and palm limbs",
                  "Builds piles efficiently",
                  "Helps load the trailer the right way",
                  "Helps protect the property",
                  "Helps hold ladders when needed",
                  "Keeps batteries, chargers, tools, and cleanup organized",
                  "Works with pace and awareness",
                ].map((item) => (
                  <li key={item} className="flex gap-3 items-start font-body text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* What We Look For */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
            What We're Looking For
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {[
              "Dependable", "Hard-working", "Local", "Strong work ethic",
              "Physically capable", "Quick to learn", "Works safely",
              "Follows direction", "Situational awareness", "Moves with purpose",
              "Clean appearance", "Reliable transportation",
            ].map((trait) => (
              <div key={trait} className="flex items-center gap-2 font-body text-sm text-foreground bg-secondary/50 rounded-lg px-4 py-3">
                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                {trait}
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <p className="font-body text-muted-foreground">
              <span className="font-semibold text-foreground">For field roles:</span> Experience in tree work, landscaping, trailers, ladders, saws, cleanup, or outdoor labor goes a long way.
            </p>
            <p className="font-body text-muted-foreground">
              <span className="font-semibold text-foreground">For Sales & Operations:</span> Experience in customer service, scheduling, dispatch, sales, office/admin, or service business operations is a strong plus.
            </p>
            <p className="font-body text-muted-foreground">
              That said, we're still open to the right person if they have the <span className="font-semibold text-foreground">attitude, discipline, and work ethic</span> to learn.
            </p>
          </div>
        </div>
      </section>

      {/* Why These Roles Matter */}
      <section className="section-padding bg-foreground text-white">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">Why These Roles Matter</h2>
          <p className="font-body text-lg text-white/70 mb-4">
            Whether you're in the field or running operations, every role here directly impacts how well we serve customers and how fast we grow. Field crews keep jobs efficient and protect customer property. Operations keeps the front end organized, leads flowing, and customers happy.
          </p>
          <p className="font-body text-lg text-white/70">
            The right person in any of these roles can become a <span className="text-primary font-semibold">major asset</span> in the company over time.
          </p>
        </div>
      </section>

      {/* Culture */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">Our Standards</h2>
          <p className="font-body text-lg text-muted-foreground">
            We move fast, work hard, protect customer property, and take pride in doing clean, professional work. If you're dependable, coachable, and want to grow with a serious company — this could be a strong fit.
          </p>
        </div>
      </section>

      {/* Application Form */}
      <section className="section-padding bg-secondary/30" ref={formRef} id="apply">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2 text-center">
            Apply Now
          </h2>
          <p className="font-body text-muted-foreground text-center mb-10">
            Fill out the form below and we'll be in touch if your background looks like a fit.
          </p>

          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 md:p-8 space-y-6">
            {/* Name & Age */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-body font-semibold">Full Name *</Label>
                <Input
                  required
                  value={form.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  placeholder="Your full name"
                  className="font-body"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-body font-semibold">Age</Label>
                <Input
                  type="number"
                  value={form.age}
                  onChange={(e) => handleChange("age", e.target.value)}
                  placeholder="Your age"
                  className="font-body"
                />
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-body font-semibold">Phone Number *</Label>
                <Input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="(850) 555-1234"
                  className="font-body"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-body font-semibold">Email Address</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="your@email.com"
                  className="font-body"
                />
              </div>
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label className="font-body font-semibold">City</Label>
              <Input
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="e.g. Pensacola, Gulf Breeze, Navarre"
                className="font-body"
              />
            </div>

            {/* Position */}
            <div className="space-y-2">
              <Label className="font-body font-semibold">Which position are you applying for? *</Label>
              <div className="grid grid-cols-2 gap-3">
                {POSITIONS.map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => handleChange("position", pos)}
                    className={`font-body text-sm rounded-lg border px-3 py-3 transition-colors ${
                      form.position === pos
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Transportation */}
            <div className="space-y-2">
              <Label className="font-body font-semibold">Do you have reliable transportation?</Label>
              <div className="flex gap-3">
                {["yes", "no"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleChange("has_transportation", opt)}
                    className={`font-body text-sm rounded-lg border px-6 py-3 capitalize transition-colors ${
                      form.has_transportation === opt
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div className="space-y-2">
              <Label className="font-body font-semibold">
                Do you have relevant experience? (e.g. tree work, landscaping, trailers, outdoor labor, customer service, scheduling, dispatch, sales, or office/admin)
              </Label>
              <Textarea
                value={form.has_experience}
                onChange={(e) => handleChange("has_experience", e.target.value)}
                placeholder="Tell us about any relevant experience..."
                className="font-body"
                rows={3}
              />
            </div>

            {/* Work Experience */}
            <div className="space-y-2">
              <Label className="font-body font-semibold">Work Experience</Label>
              <Textarea
                value={form.work_experience}
                onChange={(e) => handleChange("work_experience", e.target.value)}
                placeholder="Previous jobs, roles, or relevant work history..."
                className="font-body"
                rows={3}
              />
            </div>

            {/* Comfortable Outdoors */}
            <div className="space-y-2">
              <Label className="font-body font-semibold">
                Are you comfortable working outdoors in heat and doing physical labor?
              </Label>
              <div className="flex gap-3">
                {["yes", "no"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleChange("comfortable_outdoors", opt)}
                    className={`font-body text-sm rounded-lg border px-6 py-3 capitalize transition-colors ${
                      form.comfortable_outdoors === opt
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Why Good Fit */}
            <div className="space-y-2">
              <Label className="font-body font-semibold">Why do you think you'd be a good fit for this role?</Label>
              <Textarea
                value={form.why_good_fit}
                onChange={(e) => handleChange("why_good_fit", e.target.value)}
                placeholder="Be honest and direct — we value that."
                className="font-body"
                rows={4}
              />
            </div>

            {/* File Uploads */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-body font-semibold">Resume (optional)</Label>
                <label className="flex items-center gap-3 border border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="font-body text-sm text-muted-foreground">
                    {resumeFile ? resumeFile.name : "Upload PDF or DOC"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <div className="space-y-2">
                <Label className="font-body font-semibold">Voice Note (optional)</Label>
                <label className="flex items-center gap-3 border border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors">
                  <Mic className="w-5 h-5 text-muted-foreground" />
                  <span className="font-body text-sm text-muted-foreground">
                    {voiceFile ? voiceFile.name : "Upload audio file"}
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => setVoiceFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            {/* Best Time */}
            <div className="space-y-2">
              <Label className="font-body font-semibold">Best time to contact you</Label>
              <Input
                value={form.best_contact_time}
                onChange={(e) => handleChange("best_contact_time", e.target.value)}
                placeholder="e.g. Mornings before 10am, anytime after 3pm"
                className="font-body"
              />
            </div>

            {/* Acknowledgment */}
            <div className="flex items-start gap-3 bg-secondary/50 rounded-lg p-4">
              <Checkbox
                id="acknowledged"
                checked={form.acknowledged}
                onCheckedChange={(checked) => handleChange("acknowledged", !!checked)}
                className="mt-0.5"
              />
              <Label htmlFor="acknowledged" className="font-body text-sm text-muted-foreground leading-relaxed cursor-pointer">
                I understand this role requires reliability, strong work ethic, and a commitment to professionalism — whether in the field or in operations.
              </Label>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              size="lg"
              className="w-full font-body text-lg py-6 rounded-xl"
            >
              {submitting ? "Submitting..." : "Apply Now"}
            </Button>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default GulfCoastPalmsCareers;
