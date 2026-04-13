import LocationPage from "@/components/LocationPage";
import { getLocationBySlug } from "@/data/locations";

const PacePage = () => {
  const location = getLocationBySlug("palm-tree-trimming-pace-fl")!;
  return <LocationPage location={location} />;
};

export default PacePage;