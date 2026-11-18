/**
 * Commercial side of the business, for the property manager with sixty palms.
 * The terms listed are the ones on the current Commercial page, shortened, not new promises.
 */
import { Link } from "react-router-dom";
import row from "@/assets/redesign/commercial-row.jpg?w=480;800;1200;1350&format=avif;webp;jpg&as=picture";
import Photo from "../components/Photo";
import { QuoteLink } from "../lib/actions";
import { CheckIcon } from "../lib/icons";

const TERMS = [
  "Volume pricing across a portfolio",
  "Photo documentation on every job",
  "Direct invoicing, with Net-30 for approved accounts",
  "Scheduling around tenants and guests",
  "Priority hurricane response for managed accounts",
];

export default function Commercial() {
  return (
    <section className="rd-commercial" aria-labelledby="rd-commercial-title">
      <figure className="rd-photo rd-commercial__photo">
        <Photo src={row} alt="A row of trimmed sabal palms along the edge of a commercial property" sizes="(min-width: 1000px) 52vw, 100vw" focus="30% 40%" />
      </figure>
      <div className="rd-commercial__body rd-dark">
        <h2 id="rd-commercial-title" className="rd-h2">HOAs, condos and commercial properties</h2>
        <p className="rd-lead">
          One crew for every address in your portfolio. We work with property managers, HOAs and commercial owners
          across Northwest Florida.
        </p>
        <ul className="rd-checks">
          {TERMS.map((t) => <li key={t}><CheckIcon size={18} />{t}</li>)}
        </ul>
        <div className="rd-actions">
          <QuoteLink placement="home_commercial" service="HOA & Commercial Maintenance" className="rd-btn rd-btn--go">
            Request portfolio pricing
          </QuoteLink>
          <Link to="/commercial" className="rd-btn rd-btn--line">Commercial services</Link>
        </div>
      </div>
    </section>
  );
}
