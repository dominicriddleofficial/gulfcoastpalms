/**
 * Completed projects. Replaces both the current "Jobs Completed" page and the
 * "Before & After" gallery.
 *
 * The current gallery pairs unrelated photos and labels them before and after. This
 * page shows each photo once, for what it is, with the job notes on record and the
 * quote button for that kind of work.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Layout from "../chrome/Layout";
import PageHero from "../components/PageHero";
import Photo from "../components/Photo";
import QuoteBand from "../components/QuoteBand";
import { projects, type Project, type ProjectKind } from "../data/projects";
import { QuoteLink } from "../lib/actions";
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon } from "../lib/icons";

const FILTERS: { id: "all" | ProjectKind; label: string }[] = [
  { id: "all", label: "All projects" },
  { id: "tree", label: "Tree work" },
  { id: "home", label: "Palms at homes" },
  { id: "commercial", label: "Palms at condos & commercial" },
];

export default function Projects() {
  const [filter, setFilter] = useState<"all" | ProjectKind>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const list = filter === "all" ? projects : projects.filter((p) => p.kind === filter);
  const index = openId ? list.findIndex((p) => p.id === openId) : -1;
  const step = useCallback((delta: number) => {
    setOpenId((id) => {
      const i = list.findIndex((p) => p.id === id);
      return i === -1 ? id : list[(i + delta + list.length) % list.length].id;
    });
  }, [list]);

  return (
    <Layout>
      <SEOHead
        title="Completed Palm Tree Projects | Gulf Coast Palms"
        description="Browse completed palm trimming, diamond cutting, installation and removal projects by Gulf Coast Palms across Navarre and the Emerald Coast."
        canonicalUrl="/jobs"
      />
      <PageHero
        crumbs={[{ label: "Completed projects" }]}
        title="Jobs Completed"
        lead="Browse our recent work across the Emerald Coast. Every property gets the same professional care and attention to detail."
        placement="projects"
      />

      <section className="rd-section rd-section--tight">
        <div className="rd-wrap">
          <div className="rd-filter" role="group" aria-label="Show">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
            ))}
          </div>
          <ul className="rd-gallery">
            {list.map((p) => (
              <li key={p.id}>
                <button type="button" className="rd-gallery__item" onClick={() => setOpenId(p.id)} aria-label={`Open ${p.title}${p.city ? `, ${p.city}` : ""}`}>
                  <Photo src={p.photo} alt={p.alt} sizes="(min-width: 900px) 30vw, 46vw" />
                  <span className="rd-gallery__cap">
                    <b>{p.title}</b>
                    <span>{p.city ? `${p.city}, FL` : p.property}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <QuoteBand heading="Want yours to look like this?" text="Tell us about your trees or palms, your property and the work you have in mind." placement="projects_bottom" />

      <Lightbox project={index === -1 ? null : list[index]} position={index + 1} total={list.length} onClose={() => setOpenId(null)} onStep={step} />
    </Layout>
  );
}

const naturalWidth = (photo: Project["photo"]) => (typeof photo === "string" ? undefined : photo.img.w);

function Lightbox({ project, position, total, onClose, onStep }: { project: Project | null; position: number; total: number; onClose: () => void; onStep: (delta: number) => void }) {
  const startX = useRef<number | null>(null);
  useEffect(() => {
    if (!project) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onStep(1);
      else if (e.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [project, onStep]);

  return (
    <Dialog.Root open={project !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="rd-lightbox__veil" />
        {project && (
          <Dialog.Content className="rd rd-lightbox" aria-describedby={undefined}>
            <div
              className="rd-lightbox__photo"
              onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                if (startX.current === null) return;
                const dx = e.changedTouches[0].clientX - startX.current;
                startX.current = null;
                if (Math.abs(dx) > 48) onStep(dx < 0 ? 1 : -1);
              }}
            >
              {/* Never shown larger than the file itself, so a small photo stays sharp. */}
              <Photo key={project.id} src={project.photo} alt={project.alt} sizes="(min-width: 900px) 60vw, 100vw" eager style={{ maxWidth: naturalWidth(project.photo) }} />
            </div>
            <div className="rd-lightbox__side">
              <div className="rd-lightbox__bar">
                <span aria-hidden>{position} / {total}</span>
                <button type="button" className="rd-icon-btn" onClick={() => onStep(-1)} aria-label="Previous project"><ArrowLeftIcon size={20} /></button>
                <button type="button" className="rd-icon-btn" onClick={() => onStep(1)} aria-label="Next project"><ArrowRightIcon size={20} /></button>
                <Dialog.Close className="rd-icon-btn" aria-label="Close"><CloseIcon size={20} /></Dialog.Close>
              </div>
              <div className="rd-ticket" key={project.id}>
                <Dialog.Title className="rd-ticket__title">{project.title}</Dialog.Title>
                <dl>
                  {project.city && (<><dt>Where</dt><dd>{project.city}, FL</dd></>)}
                  <dt>Property</dt><dd>{project.property}</dd>
                  {project.need && (<><dt>Asked for</dt><dd>{project.need}</dd></>)}
                  <dt>Work</dt><dd>{project.work}</dd>
                  {project.result && (<><dt>Result</dt><dd>{project.result}</dd></>)}
                </dl>
                <div className="rd-ticket__actions">
                  <QuoteLink placement="projects_lightbox" service={project.service.label} className="rd-btn rd-btn--go">{project.service.ask}</QuoteLink>
                  <Link to={project.service.to} className="rd-link">About this service</Link>
                </div>
              </div>
            </div>
          </Dialog.Content>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
