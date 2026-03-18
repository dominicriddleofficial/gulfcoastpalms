export interface ServiceData {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroSubheading: string;
  introParagraphs: string[];
  benefits: string[];
  secondaryHeading: string;
  secondaryContent: string[];
  ctaHeading: string;
  ctaText: string;
  relatedLinks: { label: string; to: string }[];
  procesSteps?: { step: string; description: string }[];
  bundleSection?: { heading: string; content: string[] };
  warrantySection?: { heading: string; content: string[] };
}

export const servicesData: ServiceData[] = [
  {
    slug: "palm-tree-trimming",
    title: "Palm Tree Trimming",
    metaTitle: "Palm Tree Trimming – Gulf Coast Palms | Emerald Coast FL",
    metaDescription: "Professional palm tree trimming for homes, HOAs & commercial properties across the Emerald Coast. Proper techniques for healthier, storm-ready palms.",
    heroSubheading: "Expert Trimming for Healthier, Storm-Ready Palms Across the Emerald Coast",
    introParagraphs: [
      "Gulf Coast Palms provides professional palm tree trimming throughout Northwest Florida — from Pensacola and Gulf Breeze to Navarre, Fort Walton Beach, Destin, 30A, and Perdido Key. Our team removes dead fronds, seed pods, flower stalks, and debris with precision, leaving your palms healthy, clean, and beautiful.",
      "Proper palm trimming is more than cosmetics — it's essential for storm resistance and long-term tree health. Over-trimming (sometimes called \"hurricane cutting\") actually weakens palms by removing live fronds that the tree needs for energy. Our certified crew understands the difference between proper maintenance and harmful pruning.",
      "Whether you own a single property with a few palms or manage an HOA community with hundreds, we have the equipment, experience, and attention to detail to handle the job safely and efficiently. We frequently correct damage caused by aggressive trimming from inexperienced crews, restoring crown health and structural integrity."
    ],
    benefits: [
      "Prevents storm damage from loose or dead fronds",
      "Promotes healthier, stronger palm growth",
      "Improves property curb appeal and value",
      "Safe removal of seed pods & flower stalks",
      "Proper technique preserves the palm's natural canopy",
      "Experienced with large-scale HOA & commercial properties"
    ],
    secondaryHeading: "Why Proper Trimming Matters",
    secondaryContent: [
      "Many homeowners and even some tree services don't realize that improper palm trimming can cause permanent damage. Cutting live, green fronds reduces the palm's ability to photosynthesize and produce energy. This weakens the trunk over time and makes the tree more susceptible to disease, nutrient deficiency, and storm damage.",
      "At Gulf Coast Palms, we follow industry best practices: only removing dead, dying, or damaged fronds while preserving the healthy canopy. This approach keeps your palms looking great while maximizing their strength and lifespan.",
      "We're trusted by property managers, HOA boards, and homeowners across the Emerald Coast — with over 500 palm jobs completed in 2025 alone."
    ],
    ctaHeading: "Need Professional Palm Trimming?",
    ctaText: "Text us a photo of your palms for an instant quote. We serve the entire Emerald Coast from Pensacola to 30A.",
    relatedLinks: [
      { label: "Palm Tree Installation", to: "/services/palm-tree-installation" },
      { label: "Buy Palm Trees", to: "/palm-trees/buy" },
      { label: "Palm Diamond Cutting", to: "/services/palm-diamond-cutting" },
      { label: "Palm Care Guides", to: "/palm-trees/guides" },
      { label: "Palm Tree Cost", to: "/palm-tree-cost" },
    ],
  },
  {
    slug: "palm-tree-installation",
    title: "Palm Tree Installation",
    metaTitle: "Palm Tree Installation – Gulf Coast Palms | Emerald Coast FL",
    metaDescription: "Professional palm tree installation with 1-year warranty. We source, deliver, and hand-plant premium palms across the Florida Emerald Coast.",
    heroSubheading: "Premium Palm Installation with Expert Planting & a 1-Year Warranty",
    introParagraphs: [
      "Transform your property with professionally installed palm trees from Gulf Coast Palms. Whether you're adding a single statement palm or landscaping an entire waterfront estate, we handle every step — from species selection and sourcing to delivery, planting, and aftercare.",
      "We install Canary Island Date Palms, Sabal Palms, Mule Palms, Pindo Palms, Washingtonia Palms, and more. Each palm is hand-selected for quality and matched to your property's soil conditions, sun exposure, and aesthetic goals.",
      "Every palm installed by Gulf Coast Palms includes a 1-year establishment warranty, because we stand behind our work and your investment."
    ],
    benefits: [
      "Expert species selection for your property",
      "High-quality palms sourced from trusted nurseries",
      "Professional equipment for safe delivery & staging",
      "Hand-planted with proper root ball technique",
      "Initial watering and soil conditioning included",
      "1-year establishment warranty on every install"
    ],
    secondaryHeading: "Why Choose Professional Installation?",
    secondaryContent: [
      "Planting a palm tree isn't as simple as digging a hole. Proper installation requires understanding the right planting depth, soil drainage, root ball handling, and initial care regimen. A palm planted too deep or in poorly drained soil can develop root rot within months.",
      "Our team has installed palms at waterfront estates, HOA communities, commercial properties, and residential homes across the Emerald Coast. We know the local soil conditions, salt exposure challenges, and climate factors that affect palm establishment in Northwest Florida.",
      "When you choose Gulf Coast Palms, you're not just getting a tree in the ground — you're getting expert horticultural knowledge and ongoing support to ensure your palms thrive for decades."
    ],
    ctaHeading: "Ready to Add Palms to Your Property?",
    ctaText: "Text us a photo of your property for an instant installation quote.",
    relatedLinks: [
      { label: "Buy Palm Trees", to: "/palm-trees/buy" },
      { label: "Palm Tree Types", to: "/palm-trees/types" },
      { label: "Palm Tree Trimming", to: "/services/palm-tree-trimming" },
      { label: "Palm Tree Cost", to: "/palm-tree-cost" },
    ],
    procesSteps: [
      { step: "Choose the Right Palm", description: "We help you select the perfect palm species based on your property's conditions, aesthetic goals, and budget." },
      { step: "Source Healthy, High-Quality Palms", description: "We source premium palms from trusted nurseries, hand-selecting each tree for health, form, and size." },
      { step: "Deliver Palms to Your Property", description: "Our crew delivers palms to your property and stages them in optimal positions before planting." },
      { step: "Professionally Plant & Secure Root Ball", description: "Each palm is hand-planted at the correct depth with proper root ball handling to ensure healthy establishment." },
      { step: "Initial Watering & Soil Conditioning", description: "We complete initial watering, apply appropriate soil amendments, and provide care instructions for the first 90 days." },
    ],
    bundleSection: {
      heading: "Installation + Maintenance Bundle",
      content: [
        "Keep your new palms healthy and hurricane-safe year after year with our Installation + Maintenance Bundle. Customers who install palms through Gulf Coast Palms can schedule yearly trimming services at a preferred rate.",
        "Regular maintenance ensures your palms develop strong crowns, maintain their shape, and stay prepared for Florida's storm season. We'll track your palms' growth and adjust trimming schedules based on species and maturity.",
        "Bundle customers receive priority scheduling, consistent crew assignments, and documented maintenance history for each palm on their property."
      ],
    },
    warrantySection: {
      heading: "1-Year Palm Establishment Warranty",
      content: [
        "Every palm tree installed by Gulf Coast Palms includes a 1-year establishment warranty. If a palm fails to thrive due to installation-related issues within the first year, we'll replace it at no additional cost.",
        "This warranty reflects our confidence in our planting techniques, species selection, and the quality of palms we source. We want your investment to grow — literally.",
        "Warranty terms require following our recommended watering and care guidelines provided at installation."
      ],
    },
  },
  {
    slug: "palm-tree-removal",
    title: "Palm Tree Removal",
    metaTitle: "Palm Tree Removal – Gulf Coast Palms | Emerald Coast FL",
    metaDescription: "Safe, professional palm tree removal across the Emerald Coast. Licensed & insured crews with proper equipment for any size job.",
    heroSubheading: "Safe, Professional Palm Removal for Properties of Any Size",
    introParagraphs: [
      "Sometimes a palm tree needs to come down — whether it's dead, diseased, storm-damaged, or simply in the wrong location. Gulf Coast Palms provides safe, professional palm tree removal throughout the Emerald Coast, from Pensacola to 30A and everywhere in between.",
      "Our licensed and insured crew uses professional equipment to remove palms of any height with minimal impact to your surrounding landscape. We handle everything from small residential removals to large-scale clearing projects for commercial and HOA properties.",
      "Every removal includes complete debris cleanup and haul-away, so your property is left clean and ready for whatever comes next — whether that's a new palm installation, landscaping, or simply open space."
    ],
    benefits: [
      "Licensed & insured professional crews",
      "Safe removal of palms at any height",
      "Minimal impact to surrounding landscape",
      "Complete debris cleanup & haul-away",
      "Stump grinding available",
      "Emergency storm damage removal"
    ],
    secondaryHeading: "When Should a Palm Be Removed?",
    secondaryContent: [
      "Dead or dying palms are more than an eyesore — they're a safety hazard, especially during Florida's hurricane season. A dead palm can shed heavy fronds or even topple in high winds, risking damage to your home, vehicles, or neighboring properties.",
      "Common signs a palm needs removal include: a completely brown or bare crown, trunk cracks or leaning, fungal growth at the base, and failure to produce new fronds. If you're unsure, our team can evaluate your palm and recommend the best course of action.",
      "In many cases, we can transplant a healthy palm rather than remove it, saving the tree while solving the space or placement issue."
    ],
    ctaHeading: "Need a Palm Removed Safely?",
    ctaText: "Text us a photo for an instant removal estimate. We'll assess the situation and handle it safely.",
    relatedLinks: [
      { label: "Palm Tree Installation", to: "/services/palm-tree-installation" },
      { label: "Palm Tree Trimming", to: "/services/palm-tree-trimming" },
      { label: "Palm Tree Cost", to: "/palm-tree-cost" },
    ],
  },
  {
    slug: "palm-diamond-cutting",
    title: "Palm Diamond Cutting",
    metaTitle: "Palm Diamond Cutting – Gulf Coast Palms | Emerald Coast FL",
    metaDescription: "Precision diamond cutting for palm trees. Resort-quality trunk patterns for homes, HOAs & commercial properties on the Emerald Coast.",
    heroSubheading: "Resort-Quality Diamond Cut Patterns That Transform Your Palms",
    introParagraphs: [
      "Diamond cutting is a specialized palm trimming technique that creates a distinctive cross-hatch pattern on palm trunks by carefully sculpting the leaf base stubs. This resort-style finish transforms ordinary palms into stunning landscape focal points that turn heads and elevate your property's curb appeal.",
      "Gulf Coast Palms is one of the few companies on the Emerald Coast that specializes in precision diamond cutting. Our crew creates clean, consistent patterns that last and enhance the palm's natural beauty — the kind of finish you see at luxury resorts, beachfront hotels, and high-end properties.",
      "Diamond cutting is popular for Canary Island Date Palms, Sabal Palms, and other species with prominent trunk boots. It's a dramatic upgrade that sets your property apart from the rest of the neighborhood. Diamond cutting is priced per foot of trunk height being cleaned."
    ],
    benefits: [
      "Resort-quality trunk appearance",
      "Unique diamond-shaped geometric pattern",
      "Long-lasting visual impact",
      "Perfect for high-end & waterfront properties",
      "Enhances property value & curb appeal",
      "Specialist technique — not offered by most companies"
    ],
    secondaryHeading: "The Art of Diamond Cutting",
    secondaryContent: [
      "Diamond cutting requires skill, patience, and an understanding of palm anatomy. Each cut must be made at the correct angle and depth to create the signature diamond pattern without damaging the trunk's living tissue beneath.",
      "Our team has perfected this technique over hundreds of jobs across the Emerald Coast. We're trusted by property owners in Destin, Gulf Breeze, Navarre, and Pensacola to deliver consistent, beautiful results every time.",
      "Pair diamond cutting with trunk skinning and crown trimming for a complete palm makeover that gives your property a five-star resort feel."
    ],
    ctaHeading: "Want Resort-Quality Diamond Cuts?",
    ctaText: "Text us a photo for an instant diamond cutting quote.",
    relatedLinks: [
      { label: "Palm Tree Trimming", to: "/services/palm-tree-trimming" },
      { label: "Palm Tree Trunk Skinning", to: "/services/palm-tree-trunk-skinning" },
      { label: "Palm Tree Types", to: "/palm-trees/types" },
      { label: "Palm Tree Cost", to: "/palm-tree-cost" },
    ],
  },
  {
    slug: "palm-tree-trunk-skinning",
    title: "Palm Tree Trunk Skinning",
    metaTitle: "Palm Tree Trunk Skinning – Gulf Coast Palms | Emerald Coast FL",
    metaDescription: "Professional trunk skinning for a smooth, polished palm appearance. Eliminate pest habitats and enhance curb appeal across the Emerald Coast.",
    heroSubheading: "Smooth, Clean Trunks for a Polished, Resort-Quality Appearance",
    introParagraphs: [
      "Trunk skinning removes the old leaf bases — known as \"boots\" — from the palm trunk, revealing the smooth inner bark beneath. This gives your palms a sleek, manicured appearance that's commonly seen at luxury resorts and coastal properties across the Emerald Coast.",
      "Beyond aesthetics, trunk skinning serves a practical purpose: those old boot stubs create crevices where rodents, insects, and other pests love to nest. Removing them discourages pest activity and makes your palms easier to inspect for health issues.",
      "Gulf Coast Palms uses proper skinning techniques that avoid damaging the trunk's living tissue. Trunk skinning is priced per foot of trunk height being cleaned. Improper skinning can scar the trunk permanently, so it's essential to hire experienced professionals who understand palm anatomy."
    ],
    benefits: [
      "Smooth, clean trunk finish",
      "Eliminates pest & rodent habitats",
      "Enhances the palm's natural silhouette",
      "Low-maintenance, long-lasting result",
      "Pairs perfectly with diamond cutting",
      "Proper technique prevents trunk damage"
    ],
    secondaryHeading: "Why Professional Skinning Matters",
    secondaryContent: [
      "While trunk skinning might look straightforward, it requires knowledge of how deep to cut and when to stop. Cutting too deep can damage the vascular tissue beneath, leading to scarring, disease entry points, and even structural weakness.",
      "Our crew has skinned hundreds of palms across Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, and Destin. We deliver clean, consistent results that enhance your palms' appearance without compromising their health.",
      "Trunk skinning is often paired with diamond cutting and crown trimming for a complete palm transformation. Ask about our full-service palm makeover packages."
    ],
    ctaHeading: "Ready for a Palm Makeover?",
    ctaText: "Text us a photo for an instant trunk skinning quote.",
    relatedLinks: [
      { label: "Palm Diamond Cutting", to: "/services/palm-diamond-cutting" },
      { label: "Palm Tree Trimming", to: "/services/palm-tree-trimming" },
      { label: "Palm Tree Types", to: "/palm-trees/types" },
      { label: "Palm Tree Cost", to: "/palm-tree-cost" },
    ],
  },
];

export const serviceNavLinks = [
  ...servicesData.map((s) => ({
    label: s.title,
    to: `/services/${s.slug}`,
  })),
  { label: "Tree Trimming & Removal", to: "/services/tree-trimming-removal" },
  { label: "Landscaping Services", to: "/services/landscaping-services" },
  { label: "HOA & Commercial Maintenance", to: "/hoa-commercial-palm-maintenance" },
  { label: "Hurricane Palm Preparation", to: "/hurricane-palm-preparation" },
];
