import LocationPage from "@/components/LocationPage";
import { getLocationBySlug } from "@/data/locations";

const SantaRosaBeachPage = () => {
  const location = getLocationBySlug("palm-tree-trimming-santa-rosa-beach-fl")!;
  return <LocationPage location={location} />;
};

export default SantaRosaBeachPage;