/**
 * Words for the two pages the business most wants found in search: tree removal and
 * palm trimming/care. Kept as plain text with no photos, so the build can also put the
 * same words into each page's first HTML for search engines (src/seo/staticContent.ts).
 *
 * Nothing here is new information about the business. Each statement restates
 * something already published on the site, in plainer words:
 *   - how estimates, cleanup, haul-away and stump grinding work: the tree removal
 *     entry in src/data/services.ts and the matching answers in src/data/homeFaq.ts
 *   - what each kind of palm work is, how it is priced and how long a diamond cut
 *     lasts: the palm entries in src/data/services.ts
 *   - how often plans run: src/data/homeFaq.ts
 * The job descriptions say only what the photos show (src/assets/facebook/README.md).
 * Neither job has a city on record, so none is given.
 */

export interface CopyLink { label: string; to: string; note?: string }

/** The six communities the owner named, west to east, with their existing pages. */
export const priorityAreas: { city: string; to: string }[] = [
  { city: "Pensacola", to: "/palm-tree-trimming-pensacola-fl" },
  { city: "Gulf Breeze", to: "/palm-tree-trimming-gulf-breeze-fl" },
  { city: "Navarre", to: "/palm-tree-trimming-navarre-fl" },
  { city: "Fort Walton Beach", to: "/palm-tree-trimming-fort-walton-beach-fl" },
  { city: "Destin", to: "/palm-tree-trimming-destin-fl" },
  { city: "30A", to: "/palm-tree-trimming-30a-fl" },
];

export const treeRemovalCopy = {
  quoteLabel: "Request a Tree Removal Quote",
  job: {
    heading: "The removal in these frames",
    intro: "One job, filmed by our crew. This is what the three frames show.",
    facts: [
      { label: "The tree", text: "Tall and leaning, standing close beside a multi-story building." },
      { label: "In the way", text: "The building wall, on one side of the trunk." },
      { label: "What we removed", text: "The whole tree, cut at the base and brought down in one piece, away from the wall." },
      { label: "Afterwards", text: "The trunk on the ground, clear of the building. The last frame is the moment after the fall, before cleanup." },
    ],
  },
  answersHeading: "Estimates, cleanup and stumps",
  answers: [
    {
      heading: "How a tree removal estimate works",
      paragraphs: [
        "Estimates are free. We start with why the tree needs to come down, then look at the tree and the site: its size, the condition of the trunk and branches, any lean, and what stands near it.",
        "Photos taken from a safe distance help. Some jobs need a look on site before the scope can be confirmed. The written quote names the tree or trees, the agreed work, and the cleanup and haul-away scope.",
      ],
    },
    {
      heading: "What cleanup and haul-away include",
      paragraphs: [
        "Cleanup and haul-away are written into the quote, so you know what will be taken away and what will stay. Branches, trunk sections and existing debris can add up to very different amounts of material.",
        "If you want logs left on site, tell us where before you approve the quote.",
      ],
    },
    {
      heading: "When stump grinding is quoted separately",
      paragraphs: [
        "A removal quote covers the tree. Stump grinding is quoted separately, when you ask for it. Ask before you approve the removal, so you know what will remain.",
        "New planting and repairs to the surrounding landscaping are separate conversations too.",
      ],
    },
  ],
  linksHeading: "Related tree work and finished jobs",
  links: [
    { label: "Storm damage cleanup", note: "Fallen, broken and leaning trees", to: "/services/storm-damage-cleanup" },
    { label: "Tree trimming", note: "Clearance, dead and damaged branches", to: "/services/tree-trimming" },
    { label: "All tree services", note: "Everything we do for oaks and pines", to: "/services/tree-trimming-removal" },
    { label: "Completed projects", note: "Photos and job notes", to: "/jobs" },
  ] as CopyLink[],
  areasHeading: "Where we remove trees",
  areasText: "From Perdido Key to 30A. Each area page lists the tree and palm services offered there.",
};

export const palmCareCopy = {
  kindsHeading: "Four kinds of palm work, and how to tell them apart",
  kindsIntro: "A visit can be one of these or several together. Here is what each one changes on the palm.",
  canopy: {
    heading: "Trimming the canopy",
    text: "Dead, dying and damaged fronds come off. The healthy green canopy stays, so the crown ends up lighter and tidier, not stripped.",
    before: "Before: two sabals with dead fronds hanging under the crown.",
    after: "After: the same two palms, crowns trimmed.",
  },
  pods: {
    heading: "Removing seed pods and flower stalks",
    text: "The flower stalks and seed pods that grow under the crown are cut out in the same visit as the trim.",
  },
  boots: {
    heading: "Cleaning up old boots",
    text: "Boots are the old leaf bases left on the trunk. Here the ferns and old growth were cleared and the leaf bases cut back evenly. Taking the boots off altogether, down to the smooth trunk, is trunk skinning.",
    before: "Before: the trunk hidden under ferns and old growth.",
    after: "After: growth cleared, leaf bases cut back evenly.",
    link: { label: "Palm tree trunk skinning", to: "/services/palm-tree-trunk-skinning" } as CopyLink,
  },
  diamond: {
    heading: "Diamond-cutting the trunk",
    text: "In a diamond cut the leaf bases stay on the trunk and each one is shaped to an even diamond, which gives the trunk its cross-hatch pattern. It is popular on Canary Island date palms and sabals, and is priced per foot of trunk.",
    skinned: "Skinned: boots taken off, smooth trunk showing.",
    cut: "Diamond-cut: each leaf base shaped to an even diamond.",
    link: { label: "Palm diamond cutting", to: "/services/palm-diamond-cutting" } as CopyLink,
  },
  visitsHeading: "The first visit and the visits after it",
  first: {
    heading: "A larger first clean-up",
    paragraphs: [
      "A palm that has been left for a while needs more than a trim. On this date palm, old boots, dead growth and ferns came off the trunk and the crown was trimmed.",
      "Trunk work, skinning or diamond cutting, is priced per foot of trunk and can be done in the same visit as the trim.",
    ],
    before: "Before: old boots, dead growth and ferns on the trunk.",
    after: "After: the same palm, crown trimmed and trunk cleaned up.",
  },
  after: {
    heading: "Keeping it that way",
    paragraphs: [
      "After that, upkeep is lighter. Most palms here are trimmed once a year, usually April through early June, though it depends on the species and the condition of the palm. Canary Island date palms can benefit from a second light clean-up in the fall.",
      "A diamond cut typically holds its clean look for 12 to 24 months before it needs a touch-up.",
      "Maintenance plans typically run once or twice a year for homes, and quarterly for HOAs and commercial properties.",
    ],
    link: { label: "Palm tree maintenance plans", to: "/palm-tree-maintenance-plans" } as CopyLink,
  },
  linksHeading: "Each palm service has its own page",
  links: [
    { label: "Palm diamond cutting", note: "A clean cross-hatch finish on the trunk", to: "/services/palm-diamond-cutting" },
    { label: "Palm tree trunk skinning", note: "Old boots off for a smooth trunk", to: "/services/palm-tree-trunk-skinning" },
    { label: "Palm tree removal", note: "Dead, damaged or unwanted palms", to: "/services/palm-tree-removal" },
    { label: "Palm tree installation", note: "Sourced, delivered and planted", to: "/services/palm-tree-installation" },
    { label: "Palm tree maintenance plans", note: "Year-round scheduled trimming", to: "/palm-tree-maintenance-plans" },
    { label: "Palm tree cost", note: "What goes into the price", to: "/palm-tree-cost" },
  ] as CopyLink[],
  areasHeading: "Palm tree trimming by area",
};
