/**
 * A short run of photos that really are in order: the same job, one moment after
 * another. Numbered because the order is the point. On phones the frames sit in a
 * row that scrolls sideways; on wide screens they sit side by side.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import Photo, { type Picture } from "./Photo";

export interface SequenceFrame {
  photo: Picture;
  alt: string;
  caption: string;
}

interface SequenceProps {
  id: string;
  heading: string;
  /** Where the frames came from, in a sentence. */
  note: string;
  frames: SequenceFrame[];
  /** Usually a quote button for this kind of job. */
  action?: ReactNode;
}

/** The numbered frames on their own. `eager` is for a page that opens with them. */
export function SequenceFrames({ frames, label, labelledBy, eager = false }: { frames: SequenceFrame[]; label?: string; labelledBy?: string; eager?: boolean }) {
  const list = useRef<HTMLOListElement>(null);
  // Once the row is close to the screen, every frame loads, so a sideways swipe never lands on a blank.
  const [near, setNear] = useState(eager);
  useEffect(() => {
    if (near || !list.current) return;
    if (typeof IntersectionObserver === "undefined") { setNear(true); return; }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) setNear(true); }, { rootMargin: "500px 0px" });
    io.observe(list.current);
    return () => io.disconnect();
  }, [near]);
  return (
    <ol className="rd-seq__frames" aria-label={label} aria-labelledby={labelledBy} ref={list}>
      {frames.map((frame, i) => (
        <li key={frame.caption}>
          <figure>
            <Photo src={frame.photo} alt={frame.alt} sizes="(min-width: 900px) 24rem, 78vw" eager={eager && i === 0} soon={near} />
            <figcaption>
              <b aria-hidden="true">{i + 1}</b>
              <span>{frame.caption}</span>
            </figcaption>
          </figure>
        </li>
      ))}
    </ol>
  );
}

export default function Sequence({ id, heading, note, frames, action }: SequenceProps) {
  return (
    <div className="rd-seq" data-rv="">
      <div className="rd-seq__head rd-rise">
        <h2 id={id} className="rd-h2">{heading}</h2>
        <p className="rd-copy">{note}</p>
        {action}
      </div>
      <SequenceFrames frames={frames} labelledBy={id} />
    </div>
  );
}
