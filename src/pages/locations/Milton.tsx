import LocationPage from "@/components/LocationPage";
import { getLocationBySlug } from "@/data/locations";

const MiltonPage = () => {
  const location = getLocationBySlug("palm-tree-trimming-milton-fl")!;
  return <LocationPage location={location} />;
};

export default MiltonPage;