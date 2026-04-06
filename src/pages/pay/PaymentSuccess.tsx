import { useParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";

const BUSINESS_THEMES: Record<string, { name: string; gradient: string }> = {
  gcp: { name: "Gulf Coast Palms", gradient: "from-green-800 to-green-600" },
  pps: { name: "Prestige Property Services", gradient: "from-blue-900 to-blue-700" },
};

export default function PaymentSuccess() {
  const { shortcode } = useParams();
  const theme = BUSINESS_THEMES[shortcode?.toLowerCase() || ""] || BUSINESS_THEMES.gcp;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className={`bg-gradient-to-r ${theme.gradient} text-white py-6 px-4`}>
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-xl font-bold">{theme.name}</h1>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <CheckCircle className="w-20 h-20 mx-auto text-green-500 mb-5" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
          <p className="text-gray-500 mb-6">
            Thank you for your payment. A receipt has been sent to your email.
          </p>
          <p className="text-xs text-gray-400">You may close this page.</p>
        </div>
      </div>
    </div>
  );
}
