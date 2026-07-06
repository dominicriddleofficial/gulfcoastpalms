import LocationPage from "@/components/LocationPage";
import { getLocationBySlug } from "@/data/locations";

const CrestviewPage = () => {
  const location = getLocationBySlug("palm-tree-trimming-crestview-fl")!;
  return <LocationPage location={location} />;
};

export default CrestviewPage;
