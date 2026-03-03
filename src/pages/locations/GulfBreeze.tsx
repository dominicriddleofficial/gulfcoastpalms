import LocationPage from "@/components/LocationPage";
import { getLocationBySlug } from "@/data/locations";

const GulfBreezePage = () => {
  const location = getLocationBySlug("palm-tree-trimming-gulf-breeze-fl")!;
  return <LocationPage location={location} />;
};

export default GulfBreezePage;
