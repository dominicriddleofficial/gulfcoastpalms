/**
 * The two ways in: Tree Services and Palm Services, as two large photographs.
 *
 * Each photo dissolves into its panel the same way the opening screen dissolves into
 * the page. Under it are direct links to the individual service pages and the quote
 * button for that kind of work. The sentence above the two panels links straight to
 * the two pages most people are looking for, in plain descriptive words.
 */
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { publicMarketing } from "@/data/publicMarketing";
import treePhoto from "@/assets/facebook/tree-removal-1.jpg?w=480;720&format=avif;webp;jpg&as=picture";
import palmPhoto from "@/assets/redesign/palm-canary-home.jpg?w=512;768;1024;1400&format=avif;webp;jpg&as=picture";
import Photo from "../components/Photo";
import { palmServices, shortLabel, treeServices, type NavItem } from "../data/nav";
import { QuoteLink } from "../lib/actions";
import { ArrowRightIcon } from "../lib/icons";

const pick = (items: NavItem[], paths: string[]) => paths.flatMap((to) => items.find((i) => i.to === to) ?? []);

const DOORS = [
  {
    id: "tree",
    title: "Tree services",
    to: "/services/tree-trimming-removal",
    // Wording from the current homepage.
    blurb: "Experienced tree crews, including an experienced climber. Site assessment and a written scope for your property.",
    photo: treePhoto,
    alt: "A worker in a helmet with a chainsaw at the base of a tall leaning tree, close beside a multi-story building",
    focus: "50% 62%",
    items: pick(treeServices, ["/services/tree-removal", "/services/tree-trimming", "/services/storm-damage-cleanup"]),
    all: { label: "All tree services", to: "/services/tree-trimming-removal" },
    quote: { service: "Tree Trimming & Removal", label: "Get a tree quote", placement: "home_services_tree" },
  },
  {
    id: "palm",
    title: "Palm services",
    to: "/services/palm-tree-trimming",
    blurb: "Established palm expertise: trimming, diamond cutting, trunk skinning, installations and removals.",
    photo: palmPhoto,
    alt: "A trimmed date palm and a row of sabal palms in front of a home at dusk",
    focus: "40% 40%",
    items: pick(palmServices, ["/services/palm-tree-trimming", "/services/palm-diamond-cutting", "/services/palm-tree-trunk-skinning"]),
    all: { label: "All palm services", to: "/services" },
    quote: { service: "Palm Tree Trimming", label: "Get a palm quote", placement: "home_services_palm" },
  },
] as const;

export default function Routes() {
  return (
    <section className="rd-routes rd-section" aria-labelledby="rd-routes-title">
      <div className="rd-wrap">
        <div className="rd-routes__intro" data-rv="">
          <h2 id="rd-routes-title" className="rd-h2 rd-rise">{publicMarketing.servicesHeading}</h2>
          <div className="rd-stack rd-rise" style={{ "--i": 1 } as CSSProperties}>
            <p className="rd-copy">{publicMarketing.servicesText}</p>
            <p className="rd-copy">
              Go straight to <Link className="rd-link" to="/services/tree-removal">tree removal on the Emerald Coast</Link> or{" "}
              <Link className="rd-link" to="/services/palm-tree-trimming">palm tree trimming and care</Link>.
            </p>
          </div>
        </div>
        <div className="rd-routes__grid">
          {DOORS.map((door) => (
            <article key={door.id} className={`rd-door rd-door--${door.id} rd-rise`} aria-labelledby={`rd-door-${door.id}`} data-rv="" data-spot="">
              <Link to={door.to} className="rd-door__media rd-wipe" aria-labelledby={`rd-door-${door.id}`} data-par="">
                <Photo src={door.photo} alt={door.alt} sizes="(min-width: 900px) 38rem, 62vw" focus={door.focus} />
                <div className="rd-door__head">
                  <h3 id={`rd-door-${door.id}`} className="rd-door__title">{door.title}</h3>
                </div>
              </Link>
              <div className="rd-door__body">
                <p className="rd-door__blurb">{door.blurb}</p>
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
              </div>
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
