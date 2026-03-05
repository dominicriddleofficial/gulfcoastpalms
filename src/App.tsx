import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Services from "./pages/Services";
import About from "./pages/About";
import Jobs from "./pages/Jobs";
import ServiceAreas from "./pages/ServiceAreas";
import Pensacola from "./pages/locations/Pensacola";
import GulfBreeze from "./pages/locations/GulfBreeze";
import Navarre from "./pages/locations/Navarre";
import FortWaltonBeach from "./pages/locations/FortWaltonBeach";
import Destin from "./pages/locations/Destin";
import ThirtyA from "./pages/locations/ThirtyA";
import PerdidoKey from "./pages/locations/PerdidoKey";
import PalmTreeTypes from "./pages/PalmTreeTypes";
import PalmTypePage from "./pages/PalmTypePage";
import BuyPalmTrees from "./pages/BuyPalmTrees";
import PalmCareGuides from "./pages/PalmCareGuides";
import PalmGuidePage from "./pages/PalmGuidePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/services" element={<Services />} />
          <Route path="/about" element={<About />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/service-areas" element={<ServiceAreas />} />
          <Route path="/palm-tree-trimming-pensacola-fl" element={<Pensacola />} />
          <Route path="/palm-tree-trimming-gulf-breeze-fl" element={<GulfBreeze />} />
          <Route path="/palm-tree-trimming-navarre-fl" element={<Navarre />} />
          <Route path="/palm-tree-trimming-fort-walton-beach-fl" element={<FortWaltonBeach />} />
          <Route path="/palm-tree-trimming-destin-fl" element={<Destin />} />
          <Route path="/palm-tree-trimming-30a-fl" element={<ThirtyA />} />
          <Route path="/palm-tree-trimming-perdido-key-fl" element={<PerdidoKey />} />
          {/* Palm Trees section */}
          <Route path="/palm-trees/types" element={<PalmTreeTypes />} />
          <Route path="/palm-trees/buy" element={<BuyPalmTrees />} />
          <Route path="/palm-trees/guides" element={<PalmCareGuides />} />
          <Route path="/palm-trees/guides/:slug" element={<PalmGuidePage />} />
          <Route path="/palm-trees/:slug" element={<PalmTypePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
