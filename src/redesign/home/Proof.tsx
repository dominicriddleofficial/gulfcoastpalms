/**
 * Reviews and the figures the business already publishes. The three excerpts are the
 * verified ones in src/data/reviews.ts, word for word; the dates below say when the
 * numbers and the excerpts were last checked.
 */
import { GOOGLE_BUSINESS_URL, aggregateRating, reviews } from "@/data/reviews";
import { StarIcon } from "../lib/icons";

export default function Proof() {
  return (
    <section className="rd-proof rd-section rd-paper-2" aria-labelledby="rd-proof-title">
      <div className="rd-wrap rd-proof__grid">
        <div className="rd-proof__lead">
          <h2 id="rd-proof-title" className="rd-proof__say">
            Over a thousand properties served, and {aggregateRating.count} Google reviews averaging{" "}
            {aggregateRating.score.toFixed(1)}.
          </h2>
          <p className="rd-proof__stars" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => <StarIcon key={i} size={22} />)}
          </p>
          <a className="rd-btn rd-btn--ink" href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer">
            Read the reviews on Google
          </a>
          <p className="rd-small rd-muted rd-proof__note">
            Rating and {aggregateRating.count} five-star reviews owner-confirmed October 15, 2026. Review excerpts
            checked September 18, 2026.
          </p>
        </div>
        <ul className="rd-proof__quotes">
          {reviews.map((r) => (
            <li key={r.name}>
              <blockquote>
                <p>“{r.text}”</p>
                <footer>
                  {r.name}, <a className="rd-link" href={r.sourceUrl} target="_blank" rel="noopener noreferrer">Google review</a>
                </footer>
              </blockquote>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
