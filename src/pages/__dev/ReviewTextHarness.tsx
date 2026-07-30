import { useState } from "react";
import { ReviewRequestTextForm } from "@/components/platform/settings/ReviewRequestTextSection";
import { DEFAULT_REVIEW_TEMPLATE, FALLBACK_REVIEW_LINK } from "@/lib/review-sms";

export default function ReviewTextHarness() {
  const [template, setTemplate] = useState(DEFAULT_REVIEW_TEMPLATE);
  const [link, setLink] = useState(FALLBACK_REVIEW_LINK);
  return (
    <div className="min-h-screen bg-background p-4">
      <ReviewRequestTextForm
        businessName="Gulf Coast Palms"
        template={template}
        setTemplate={setTemplate}
        link={link}
        setLink={setLink}
        loading={false}
        saving={false}
        onSave={() => {}}
      />
    </div>
  );
}
