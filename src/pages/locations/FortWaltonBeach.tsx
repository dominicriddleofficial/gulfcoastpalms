import LocationPage from "@/components/LocationPage";
import { getLocationBySlug } from "@/data/locations";

const FortWaltonBeachPage = () => {
  const location = getLocationBySlug("palm-tree-trimming-fort-walton-beach-fl")!;
  return <LocationPage location={location} />;
};

export default FortWaltonBeachPage;
