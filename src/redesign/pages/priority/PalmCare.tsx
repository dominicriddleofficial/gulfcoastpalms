/**
 * The parts of the palm trimming and care page that are specific to it: the four
 * kinds of palm work shown side by side, what a first clean-up involves compared
 * with the visits after it, and paths to each palm service's own page.
 *
 * Every pair here is the same palm, or the same palms, before and after. Captions
 * say only what each photo shows. Words are in data/priorityCopy.ts.
 */
import { Link } from "react-router-dom";
import sabalBefore from "@/assets/facebook/sabal-pair-before.jpg?w=360;600;900&format=avif;webp;jpg&as=picture";
import sabalAfter from "@/assets/facebook/sabal-pair-after.jpg?w=360;600;900&format=avif;webp;jpg&as=picture";
import trunkBefore from "@/assets/facebook/trunk-clean-up-before.jpg?w=360;600;900&format=avif;webp;jpg&as=picture";
import trunkAfter from "@/assets/facebook/trunk-clean-up-after.jpg?w=360;600;900&format=avif;webp;jpg&as=picture";
import dateBefore from "@/assets/facebook/date-palm-before.jpg?w=360;600;900&format=avif;webp;jpg&as=picture";
import dateAfter from "@/assets/facebook/date-palm-after.jpg?w=360;600;900&format=avif;webp;jpg&as=picture";
import skinned from "@/assets/redesign/skinning-detail.jpg?w=360;520&format=avif;webp;jpg&as=picture";
import diamondCut from "@/assets/diamond-cutting.jpg?w=360;515&format=avif;webp;jpg&as=picture";
import AreaLinks from "../../components/AreaLinks";
import Compare from "../../components/Compare";
import { palmCareCopy as copy } from "../../data/priorityCopy";
import { ArrowRightIcon } from "../../lib/icons";

const more = (link: { label: string; to: string }) => (
  <Link to={link.to} className="rd-kind__more">{link.label}<ArrowRightIcon size={18} /></Link>
);

/** Canopy, seed pods, boots and diamond cutting, each with what it looks like. */
export function PalmKinds() {
  return (
    <section className="rd-section" aria-labelledby="rd-kinds-title">
      <div className="rd-wrap">
        <div className="rd-kinds__intro">
          <h2 id="rd-kinds-title" className="rd-h2">{copy.kindsHeading}</h2>
          <p className="rd-copy">{copy.kindsIntro}</p>
        </div>
        <div className="rd-kinds">
          <article className="rd-kind">
            <div className="rd-kind__media">
              <Compare
                before={{ photo: sabalBefore, alt: "Two sabal palms in front of a brick home before trimming, with brown dead fronds hanging under each crown and a ladder against one trunk", caption: copy.canopy.before, focus: "45% 55%" }}
                after={{ photo: sabalAfter, alt: "The same two sabal palms after trimming, with compact green crowns and nothing hanging below them", caption: copy.canopy.after, focus: "50% 50%" }}
              />
            </div>
            <div className="rd-kind__text">
              <h3 className="rd-h3 rd-h3--big">{copy.canopy.heading}</h3>
              <p>{copy.canopy.text}</p>
              <h3 className="rd-h3 rd-h3--big rd-kind__next">{copy.pods.heading}</h3>
              <p>{copy.pods.text}</p>
            </div>
          </article>

          <article className="rd-kind rd-kind--flip">
            <div className="rd-kind__media">
              <Compare
                before={{ photo: trunkBefore, alt: "A palm in a garden bed before the work, its trunk covered in ferns and old growth", caption: copy.boots.before, focus: "42% 60%" }}
                after={{ photo: trunkAfter, alt: "The same palm after the work, the ferns gone and the leaf bases on the trunk cut back to an even pattern", caption: copy.boots.after, focus: "62% 55%" }}
              />
            </div>
            <div className="rd-kind__text">
              <h3 className="rd-h3 rd-h3--big">{copy.boots.heading}</h3>
              <p>{copy.boots.text}</p>
              {more(copy.boots.link)}
            </div>
          </article>

          <article className="rd-kind">
            <div className="rd-kind__media">
              <Compare
                swipe
                labels={["Diamond-cut", "Skinned"]}
                sizes="(min-width: 900px) 20rem, 78vw"
                before={{ photo: diamondCut, alt: "Close view of two date palm trunks finished with a diamond-cut cross-hatch pattern", caption: copy.diamond.cut }}
                after={{ photo: skinned, alt: "Close view of a sabal palm trunk: old boots left just under the crown, a freshly skinned orange band below them, and older grey trunk at the bottom", caption: copy.diamond.skinned }}
              />
            </div>
            <div className="rd-kind__text">
              <h3 className="rd-h3 rd-h3--big">{copy.diamond.heading}</h3>
              <p>{copy.diamond.text}</p>
              {more(copy.diamond.link)}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/** What a first clean-up takes, and what the visits after it look like. */
export function PalmVisits() {
  return (
    <section className="rd-section rd-paper-2" aria-labelledby="rd-visits-title">
      <div className="rd-wrap">
        <h2 id="rd-visits-title" className="rd-h2 rd-kinds__intro">{copy.visitsHeading}</h2>
        <article className="rd-kind rd-kind--plain">
          <div className="rd-kind__media">
            <Compare
              before={{ photo: dateBefore, alt: "Before: a date palm in a back yard with old boots, dead growth and ferns covering the top of its trunk", caption: copy.first.before, focus: "50% 58%" }}
              after={{ photo: dateAfter, alt: "After: the same date palm with the growth removed, a clean trimmed crown and a tidy trunk", caption: copy.first.after, focus: "50% 58%" }}
            />
          </div>
          <div className="rd-kind__text">
            <h3 className="rd-h3 rd-h3--big">{copy.first.heading}</h3>
            {copy.first.paragraphs.map((p) => <p key={p}>{p}</p>)}
            <h3 className="rd-h3 rd-h3--big rd-kind__next">{copy.after.heading}</h3>
            {copy.after.paragraphs.map((p) => <p key={p}>{p}</p>)}
            {more(copy.after.link)}
          </div>
        </article>
      </div>
    </section>
  );
}

/** Each palm service's own page, and palm trimming in each community. */
export function PalmLinks() {
  return (
    <section className="rd-section rd-section--tight rd-paper-2" aria-labelledby="rd-palmlinks-title">
      <div className="rd-wrap rd-split">
        <div className="rd-stack">
          <h2 id="rd-palmlinks-title" className="rd-h3 rd-h3--big">{copy.linksHeading}</h2>
          <h3 className="rd-h3 rd-arealinks__head">{copy.areasHeading}</h3>
          <AreaLinks label={(city) => `Palm tree trimming in ${city}`} listLabel={copy.areasHeading} />
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
