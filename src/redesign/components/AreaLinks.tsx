/**
 * Paths from a service page to the communities the business serves. The six the owner
 * named come first, west to east, each going to that community's existing page.
 */
import { Link } from "react-router-dom";
import { priorityAreas } from "../data/priorityCopy";

interface AreaLinksProps {
  /** Words for each link, given the city: e.g. (city) => `Palm tree trimming in ${city}`. */
  label: (city: string) => string;
  /** A name for the list, read out by screen readers. */
  listLabel: string;
}

export default function AreaLinks({ label, listLabel }: AreaLinksProps) {
  return (
    <ul className="rd-arealinks" aria-label={listLabel}>
      {priorityAreas.map((area) => (
        <li key={area.to}><Link to={area.to}>{label(area.city)}</Link></li>
      ))}
      <li><Link to="/service-areas" className="rd-arealinks__all">All service areas</Link></li>
    </ul>
  );
}
