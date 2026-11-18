/**
 * The parts of the tree removal page that are specific to it: what the one filmed
 * removal shows, the three things people ask before booking (estimates, cleanup and
 * haul-away, stumps), and where to go next. Words are in data/priorityCopy.ts.
 */
import { Fragment } from "react";
import { Link } from "react-router-dom";
import AreaLinks from "../../components/AreaLinks";
import { treeRemovalCopy as copy } from "../../data/priorityCopy";
import { QuoteLink } from "../../lib/actions";
import { ArrowRightIcon } from "../../lib/icons";

/** What the frames at the top of the page show, with the quote button beside it. */
export function TreeJob() {
  return (
    <section className="rd-section rd-section--tight" aria-labelledby="rd-treejob-title">
      <div className="rd-wrap rd-split">
        <div className="rd-stack">
          <h2 id="rd-treejob-title" className="rd-h2">{copy.job.heading}</h2>
          <p className="rd-copy">{copy.job.intro}</p>
        </div>
        <div className="rd-ticket rd-ticket--still">
          <dl>
            {copy.job.facts.map((fact) => (
              <Fragment key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.text}</dd>
              </Fragment>
            ))}
          </dl>
          <div className="rd-ticket__actions">
            <QuoteLink placement="service_tree-removal_job" service="Tree Removal" className="rd-btn rd-btn--go">{copy.quoteLabel}</QuoteLink>
            <Link to="/jobs" className="rd-link">See completed projects</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Estimates, cleanup and haul-away, and stump grinding, each answered in its own panel. */
export function TreeAnswers() {
  return (
    <section className="rd-section rd-paper-2" aria-labelledby="rd-treeanswers-title">
      <div className="rd-wrap">
        <h2 id="rd-treeanswers-title" className="rd-h2 rd-answers__title">{copy.answersHeading}</h2>
        <div className="rd-answers">
          {copy.answers.map((answer) => (
            <article key={answer.heading} className="rd-answer">
              <h3 className="rd-h3">{answer.heading}</h3>
              {answer.paragraphs.map((p) => <p key={p}>{p}</p>)}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Storm cleanup, the other tree pages, finished jobs, and the areas served. */
export function TreeLinks() {
  return (
    <section className="rd-section rd-section--tight rd-paper-2" aria-labelledby="rd-treelinks-title">
      <div className="rd-wrap rd-split">
        <div className="rd-stack">
          <h2 id="rd-treelinks-title" className="rd-h3 rd-h3--big">{copy.linksHeading}</h2>
          <h3 className="rd-h3 rd-arealinks__head">{copy.areasHeading}</h3>
          <p className="rd-copy rd-small">{copy.areasText}</p>
          <AreaLinks label={(city) => city} listLabel="Service areas" />
        </div>
        <ul className="rd-rows">
          {copy.links.map((link) => (
            <li key={link.to}>
              <Link to={link.to}>
                <b>{link.label}</b>
                {link.note && <span>{link.note}</span>}
                <ArrowRightIcon size={20} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
