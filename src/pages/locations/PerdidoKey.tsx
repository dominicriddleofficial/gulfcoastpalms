import LocationPage from "@/components/LocationPage";
import { getLocationBySlug } from "@/data/locations";

const PerdidoKeyPage = () => {
  const location = getLocationBySlug("palm-tree-trimming-perdido-key-fl")!;
  return <LocationPage location={location} />;
};

export default PerdidoKeyPage;
