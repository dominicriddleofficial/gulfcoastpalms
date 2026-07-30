import ReviewMessageSheet from "@/components/platform/schedule/ReviewMessageSheet";
export default function TmpReviewSheet() {
  return (
    <div className="min-h-screen bg-background">
      <ReviewMessageSheet open onClose={() => {}} customerName="Nancy Murphy" customerPhone="8501234567" businessId="b0000000-0000-0000-0000-000000000001" />
    </div>
  );
}
