import LocationPage from "@/components/LocationPage";
import { getLocationBySlug } from "@/data/locations";

const MaryEstherPage = () => {
  const location = getLocationBySlug("palm-tree-trimming-mary-esther-fl")!;
  return <LocationPage location={location} />;
};

export default MaryEstherPage;