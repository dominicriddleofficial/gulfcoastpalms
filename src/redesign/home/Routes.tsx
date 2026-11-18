/**
 * The two ways in: Tree Services and Palm Services, side by side and the same size.
 *
 * Both photos are shown at the size of the smaller one. The only tree photo on file
 * is a 512-pixel frame, and giving the palm side a bigger picture would quietly rank
 * palm work above tree work. The service rows go straight to each service page.
 */
import { Link } from "react-router-dom";
import { publicMarketing } from "@/data/publicMarketing";
import treeFrame from "@/assets/tree-removal-work.jpg?w=512&format=avif;webp;jpg&as=picture";
import palmFrame from "@/assets/redesign/palm-canary-home.jpg?w=512;768;1024&format=avif;webp;jpg&as=picture";
import Photo from "../components/Photo";
import { palmServices, shortLabel, treeServices, type NavItem } from "../data/nav";
import { QuoteLink } from "../lib/actions";
import { ArrowRightIcon } from "../lib/icons";

const pick = (items: NavItem[], paths: string[]) => paths.flatMap((to) => items.find((i) => i.to === to) ?? []);

const DOORS = [
  {
    id: "tree",
    title: "Tree Services",
    to: "/services/tree-trimming-removal",
    // Wording from the current homepage.
    blurb: "Experienced tree crews, including an experienced climber. Site assessment and a written scope for your property.",
    photo: treeFrame,
    alt: "Tree removal in progress: a worker with a chainsaw cuts a leaning tree trunk beside a two-story building",
    caption: "Tree removal under way beside a two-story building",
    items: pick(treeServices, ["/services/tree-removal", "/services/tree-trimming", "/services/storm-damage-cleanup"]),
    all: { label: "All tree services", to: "/services/tree-trimming-removal" },
    quote: { service: "Tree Trimming & Removal", label: "Get a tree quote", placement: "home_services_tree" },
  },
  {
    id: "palm",
    title: "Palm Services",
    to: "/services/palm-tree-trimming",
    blurb: "Established palm expertise: trimming, diamond cutting, trunk skinning, installations and removals.",
    photo: palmFrame,
    alt: "A trimmed date palm and a row of sabal palms in front of a home at dusk",
    caption: "Date palm and sabals after trimming",
    items: pick(palmServices, ["/services/palm-tree-trimming", "/services/palm-diamond-cutting", "/services/palm-tree-trunk-skinning"]),
    all: { label: "All palm services", to: "/services" },
    quote: { service: "Palm Tree Trimming", label: "Get a palm quote", placement: "home_services_palm" },
  },
] as const;

export default function Routes() {
  return (
    <section className="rd-routes rd-section" aria-labelledby="rd-routes-title">
      <div className="rd-wrap">
        <div className="rd-routes__intro">
          <h2 id="rd-routes-title" className="rd-h2">{publicMarketing.servicesHeading}</h2>
          <p className="rd-copy rd-muted">{publicMarketing.servicesText}</p>
        </div>
        <div className="rd-routes__grid">
          {DOORS.map((door) => (
            <article key={door.id} className={`rd-door rd-door--${door.id}`} aria-labelledby={`rd-door-${door.id}`}>
              <div className="rd-door__head">
                <h3 id={`rd-door-${door.id}`} className="rd-door__title">
                  <Link to={door.to}>{door.title}</Link>
                </h3>
                <figure className="rd-print rd-door__print">
                  <Photo src={door.photo} alt={door.alt} sizes="(min-width: 900px) 22rem, 56vw" focus={door.id === "palm" ? "40% 35%" : undefined} />
                  <figcaption>{door.caption}</figcaption>
                </figure>
                <p className="rd-door__blurb">{door.blurb}</p>
              </div>
              <ul className="rd-rows">
                {door.items.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to}>
                      <b>{shortLabel(item)}</b>
                      {item.note && <span>{item.note}</span>}
                      <ArrowRightIcon size={20} />
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to={door.all.to}>
                    <b>{door.all.label}</b>
                    <ArrowRightIcon size={20} />
                  </Link>
                </li>
              </ul>
              <QuoteLink placement={door.quote.placement} service={door.quote.service} className="rd-btn rd-btn--go rd-door__quote">
                {door.quote.label}
              </QuoteLink>
            </article>
          ))}
        </div>
        <p className="rd-routes__also rd-small">
          Also: <Link className="rd-link" to="/services/landscaping-services">landscaping</Link>,{" "}
          <Link className="rd-link" to="/palm-tree-maintenance-plans">maintenance plans</Link>,{" "}
          <Link className="rd-link" to="/hurricane-palm-preparation">hurricane preparation</Link> and{" "}
          <Link className="rd-link" to="/palm-trees/buy">palm trees delivered and installed</Link>.
        </p>
      </div>
    </section>
  );
}
