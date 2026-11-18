/**
 * Project viewer: one large job photo with its job notes and the matching quote
 * button beside it. Tapping a thumbnail (or swiping the photo) fades to the next job.
 *
 * Only facts on record are shown. A project with no city, no stated customer need
 * or no stated result simply shows fewer lines.
 *
 * Only the photo on screen is downloaded; the next one loads when it is chosen and
 * fades in over the last once it has arrived.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { cityPage, type Project } from "../data/projects";
import { QuoteLink } from "../lib/actions";
import { ArrowLeftIcon, ArrowRightIcon } from "../lib/icons";
import Photo from "./Photo";

/** The city a project was recorded in, linked to that city's page where there is one. */
export function Where({ city }: { city: string }) {
  const page = cityPage(city);
  return page ? <Link to={page}>{city}, FL</Link> : <>{city}, FL</>;
}

export default function ProjectViewer({ projects, placement, id = "rd-work" }: { projects: Project[]; placement: string; id?: string }) {
  const [index, setIndex] = useState(0);
  /** The photo on top. It stays up until the chosen one has loaded. */
  const [shown, setShown] = useState(0);
  /** The photo underneath during a fade. */
  const [under, setUnder] = useState<number | null>(null);
  const startX = useRef<number | null>(null);
  const current = projects[index];
  const go = (delta: number) => setIndex((i) => (i + delta + projects.length) % projects.length);

  const reveal = (i: number) => {
    setShown((was) => {
      if (was !== i) setUnder(was);
      return i;
    });
  };

  // Never leave the visitor waiting on a slow photo: show it after a moment regardless.
  useEffect(() => {
    if (shown === index) return;
    const timer = window.setTimeout(() => reveal(index), 1500);
    return () => window.clearTimeout(timer);
  }, [index, shown]);

  // Drop the photo underneath once the fade has finished.
  useEffect(() => {
    if (under === null) return;
    const timer = window.setTimeout(() => setUnder(null), 700);
    return () => window.clearTimeout(timer);
  }, [under]);

  const layers = [under, shown, index].filter((i, pos, all): i is number => i !== null && all.indexOf(i) === pos);

  return (
    <div className="rd-viewer" data-rv="">
      <div
        className="rd-viewer__stage rd-wipe"
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (startX.current === null) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
        }}
      >
        {layers.map((i) => {
          const p = projects[i];
          return (
            <figure key={p.id} className="rd-viewer__photo" data-on={i === shown || i === under} aria-hidden={i !== index}>
              <Photo src={p.photo} alt={p.alt} focus={p.focus} sizes="(min-width: 1000px) 46vw, 100vw" onLoad={i === index ? () => reveal(i) : undefined} />
            </figure>
          );
        })}
        <div className="rd-viewer__step">
          <button type="button" onClick={() => go(-1)} aria-label="Previous project" aria-controls={`${id}-notes`}><ArrowLeftIcon size={20} /></button>
          <span aria-hidden>{index + 1} / {projects.length}</span>
          <button type="button" onClick={() => go(1)} aria-label="Next project" aria-controls={`${id}-notes`}><ArrowRightIcon size={20} /></button>
        </div>
      </div>

      <div className="rd-viewer__side rd-rise" style={{ "--i": 2 } as CSSProperties}>
        <div className="rd-ticket" id={`${id}-notes`} aria-live="polite" key={current.id} data-spot="">
          <h3 className="rd-ticket__title">{current.title}</h3>
          <dl>
            {current.city && (<><dt>Where</dt><dd><Where city={current.city} /></dd></>)}
            <dt>Property</dt><dd>{current.property}</dd>
            {current.need && (<><dt>Asked for</dt><dd>{current.need}</dd></>)}
            <dt>Work</dt><dd>{current.work}</dd>
            {current.result && (<><dt>Result</dt><dd>{current.result}</dd></>)}
          </dl>
          <div className="rd-ticket__actions">
            <QuoteLink placement={placement} service={current.service.label} className="rd-btn rd-btn--go">
              {current.service.ask}
            </QuoteLink>
            <Link to={current.service.to} className="rd-link">About this service</Link>
          </div>
        </div>
        <ul className="rd-viewer__thumbs" aria-label="Choose a project">
          {projects.map((p, i) => (
            <li key={p.id}>
              <button type="button" aria-pressed={i === index} aria-label={`Show ${p.title}`} onClick={() => setIndex(i)}>
                <Photo src={p.photo} alt="" focus={p.focus} sizes="5rem" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
