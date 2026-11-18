/**
 * The words search engines read in each page's first HTML, for the pages the redesign
 * changes. Used by src/seo/staticContent.ts, and only once the redesign is live
 * (live.mjs), so the current site's HTML is untouched until then.
 *
 * The text is the same text the rebuilt pages show: headings from seo.data.mjs, the
 * tree removal and palm care sections from data/priorityCopy.ts.
 */
import type { StaticBlock, StaticPageContent } from "@/seo/staticContent";
import { palmCareCopy as palm, priorityAreas, treeRemovalCopy as tree, type CopyLink } from "./data/priorityCopy";
import { redesignSeo } from "./seo.data.mjs";

const links = (items: CopyLink[]) => items.map((item) => ({ label: item.label, href: item.to }));
const areaLinks = (label: (city: string) => string) => [
  ...priorityAreas.map((area) => ({ label: label(area.city), href: area.to })),
  { label: "All service areas", href: "/service-areas" },
];

/** Put `extra` in front of the first block whose heading matches, or at the end. */
function before(blocks: StaticBlock[], heading: string, extra: StaticBlock[]): StaticBlock[] {
  const at = blocks.findIndex((block) => block.heading === heading);
  return at < 0 ? [...blocks, ...extra] : [...blocks.slice(0, at), ...extra, ...blocks.slice(at)];
}

export function applyRedesignStatic(out: Record<string, StaticPageContent>): void {
  const seo = redesignSeo as Record<string, { h1?: string; lead?: string }>;

  const home = out["/"];
  if (home) {
    home.h1 = seo["/"]?.h1 ?? home.h1;
    home.subheading = seo["/"]?.lead ?? home.subheading;
    home.blocks = [
      {
        links: [
          { label: "Tree removal on the Emerald Coast", href: "/services/tree-removal" },
          { label: "Palm tree trimming and care", href: "/services/palm-tree-trimming" },
        ],
      },
      ...home.blocks,
    ];
  }

  const removal = out["/services/tree-removal"];
  if (removal) {
    removal.h1 = seo["/services/tree-removal"]?.h1 ?? removal.h1;
    removal.subheading = seo["/services/tree-removal"]?.lead ?? removal.subheading;
    const top: StaticBlock[] = [
      { heading: tree.job.heading, paragraphs: [tree.job.intro], list: tree.job.facts.map((fact) => `${fact.label}: ${fact.text}`) },
      { heading: tree.answersHeading },
      ...tree.answers.map((answer) => ({ heading: answer.heading, paragraphs: answer.paragraphs })),
    ];
    const tail: StaticBlock[] = [
      { heading: tree.linksHeading, links: links(tree.links) },
      { heading: tree.areasHeading, paragraphs: [tree.areasText], links: areaLinks((city) => city) },
    ];
    removal.blocks = before([...top, ...removal.blocks].filter((block) => block.heading !== "Related Services"), "Request a Tree Removal Quote", tail);
  }

  const care = out["/services/palm-tree-trimming"];
  if (care) {
    care.h1 = seo["/services/palm-tree-trimming"]?.h1 ?? care.h1;
    care.subheading = seo["/services/palm-tree-trimming"]?.lead ?? care.subheading;
    const top: StaticBlock[] = [
      { heading: palm.kindsHeading, paragraphs: [palm.kindsIntro] },
      { heading: palm.canopy.heading, paragraphs: [palm.canopy.text] },
      { heading: palm.pods.heading, paragraphs: [palm.pods.text] },
      { heading: palm.boots.heading, paragraphs: [palm.boots.text], links: links([palm.boots.link]) },
      { heading: palm.diamond.heading, paragraphs: [palm.diamond.text], links: links([palm.diamond.link]) },
    ];
    const visits: StaticBlock[] = [
      { heading: palm.visitsHeading },
      { heading: palm.first.heading, paragraphs: palm.first.paragraphs },
      { heading: palm.after.heading, paragraphs: palm.after.paragraphs, links: links([palm.after.link]) },
    ];
    const tail: StaticBlock[] = [
      { heading: palm.linksHeading, links: links(palm.links) },
      { heading: palm.areasHeading, links: areaLinks((city) => `Palm tree trimming in ${city}`) },
    ];
    const withVisits = before([...top, ...care.blocks].filter((block) => block.heading !== "Related Services"), "Why Proper Trimming Matters", visits);
    care.blocks = before(withVisits, "Need Professional Palm Trimming?", tail);
  }
}
