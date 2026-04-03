import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { FileText, Shield, CheckCircle2, Download } from "lucide-react";

interface SOPPageProps {
  title: string;
  sopType: string;
  pdfFileName: string;
  roleDescription: string;
}

const SOPPage = ({ title, sopType, pdfFileName, roleDescription }: SOPPageProps) => {
  const { toast } = useToast();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [signDate, setSignDate] = useState(new Date().toISOString().split("T")[0]);
  const [readChecked, setReadChecked] = useState(false);
  const [followChecked, setFollowChecked] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const pdfUrl = `${supabaseUrl}/storage/v1/object/public/sop-documents/${pdfFileName}`;

  const clearSignature = () => sigCanvas.current?.clear();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!readChecked || !followChecked) {
      toast({ title: "Please check both acknowledgment boxes", variant: "destructive" });
      return;
    }

    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toast({ title: "Please provide your signature", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const signatureData = sigCanvas.current.toDataURL("image/png");

    const { error } = await supabase.from("sop_acknowledgments").insert({
      sop_type: sopType,
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      sign_date: signDate,
      signature_data: signatureData,
    });

    if (error) {
      toast({ title: "Error submitting acknowledgment", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    trackEvent("sop_signed", { sop_type: sopType });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-5">
        <div className="max-w-lg w-full text-center space-y-6">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Acknowledgment Received
          </h1>
          <p className="text-neutral-400 text-base sm:text-lg leading-relaxed">
            Thanks — we've recorded your signed acknowledgment for the <span className="text-white font-semibold">{title}</span>.
            If you have any questions, reach out to your supervisor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-x-hidden">
      {/* Header */}
      <div className="border-b border-neutral-800">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-8 md:py-12">
          <div className="flex items-center gap-2.5 mb-4">
            <Shield className="w-5 h-5 text-neutral-500 shrink-0" />
            <span className="text-xs sm:text-sm font-medium tracking-widest uppercase text-neutral-500">
              Gulf Coast Palms — Employee Document
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 leading-tight break-words"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
          <p className="text-neutral-400 text-base sm:text-lg leading-relaxed">
            {roleDescription}
          </p>
        </div>
      </div>

      {/* PDF Section */}
      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-6">
        {/* Instruction */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 sm:p-5 flex items-start gap-3 mb-6">
          <FileText className="w-5 h-5 text-neutral-500 mt-0.5 shrink-0" />
          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            Please review this SOP carefully. After reading it in full, complete the acknowledgment and signature section below.
          </p>
        </div>

        {/* PDF Viewer — hidden on small screens where iframes don't render well */}
        <div className="hidden sm:block bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0`}
            className="w-full"
            style={{ height: "70vh", minHeight: "500px" }}
            title={`${title} PDF`}
          />
        </div>

        {/* Mobile: show a download/open button instead of broken iframe */}
        <div className="sm:hidden">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg p-5 text-center hover:bg-neutral-800 transition-colors"
          >
            <Download className="w-5 h-5 text-neutral-400 shrink-0" />
            <span className="text-neutral-200 font-medium text-sm">
              Open SOP Document (PDF)
            </span>
          </a>
        </div>

        <p className="text-xs sm:text-sm text-neutral-600 mt-3 text-center">
          If the PDF doesn't load,{" "}
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-400 underline hover:text-white transition-colors">
            click here to open it directly
          </a>.
        </p>
      </div>

      {/* Acknowledgment Form */}
      <div className="border-t border-neutral-800">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-10 md:py-14">
          <h2
            className="text-xl sm:text-2xl font-bold mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Acknowledgment &amp; Signature
          </h2>
          <p className="text-neutral-500 text-sm sm:text-base mb-8">
            Complete all fields below to confirm you've read and understood this SOP.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name & Phone */}
            <div className="space-y-5 sm:grid sm:grid-cols-2 sm:gap-5 sm:space-y-0">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-neutral-300 text-sm">Full Name *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 focus:border-neutral-500 h-12 text-base"
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-neutral-300 text-sm">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 focus:border-neutral-500 h-12 text-base"
                  placeholder="(850) 555-0123"
                />
              </div>
            </div>

            {/* Email & Date */}
            <div className="space-y-5 sm:grid sm:grid-cols-2 sm:gap-5 sm:space-y-0">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-neutral-300 text-sm">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 focus:border-neutral-500 h-12 text-base"
                  placeholder="you@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signDate" className="text-neutral-300 text-sm">Date *</Label>
                <Input
                  id="signDate"
                  type="date"
                  value={signDate}
                  onChange={(e) => setSignDate(e.target.value)}
                  required
                  className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 focus:border-neutral-500 h-12 text-base"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4 pt-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="readCheck"
                  checked={readChecked}
                  onCheckedChange={(v) => setReadChecked(v as boolean)}
                  className="mt-0.5 border-neutral-600 data-[state=checked]:bg-white data-[state=checked]:text-neutral-950 h-5 w-5 shrink-0"
                />
                <Label htmlFor="readCheck" className="text-neutral-300 text-sm sm:text-base leading-relaxed cursor-pointer">
                  I have read and understand this SOP.
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="followCheck"
                  checked={followChecked}
                  onCheckedChange={(v) => setFollowChecked(v as boolean)}
                  className="mt-0.5 border-neutral-600 data-[state=checked]:bg-white data-[state=checked]:text-neutral-950 h-5 w-5 shrink-0"
                />
                <Label htmlFor="followCheck" className="text-neutral-300 text-sm sm:text-base leading-relaxed cursor-pointer">
                  I understand I am expected to follow these procedures, safety standards, and company expectations.
                </Label>
              </div>
            </div>

            {/* Signature */}
            <div className="space-y-3 pt-3">
              <Label className="text-neutral-300 text-sm">Signature *</Label>
              <div className="bg-white rounded-lg overflow-hidden" style={{ touchAction: "none" }}>
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    className: "w-full",
                    style: { width: "100%", height: "180px" },
                  }}
                  backgroundColor="white"
                  penColor="black"
                />
              </div>
              <button
                type="button"
                onClick={clearSignature}
                className="text-sm text-neutral-500 hover:text-white transition-colors"
              >
                Clear Signature
              </button>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-white text-neutral-950 hover:bg-neutral-200 font-semibold h-14 text-base rounded-lg mt-4"
            >
              {submitting ? "Submitting..." : "Submit Acknowledgment"}
            </Button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-800 py-6">
        <p className="text-center text-neutral-600 text-xs sm:text-sm px-5">
          Gulf Coast Palms — Confidential Employee Document
        </p>
      </div>
    </div>
  );
};

export default SOPPage;
