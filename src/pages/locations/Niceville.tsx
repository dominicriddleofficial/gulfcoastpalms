import LocationPage from "@/components/LocationPage";
import { getLocationBySlug } from "@/data/locations";

const NicevillePage = () => {
  const location = getLocationBySlug("palm-tree-trimming-niceville-fl")!;
  return <LocationPage location={location} />;
};

export default NicevillePage;