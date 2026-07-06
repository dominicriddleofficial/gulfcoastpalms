import LocationPage from "@/components/LocationPage";
import { getLocationBySlug } from "@/data/locations";

const PerdidoPage = () => {
  const location = getLocationBySlug("palm-tree-trimming-perdido-fl")!;
  return <LocationPage location={location} />;
};

export default PerdidoPage;