export interface ServiceData {
  scopeHeading?: string;
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
  /** Optional FAQ block. When present, ServicePage renders it visually AND
   *  emits matching FAQPage JSON-LD sourced from the same array. */
  faqs?: { q: string; a: string }[];
}

export const servicesData: ServiceData[] = [
{
  "slug": "tree-trimming-removal",
  "title": "Tree Trimming & Removal",
  "metaTitle": "Tree Trimming & Removal | Emerald Coast FL | Gulf Coast Palms",
  "metaDescription": "Tree trimming, removal and storm cleanup for oaks and pines across the Emerald Coast. Experienced crews and on-site evaluation. Call (850) 910-1290.",
  "heroSubheading": "Tree removal, trimming and storm cleanup across Northwest Florida, from Perdido Key to 30A.",
  "introParagraphs": [
    "Gulf Coast Palms provides general tree services as well as established palm care. Our experienced tree crews include an experienced climber. We work with property owners on trimming and removal for oaks and pines and on cleanup after storms. Whether a branch needs attention, a tree is in the wrong location or storm debris is blocking part of your property, the first step is understanding the site and the scope of work.",
    "Trimming, removal and storm cleanup are different jobs. Trimming focuses on selected branches and property goals; removal addresses a whole tree; storm work begins with the condition of fallen, broken or leaning trees and whether the site can be accessed. An on-site evaluation helps determine what can be undertaken and how the written scope should describe it.",
    "For properties with both trees and palms, tell us about both when requesting a quote. Palm trimming, installations, removals, diamond cutting and trunk skinning remain core services. We assess the work appropriate to each tree rather than applying a palm pruning approach to an oak or pine."
  ],
  "benefits": [
    "On-site review of tree condition and property goals",
    "Access and nearby structures considered",
    "Written scope for the agreed work",
    "Cleanup and haul-away scope discussed",
    "Stump grinding separately quoted when requested",
    "Tree and palm work discussed together"
  ],
  "scopeHeading": "Planning Your Tree Work",
  "secondaryHeading": "Choose the Service That Fits Your Property",
  "secondaryContent": [
    "Tree removal starts with the reason for removal, the tree’s size and condition, and its position relative to buildings, fences and access routes. Discuss stump grinding before approving the quote: it is separately quoted when requested, not automatically part of a tree removal.",
    "Tree trimming starts with your goals and a species-specific assessment. Clearance around a driveway, dead or damaged branches and the condition of an oak or pine influence which branches are considered. A request to make a tree smaller is not, by itself, a complete pruning scope.",
    "Storm cleanup requires evaluation before work is scheduled. Keep away from unstable trees and suspended branches. For downed wires or immediate danger, contact emergency services or the utility. Scheduling depends on safe access and conditions; a quote request is not emergency dispatch.",
    "Costs depend on tree size, condition, access, nearby structures and debris volume. Tell us whether branches or logs should be hauled away or left in an agreed location. The written scope should identify what is included and what is separately quoted, so you can compare the proposed work rather than just a headline price."
  ],
  "ctaHeading": "Request a Tree Service Quote",
  "ctaText": "Tell us what needs attention and how to access the property. Call or request a free quote for work across the Emerald Coast.",
  "relatedLinks": [
    {
      "label": "Tree Removal",
      "to": "/services/tree-removal"
    },
    {
      "label": "Tree Trimming",
      "to": "/services/tree-trimming"
    },
    {
      "label": "Storm Damage Cleanup",
      "to": "/services/storm-damage-cleanup"
    },
    {
      "label": "Palm Tree Trimming",
      "to": "/services/palm-tree-trimming"
    }
  ],
  "faqs": [
    {
      "q": "Do you work on trees as well as palms?",
      "a": "Yes. Gulf Coast Palms provides tree trimming and removal for oaks and pines, storm cleanup, and established palm care. Our experienced tree crews include an experienced climber."
    },
    {
      "q": "Which tree service should I request?",
      "a": "Choose Tree Trimming for branch work, Tree Removal for a whole tree, or Storm Damage Cleanup for fallen, broken or leaning trees after weather damage. If unsure, describe the situation in your quote request."
    },
    {
      "q": "What information helps with a tree quote?",
      "a": "Include the property address, the work you want, tree species if known, access limitations and nearby structures. Photos taken from a safe distance can help, but do not replace on-site evaluation where needed."
    },
    {
      "q": "Can you quote trees and palms at the same property?",
      "a": "Yes. Describe both in your request. Tree and palm work can be discussed together, with the agreed tasks and cleanup described in the written scope."
    }
  ]
},
{
  "slug": "tree-removal",
  "title": "Tree Removal",
  "metaTitle": "Tree Removal | Emerald Coast FL | Gulf Coast Palms",
  "metaDescription": "Tree removal for oaks and pines across Navarre, Pensacola, Destin and the Emerald Coast. Site assessment, written scope and cleanup planning. Free quotes.",
  "heroSubheading": "On-site assessment and a written removal scope for trees across the Emerald Coast.",
  "introParagraphs": [
    "Removing a tree is a property-specific decision. An oak or pine may be dead, damaged, poorly positioned or no longer compatible with your plans for the space. Gulf Coast Palms begins by discussing the reason for removal and evaluating the tree and site. Our experienced tree crews include an experienced climber; the approach to a particular job depends on the condition of the tree and the access available.",
    "The assessment considers size, trunk and branch condition, lean, surrounding vegetation and nearby structures. Buildings, fences, driveways and neighboring property affect the work area. Tell us about narrow gates, restricted parking, pets, underground irrigation or other access concerns when requesting a quote. Photos from a safe distance help explain the situation, but an on-site evaluation may be needed before the scope can be confirmed.",
    "The written quote should identify the tree or trees to be removed, the agreed work and the cleanup and haul-away scope. If you want logs left on-site, say where and discuss that before approval. Do not assume removal also includes stump grinding, new planting or repairs to surrounding landscaping; those tasks need to be discussed separately."
  ],
  "benefits": [
    "Tree and site assessment before confirming scope",
    "Access routes and nearby structures reviewed",
    "Identified trees and agreed work in a written scope",
    "Debris cleanup and haul-away scope agreed",
    "Stump grinding separately quoted when requested",
    "Property access and scheduling discussed"
  ],
  "scopeHeading": "Planning Your Tree Work",
  "secondaryHeading": "What Affects a Tree Removal Quote?",
  "secondaryContent": [
    "Tree size and species affect the amount and type of material involved. A broad oak canopy and a tall pine present different site considerations. Condition matters as well: broken limbs, decay or an unusual lean can change the evaluation and the work that can be undertaken.",
    "Access is a major factor. The distance between the tree and a usable access route, the width of gates and the space available around the tree all influence the scope. Nearby buildings or fences require site-specific planning. Tell us about the full setting, not just the height of the tree.",
    "Cleanup and haul-away should be explicit. Branches, trunk sections and existing debris can mean very different volumes of material. Ask what will be removed and what will remain after the agreed work. Stump grinding is separately quoted when requested, and any follow-on landscaping should be discussed before work begins.",
    "Local tree protection rules and property requirements may affect removal. Check applicable local requirements and obtain any required permission before work is scheduled. We do not promise that every tree can be removed or that every site is suitable. For downed wires or immediate danger, stay clear and contact emergency services or the utility rather than approaching the tree."
  ],
  "ctaHeading": "Request a Tree Removal Quote",
  "ctaText": "Tell us what needs attention and how to access the property. Call or request a free quote for work across the Emerald Coast.",
  "relatedLinks": [
    {
      "label": "Tree Services Overview",
      "to": "/services/tree-trimming-removal"
    },
    {
      "label": "Tree Trimming",
      "to": "/services/tree-trimming"
    },
    {
      "label": "Storm Damage Cleanup",
      "to": "/services/storm-damage-cleanup"
    },
    {
      "label": "Palm Tree Trimming",
      "to": "/services/palm-tree-trimming"
    }
  ],
  "faqs": [
    {
      "q": "Is stump grinding included in tree removal?",
      "a": "Stump grinding is separately quoted when requested. Ask about it before approving the removal scope so you understand what will remain and any follow-on work."
    },
    {
      "q": "Can you assess a tree near a building or fence?",
      "a": "Yes, nearby structures and property access are considered in the on-site evaluation. The assessment determines the proposed scope; it is not a promise that every removal can be undertaken."
    },
    {
      "q": "What affects the cost of removing an oak or pine?",
      "a": "Size, condition, access, nearby structures, debris volume and the agreed cleanup or haul-away scope affect the quote. We provide a property-specific quote rather than a fixed price by species."
    },
    {
      "q": "Should I check permission before removing a tree?",
      "a": "Yes. Local tree protection rules and property or HOA requirements can vary. Check the requirements that apply to your property and obtain any required permission before scheduling removal."
    },
    {
      "q": "What should I do if the tree is unstable?",
      "a": "Keep people and pets away from unstable trees and suspended limbs. If there are downed wires or immediate danger, contact emergency services or the utility. Do not approach to take close-up photos."
    }
  ]
},
{
  "slug": "tree-trimming",
  "title": "Tree Trimming",
  "metaTitle": "Tree Trimming | Emerald Coast FL | Gulf Coast Palms",
  "metaDescription": "Tree trimming for oaks and pines across the Emerald Coast. Species-specific assessment, clearance and dead or damaged branch work. Request a free quote.",
  "heroSubheading": "Tree trimming guided by condition, species and your property goals — not a one-size-fits-all cut.",
  "introParagraphs": [
    "Tree trimming begins with the reason for the work. You may need clearance along a driveway, want attention to dead or damaged branches, or need to discuss how a tree fits the use of your property. Gulf Coast Palms provides tree trimming for oaks and pines across the Emerald Coast, with an experienced crew and an experienced climber on the team.",
    "An on-site assessment considers the species, condition, branch structure and surroundings. The scope should describe the branches or areas being addressed and the goal of the work. Oaks, pines and palms have different growth patterns; established palm expertise does not mean applying the same pruning approach to every tree.",
    "Tell us what you want to change and what you want to retain. A view, shade, vehicle clearance and access to a walkway can be competing goals. The assessment helps define a practical scope instead of treating an instruction to “cut it back” as a complete plan. We do not promise that trimming will eliminate future storm damage or resolve every tree condition."
  ],
  "benefits": [
    "Property goals and tree condition discussed",
    "Species-specific on-site assessment",
    "Clearance needs around access routes reviewed",
    "Dead and damaged branches considered",
    "Agreed branch work described in writing",
    "Cleanup and haul-away scope confirmed"
  ],
  "scopeHeading": "Planning Your Tree Work",
  "secondaryHeading": "Planning Branch Work and Clearance",
  "secondaryContent": [
    "Clearance work needs a specific objective: for example, space for vehicles along a driveway or clearance over a frequently used walkway. Explain the normal use of the space and any access restrictions. Nearby structures and neighboring property should be considered before defining branch work.",
    "Dead and damaged branches need evaluation in the context of the rest of the tree. A branch that looks problematic from the ground may need closer assessment before the work can be specified. Keep away from suspended or broken limbs; do not try to inspect them by climbing or pulling on them.",
    "The timing and extent of trimming depend on species and condition, not just a fixed annual schedule. Ask what work is proposed for your oak or pine and why. Discuss the desired result before approval, including branches that should remain and any areas that must not be entered.",
    "Trimming costs depend on the size and condition of the tree, the extent of branch work, access and debris volume. The written scope should state what will be trimmed and how cleanup and haul-away will be handled. If a tree needs removal rather than branch work, that is a separate discussion and quote. Trees near downed wires or immediate danger should be addressed through emergency services or the utility, not a routine trimming request."
  ],
  "ctaHeading": "Request a Tree Trimming Quote",
  "ctaText": "Tell us what needs attention and how to access the property. Call or request a free quote for work across the Emerald Coast.",
  "relatedLinks": [
    {
      "label": "Tree Services Overview",
      "to": "/services/tree-trimming-removal"
    },
    {
      "label": "Tree Removal",
      "to": "/services/tree-removal"
    },
    {
      "label": "Storm Damage Cleanup",
      "to": "/services/storm-damage-cleanup"
    },
    {
      "label": "Palm Tree Trimming",
      "to": "/services/palm-tree-trimming"
    }
  ],
  "faqs": [
    {
      "q": "Do all trees need annual trimming?",
      "a": "No single schedule fits every tree. Species, condition, growth and your property goals guide the assessment and proposed work."
    },
    {
      "q": "Can trimming improve clearance along a driveway?",
      "a": "Clearance is one reason to request trimming. Tell us how the driveway is used and the space needed so the tree and nearby structures can be assessed before defining the scope."
    },
    {
      "q": "Do you trim oaks and pines differently from palms?",
      "a": "Yes. Species-specific assessment matters. Branch work for an oak or pine is different from removing palm fronds, flower stalks or seed pods."
    },
    {
      "q": "Will trimming guarantee protection from storm damage?",
      "a": "No. Trimming is not a guarantee against storm damage. We assess the tree and discuss the scope of branch work without promising a storm-proof result."
    },
    {
      "q": "What happens to the cut branches?",
      "a": "Cleanup and haul-away are discussed in the written scope. Tell us before approval if you want material left in an agreed location."
    }
  ]
},
{
  "slug": "storm-damage-cleanup",
  "title": "Storm Damage Cleanup",
  "metaTitle": "Storm Damage Cleanup | Emerald Coast FL | Gulf Coast Palms",
  "metaDescription": "Storm damage cleanup for fallen, broken and leaning trees across the Emerald Coast. On-site evaluation; scheduling subject to safe access and conditions.",
  "heroSubheading": "Professional on-site evaluation of storm-damaged trees, with scheduling subject to safe access and conditions.",
  "introParagraphs": [
    "Severe weather can leave fallen trees, broken limbs and trees with a new lean. Gulf Coast Palms provides storm damage cleanup across the Emerald Coast. The first step is evaluating the tree and surrounding property, not assuming that all storm debris is ready to move. Our experienced tree crews include an experienced climber, and the proposed work depends on the condition of the tree and the site.",
    "Stay clear of unstable trees, suspended branches and disturbed root areas. Keep people and pets out of the affected area. Do not stand beneath broken limbs or try to pull, cut or move a tree that may shift. If wires are down, treat them as dangerous and contact the utility or emergency services. For immediate danger, contact emergency services rather than waiting for a quote response.",
    "For a non-emergency service request, describe what happened, the property address, the affected access routes and any visible damage from a safe distance. Photos can help communicate the situation only when they can be taken without entering the hazard area. An on-site evaluation determines the scope that can be proposed."
  ],
  "benefits": [
    "Fallen, broken and leaning trees evaluated",
    "Property access and surrounding hazards reviewed",
    "Written scope for agreed tree and debris work",
    "Cleanup and haul-away requirements discussed",
    "Scheduling subject to safe access and conditions",
    "Utility and immediate-danger concerns referred appropriately"
  ],
  "scopeHeading": "Planning Your Tree Work",
  "secondaryHeading": "From Evaluation to Cleanup",
  "secondaryContent": [
    "A fallen tree may still contain tension, and broken branches can be supported by other branches or nearby objects. A newly leaning tree may have changed at the roots or trunk. These situations need professional on-site evaluation; a photo alone cannot establish that work can begin.",
    "Scheduling is subject to safe access, weather and site conditions. Blocked roads, saturated ground and continuing weather can affect when an evaluation or cleanup can take place. A submitted quote request is not an emergency dispatch, a guaranteed response deadline or a promise of round-the-clock staffing.",
    "The written scope should distinguish the storm-damaged tree work from general debris already on the property. Discuss branches, logs and haul-away requirements, and confirm what will be left on-site. Stump grinding, where requested, is separately quoted. Repairs to structures, utility work and other specialist tasks are not part of the service described here.",
    "Costs depend on the condition and size of the affected trees, access, nearby structures and the volume of debris in the agreed scope. If you need documents for your own records, discuss those needs when requesting the quote. We do not promise insurance reimbursement or claim specialist roof, utility-line or crane capabilities."
  ],
  "ctaHeading": "Request a Storm Damage Cleanup Quote",
  "ctaText": "Tell us what needs attention and how to access the property. Call or request a free quote for work across the Emerald Coast.",
  "relatedLinks": [
    {
      "label": "Tree Services Overview",
      "to": "/services/tree-trimming-removal"
    },
    {
      "label": "Tree Removal",
      "to": "/services/tree-removal"
    },
    {
      "label": "Tree Trimming",
      "to": "/services/tree-trimming"
    },
    {
      "label": "Palm Tree Trimming",
      "to": "/services/palm-tree-trimming"
    }
  ],
  "faqs": [
    {
      "q": "What should I do about a tree touching downed wires?",
      "a": "Stay away from the tree and wires, keep others clear and contact the utility or emergency services. Do not approach, cut or move anything touching or near the wires."
    },
    {
      "q": "Can I request cleanup for a fallen or leaning tree?",
      "a": "Yes. Describe the situation from a safe distance. A professional on-site evaluation is needed to determine the proposed work, with scheduling subject to safe access and conditions."
    },
    {
      "q": "How quickly can storm cleanup be scheduled?",
      "a": "Scheduling depends on safe access, weather, site conditions and availability. A quote request does not guarantee a response deadline or emergency dispatch."
    },
    {
      "q": "Should I move broken branches before the crew arrives?",
      "a": "Do not approach unstable trees, suspended limbs or material that may shift. Keep the affected area clear and wait for professional evaluation."
    },
    {
      "q": "Does storm cleanup include repairs or insurance reimbursement?",
      "a": "No repairs or insurance reimbursement are promised. The written scope describes agreed tree and debris work; utility or structural concerns require the appropriate service provider."
    }
  ]
},
  {
    slug: "palm-tree-trimming",
    title: "Palm Tree Trimming",
    metaTitle: "Palm Tree Trimming – Gulf Coast Palms | Emerald Coast FL",
    metaDescription: "Professional palm tree trimming for homes, HOAs & commercial properties across the Emerald Coast. Proper techniques for healthier, storm-ready palms.",
    heroSubheading: "Expert Trimming for Healthier, Storm-Ready Palms Across the Emerald Coast",
    introParagraphs: [
      "Gulf Coast Palms provides professional palm tree trimming throughout Northwest Florida — from Pensacola and Gulf Breeze to Navarre, Fort Walton Beach, Destin, 30A, and Perdido Key. Our team removes dead fronds, seed pods, flower stalks, and debris with precision, leaving your palms healthy, clean, and beautiful.",
      "Proper palm trimming is more than cosmetics — it's essential for storm resistance and long-term tree health. Over-trimming (sometimes called \"hurricane cutting\") actually weakens palms by removing live fronds that the tree needs for energy. Our experienced crew understands the difference between proper maintenance and harmful pruning.",
      "Whether you own a single property with a few palms or manage an HOA community with hundreds, we have the equipment, experience, and attention to detail to handle the job safely and efficiently. We frequently correct damage caused by aggressive trimming from inexperienced crews, restoring crown health and structural integrity."
    ],
    benefits: [
      "Removes loose or dead fronds that can become falling debris",
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
      "We're trusted by property managers, HOA boards, and homeowners across the Emerald Coast — with over a thousand properties served and 100+ five-star Google reviews."
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
    faqs: [
      {
        q: "How often should palm trees be trimmed in Florida?",
        a: "Most Florida palms need trimming once a year — typically April through early June — to remove dead fronds, seed pods, and flower stalks before summer storm season. Some species (like Canary Island Date Palms) benefit from a second light cleanup in the fall.",
      },
      {
        q: "Is hurricane cutting bad for palms?",
        a: "Yes. Over-trimming — sometimes marketed as \"hurricane cutting\" — removes healthy green fronds the tree needs for energy, which weakens the trunk over time and actually increases storm vulnerability. Proper trimming removes only dead, dying, or damaged fronds and preserves the healthy canopy.",
      },
      {
        q: "Do you trim palms for HOAs and commercial properties?",
        a: "Yes — HOAs, condo associations, resorts, and commercial properties across the Emerald Coast are a large part of what we do. We provide scheduled service, multi-palm discounts, single-invoice billing, and consistent crew assignments.",
      },
      {
        q: "How fast can I get a palm trimming quote?",
        a: "Fastest is a text photo to (850) 910-1290 — most photo quotes come back the same day. Free on-site estimates are also available and typically scheduled within 3–7 days.",
      },
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
    faqs: [
      {
        q: "Which palm species do you install on the Emerald Coast?",
        a: "We install Sabal, Canary Island Date, Mule, Pindo, Washingtonia, Mediterranean Fan, and other palms proven for NW Florida's coastal and inland conditions. We match species to your property's soil, salt exposure, sun, and cold tolerance.",
      },
      {
        q: "How much does palm installation cost?",
        a: "Installed cost depends on species, size, quantity, delivery distance, and site access. Sabal Palms typically start around $350 installed; Canary Island Date Palms are priced individually based on specimen and trunk height. Every quote is free.",
      },
      {
        q: "What's included in the 1-year establishment warranty?",
        a: "If a palm we install fails to establish due to installation-related issues within 12 months, we replace it at no additional cost. Warranty requires following the watering and care instructions we provide at planting.",
      },
      {
        q: "Do you deliver and plant, or delivery only?",
        a: "Every install includes delivery, staging, hand-planting at correct depth, root ball securing, initial watering, and soil conditioning — not just drop-off. Delivery-only isn't a service we offer for palm safety reasons.",
      },
    ],
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
    faqs: [
      {
        q: "How much does palm tree removal cost?",
        a: "Palm removal is priced per job based on palm height, trunk diameter, species, property access, and whether stump grinding is included. Most residential removals fall between $200 and $1,500. Free on-site quotes are available.",
      },
      {
        q: "Do you handle storm-damaged or leaning palms?",
        a: "Yes — we provide priority emergency response across the Emerald Coast for storm-damaged, split, or dangerously leaning palms. We handle the removal, cleanup, and can provide documentation for insurance claims when authorized.",
      },
      {
        q: "Do you grind the stump too?",
        a: "Stump grinding is available as an add-on to any palm removal — most homeowners choose it so the site is ready for replanting or landscaping. Ask when you request your quote.",
      },
      {
        q: "Can a dying palm be saved instead of removed?",
        a: "Sometimes — it depends on the cause. Nutrient deficiency and improper trimming damage can often be corrected. Lethal yellowing, advanced trunk rot, and Ganoderma butt rot cannot. We'll assess and give you an honest recommendation.",
      },
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
    faqs: [
      {
        q: "What is palm diamond cutting?",
        a: "Diamond cutting is a specialized trimming technique that sculpts the leaf-base stubs on a palm trunk into a clean diamond / cross-hatch pattern. It's the signature look you see on Canary Island Date Palms at luxury resorts.",
      },
      {
        q: "How much does diamond cutting cost?",
        a: "Diamond cutting is priced per foot of trunk height being cleaned, and varies with species, boot density, and access. Most single-palm jobs run $150–$500. Every quote is free.",
      },
      {
        q: "Which palms can be diamond cut?",
        a: "Diamond cutting is most striking on Canary Island Date Palms and other species with prominent trunk boots — Sylvester and mature Sabal Palms are also candidates. Smooth-trunked palms (Royal, Washingtonia) aren't suitable.",
      },
      {
        q: "How long does a diamond cut last?",
        a: "A properly done diamond cut typically holds its clean look for 12–24 months before touch-ups are needed, depending on growth rate and species.",
      },
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
    faqs: [
      {
        q: "What is palm trunk skinning?",
        a: "Trunk skinning removes the old leaf-base \"boots\" from the palm trunk, revealing the smooth inner bark beneath. It gives palms a clean, resort-grade appearance and removes hiding places for rodents and insects.",
      },
      {
        q: "How much does trunk skinning cost?",
        a: "Trunk skinning is priced per foot of trunk height being cleaned. Most single-palm jobs run $100–$400 depending on trunk height, species, and boot density. Every quote is free.",
      },
      {
        q: "Will skinning hurt the palm?",
        a: "Not when done correctly. Skinning removes only the dead outer boot material — cutting too deep can damage the trunk's vascular tissue, which is why proper technique matters. Our crews are experienced with this specific service.",
      },
      {
        q: "Should I combine skinning with trimming or diamond cutting?",
        a: "Yes — combining trunk skinning with a crown trim and (on suitable species) diamond cutting delivers the full \"resort makeover\" look in a single visit and usually reduces the per-service cost.",
      },
    ],
  },
];

export const serviceNavLinks = [
  ...servicesData.map((s) => ({
    label: s.title,
    to: `/services/${s.slug}`,
  })),
  { label: "Landscaping Services", to: "/services/landscaping-services" },
  { label: "HOA & Commercial Maintenance", to: "/hoa-commercial-palm-maintenance" },
  { label: "Hurricane Palm Preparation", to: "/hurricane-palm-preparation" },
];

/** Grouped navigation retains every existing public service label. */
export const serviceGroups = [
  { label: "Tree Services", links: serviceNavLinks.filter((link) => ["Tree Trimming & Removal", "Tree Removal", "Tree Trimming", "Storm Damage Cleanup"].includes(link.label)) },
  { label: "Palm Care", links: serviceNavLinks.filter((link) => link.to.includes("palm") || link.to.includes("hoa-commercial")) },
  { label: "Property Services", links: serviceNavLinks.filter((link) => link.label === "Landscaping Services") },
];
export const treeServiceLinks = serviceGroups[0].links.filter((link) => link.to !== "/services/tree-trimming-removal");
