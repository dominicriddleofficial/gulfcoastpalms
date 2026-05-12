import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Phone, MessageSquare, History, Navigation, Mail, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContactCustomerSheetProps {
  open: boolean;
  onClose: () => void;
  customer: {
    id?: string | null;
    display_name: string;
    phone?: string | null;
    email?: string | null;
  };
  job?: {
    address?: string | null;
    lat?: number | null;
    lng?: number | null;
  };
  /** Optional crew first name to personalize the SMS greeting. */
  crewFirstName?: string | null;
}

function formatPhone(input?: string | null): string {
  if (!input) return "";
  const digits = input.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return input;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

function firstNameOf(displayName: string): string {
  const trimmed = (displayName ?? "").trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

export function ContactCustomerSheet({
  open,
  onClose,
  customer,
  job,
  crewFirstName,
}: ContactCustomerSheetProps) {
  const navigate = useNavigate();
  const first = firstNameOf(customer.display_name);
  const crewLabel = (crewFirstName ?? "").trim() || "Dom";

  const handleCall = () => {
    if (!customer.phone) return;
    window.location.href = `tel:${customer.phone}`;
    onClose();
  };

  const handleText = () => {
    if (!customer.phone) return;
    const body = encodeURIComponent(
      `Hey ${first}, this is ${crewLabel} with Gulf Coast Palms. `,
    );
    // Use `?body=` (works on iOS 8+ and Android) instead of `&body=`
    window.location.href = `sms:${customer.phone}?body=${body}`;
    onClose();
  };

  const handleViewMessages = () => {
    if (customer.id) {
      navigate(`/platform/communications?customer=${customer.id}`);
    } else if (customer.phone) {
      navigate(`/platform/communications?phone=${encodeURIComponent(customer.phone)}`);
    } else {
      navigate(`/platform/communications`);
    }
    onClose();
  };

  const hasCoords = typeof job?.lat === "number" && typeof job?.lng === "number";
  const hasDirections = Boolean(job?.address) || hasCoords;

  const handleDirections = () => {
    const query = job?.address
      ? encodeURIComponent(job.address)
      : hasCoords
      ? `${job!.lat},${job!.lng}`
      : "";
    if (!query) return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `maps://?daddr=${query}`
      : `https://maps.apple.com/?daddr=${query}`;
    window.location.href = url;
    onClose();
  };

  const handleEmail = () => {
    if (!customer.email) return;
    window.location.href = `mailto:${customer.email}`;
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        side="bottom"
        className="ops-theme bg-background border-border rounded-t-2xl pb-8"
      >
        <div className="space-y-1 mb-5 pt-2">
          <h3 className="font-display text-xl font-bold text-foreground leading-tight">
            {customer.display_name}
          </h3>
          {customer.phone && (
            <p className="font-body text-sm text-muted-foreground">
              {formatPhone(customer.phone)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          {customer.phone && (
            <ContactAction
              icon={Phone}
              label={`Call ${first}`}
              onClick={handleCall}
              variant="primary"
            />
          )}
          {customer.phone && (
            <ContactAction
              icon={MessageSquare}
              label={`Text ${first}`}
              onClick={handleText}
            />
          )}
          <ContactAction
            icon={History}
            label="View past messages"
            onClick={handleViewMessages}
          />
          {hasDirections && (
            <ContactAction
              icon={Navigation}
              label="Get directions"
              onClick={handleDirections}
            />
          )}
          {customer.email && (
            <ContactAction
              icon={Mail}
              label="Send email"
              onClick={handleEmail}
            />
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 p-3 rounded-xl text-center font-body text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
        >
          Cancel
        </button>
      </SheetContent>
    </Sheet>
  );
}

interface ContactActionProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "default" | "primary";
}

function ContactAction({ icon: Icon, label, onClick, variant = "default" }: ContactActionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 rounded-xl text-left transition-colors min-h-[60px]",
        variant === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          : "bg-secondary/40 text-foreground hover:bg-secondary/70",
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="font-body font-semibold text-base">{label}</span>
    </button>
  );
}

export default ContactCustomerSheet;