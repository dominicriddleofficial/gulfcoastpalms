import LocationPage from "@/components/LocationPage";
import { getLocationBySlug } from "@/data/locations";

const NavarrePage = () => {
  const location = getLocationBySlug("palm-tree-trimming-navarre-fl")!;
  return <LocationPage location={location} />;
};

export default NavarrePage;
