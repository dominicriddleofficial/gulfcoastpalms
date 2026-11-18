/**
 * A matched pair of photos: the same subject before the work and after it, side by
 * side at every screen size so the difference can be seen at a glance.
 *
 * Only for pairs that really are the same subject. Each photo carries its own label
 * and a caption saying what it shows.
 */
import Photo, { type Picture } from "./Photo";

export interface CompareShot {
  photo: Picture;
  alt: string;
  /** What this photo shows, e.g. "Before: dead fronds hanging under the crown." */
  caption: string;
  focus?: string;
}

interface CompareProps {
  before: CompareShot;
  after: CompareShot;
  /** Labels on the photos. A pair that is two results, not a before and after, names them here. */
  labels?: [string, string];
  /** How wide the pair is shown, in CSS terms. Each photo is half of it. */
  sizes?: string;
  /** On phones, show the two as a row to swipe so each one is large. */
  swipe?: boolean;
}

export default function Compare({ before, after, labels = ["Before", "After"], sizes = "(min-width: 900px) 20rem, 46vw", swipe = false }: CompareProps) {
  const shots = [before, after];
  return (
    <div className={swipe ? "rd-compare rd-compare--swipe" : "rd-compare"}>
      {shots.map((shot, i) => (
        <figure key={labels[i]} className="rd-compare__shot">
          <div className="rd-compare__frame">
            <Photo src={shot.photo} alt={shot.alt} focus={shot.focus} sizes={sizes} soon={swipe} />
            <b className="rd-compare__tag" aria-hidden="true">{labels[i]}</b>
          </div>
          <figcaption>{shot.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}
