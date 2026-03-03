import LocationPage from "@/components/LocationPage";
import { getLocationBySlug } from "@/data/locations";

const PensacolaPage = () => {
  const location = getLocationBySlug("palm-tree-trimming-pensacola-fl")!;
  return <LocationPage location={location} />;
};

export default PensacolaPage;
