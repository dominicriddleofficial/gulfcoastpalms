import LocationPage from "@/components/LocationPage";
import { getLocationBySlug } from "@/data/locations";

const ThirtyAPage = () => {
  const location = getLocationBySlug("palm-tree-trimming-30a-fl")!;
  return <LocationPage location={location} />;
};

export default ThirtyAPage;
