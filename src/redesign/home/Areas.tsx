/**
 * Service areas, listed the way the coast runs: west to east, Perdido Key to 30A.
 * Every city links to its own page, as on the current site.
 */
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { publicMarketing } from "@/data/publicMarketing";
import { coastAreas } from "../data/nav";

export default function Areas({ current }: { current?: string }) {
  return (
    <section className="rd-areas rd-section" aria-labelledby="rd-areas-title">
      <div className="rd-wrap rd-areas__grid">
        <div className="rd-stack rd-rise" data-rv="">
          <h2 id="rd-areas-title" className="rd-h2">Perdido Key to 30A</h2>
          <p className="rd-copy rd-muted">{publicMarketing.areasText}</p>
          <p className="rd-copy"><b>Based in Navarre.</b> Not sure we reach you? Call or text and ask.</p>
          <Link to="/service-areas" className="rd-btn rd-btn--ink">All service areas</Link>
        </div>
        <ol className="rd-coast" aria-label="Cities we serve, from west to east" data-rv="">
          {coastAreas.map((a, i) => (
            <li key={a.to}>
              <Link to={a.to} aria-current={current === a.to ? "page" : undefined} style={{ "--i": i } as CSSProperties}>{a.city}</Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
