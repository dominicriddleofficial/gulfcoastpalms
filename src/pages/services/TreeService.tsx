import ServicePage from "@/components/ServicePage";
import { servicesData } from "@/data/services";
import NotFound from "@/pages/NotFound";

export default function TreeService({ slug }: { slug: string }) {
  const service = servicesData.find((item) => item.slug === slug);
  if (!service) return <NotFound />;
  return <ServicePage service={service} />;
}
