/**
 * One-tap quote starts, straight under the opening screen. Each button opens the quote
 * form with that kind of work already chosen, using the form's own service names, so
 * the request reaches the office exactly as it does today.
 */
import { palmServices, shortLabel, treeServices } from "../data/nav";
import { QuoteLink } from "../lib/actions";
import { ArrowUpRightIcon } from "../lib/icons";

/** In the order people ask for the work. */
const PICKS = [
  "/services/tree-removal",
  "/services/tree-trimming",
  "/services/storm-damage-cleanup",
  "/services/palm-tree-trimming",
  "/services/palm-diamond-cutting",
  "/services/palm-tree-trunk-skinning",
];

/** Shorter words for the buttons. The quote form still receives each service's full name. */
const WORDS: Record<string, string> = { "/services/storm-damage-cleanup": "Storm Cleanup" };

export default function QuickQuote() {
  const all = [...treeServices, ...palmServices];
  const items = PICKS.flatMap((to) => all.find((i) => i.to === to) ?? []);
  return (
    <section className="rd-quick" aria-labelledby="rd-quick-title">
      <div className="rd-wrap">
        <div className="rd-quick__card rd-panel" data-rv="">
          <div className="rd-quick__head">
            <h2 id="rd-quick-title" className="rd-quick__title">Start a free quote for</h2>
            <p className="rd-quick__note">One tap opens the form with the work filled in.</p>
          </div>
          <ul className="rd-quick__list">
            {items.map((item) => (
              <li key={item.to}>
                <QuoteLink placement="home_quick" service={item.label}>
                  {WORDS[item.to] ?? shortLabel(item)}
                  <ArrowUpRightIcon size={16} />
                </QuoteLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
