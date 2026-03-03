import LocationPage from "@/components/LocationPage";
import { getLocationBySlug } from "@/data/locations";

const DestinPage = () => {
  const location = getLocationBySlug("palm-tree-trimming-destin-fl")!;
  return <LocationPage location={location} />;
};

export default DestinPage;
