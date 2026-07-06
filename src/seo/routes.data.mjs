/**
 * Raw route data — plain ESM so both the runtime TS side (`routeMeta.ts`)
 * and the post-build prerender script (`scripts/prerender-meta.mjs`) can
 * consume the exact same array. Do not edit these entries in isolation —
 * see `src/seo/routeMeta.ts` for the typed public API.
 */

export const SITE_ORIGIN = "https://gulfcoastpalmservices.com";
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.jpg`;
export const DEFAULT_OG_IMAGE_ALT =
  "Gulf Coast Palms — professional palm tree trimming, installation, and removal across Florida's Emerald Coast";

export const rawRoutes = [
  { path: "/", title: "Gulf Coast Palms | Palm Tree Services in Navarre, FL", description: "Palm tree trimming, removal, installation & hurricane prep across Navarre, Gulf Breeze, Pensacola & Destin. 5.0★ · free quotes — call (850) 910-1290." },
  { path: "/services", title: "Palm Tree Services — Trimming, Removal, Installation | Gulf Coast Palms", description: "Full-service palm care across NW Florida: trimming, diamond cutting, trunk skinning, installation, removal & hurricane prep. Free estimates — (850) 910-1290." },
  { path: "/services/palm-tree-trimming", title: "Palm Tree Trimming – Gulf Coast Palms | Emerald Coast FL", description: "Professional palm tree trimming for homes, HOAs & commercial properties across the Emerald Coast. Proper technique, storm-ready palms — call (850) 910-1290." },
  { path: "/services/palm-tree-installation", title: "Palm Tree Installation – Gulf Coast Palms | Emerald Coast FL", description: "Palm tree installation with a 1-year warranty. We source, deliver & hand-plant premium palms across the Florida Emerald Coast. Free quote (850) 910-1290." },
  { path: "/services/palm-tree-removal", title: "Palm Tree Removal – Gulf Coast Palms | Emerald Coast FL", description: "Safe, professional palm tree removal across the Emerald Coast. Licensed & insured crews, proper equipment for any size job. Free quote — (850) 910-1290." },
  { path: "/services/palm-diamond-cutting", title: "Palm Diamond Cutting – Gulf Coast Palms | Emerald Coast FL", description: "Precision diamond cutting for palms — resort-quality trunk patterns for homes, HOAs & commercial properties on the Emerald Coast. Call (850) 910-1290." },
  { path: "/services/palm-tree-trunk-skinning", title: "Palm Tree Trunk Skinning – Gulf Coast Palms | Emerald Coast FL", description: "Professional trunk skinning for a smooth, polished palm appearance. Eliminate pest habitats and boost curb appeal across the Emerald Coast — (850) 910-1290." },
  { path: "/services/tree-trimming-removal", title: "Tree Trimming & Removal Pensacola | Oak, Pine & Crape Myrtle | Gulf Coast Palms", description: "Professional tree trimming & removal in Pensacola, Navarre, Gulf Breeze & Destin. Oaks, pines, crape myrtles. Licensed & insured — free quote (850) 910-1290." },
  { path: "/services/landscaping-services", title: "Landscaping Services NW Florida — Mulch, Sod, Hedges | Gulf Coast Palms", description: "Hedge trimming, mulch, pine straw, sod install & bed cleanups across Pensacola, Navarre, Destin & the Emerald Coast. Free estimate — call (850) 910-1290." },
  { path: "/palm-tree-maintenance-plans", title: "Palm Tree Maintenance Plans NW Florida | Gulf Coast Palms", description: "Year-round palm maintenance: scheduled trimming, health checks & hurricane prep across Navarre, Pensacola & Destin. Lock in your plan — (850) 910-1290." },
  { path: "/palm-tree-trimming-pensacola-fl", title: "Palm Tree Trimming Pensacola FL | Gulf Coast Palms", description: "Professional palm tree trimming in Pensacola, FL. Diamond cutting, trunk skinning, installs & removals. 5.0★ · 100+ reviews · free estimates. (850) 910-1290." },
  { path: "/palm-tree-trimming-gulf-breeze-fl", title: "Palm Tree Trimming Gulf Breeze FL | Gulf Coast Palms", description: "Expert palm tree trimming in Gulf Breeze, FL. Resort-quality diamond cutting, trunk skinning & coastal palm care. 5.0★ · 100+ reviews · (850) 910-1290." },
  { path: "/palm-tree-trimming-navarre-fl", title: "Palm Tree Trimming Navarre FL | Gulf Coast Palms", description: "Navarre's leading palm tree trimming crew. Diamond cutting, trunk skinning & large-scale palm care. 5.0★ · 100+ reviews · free estimates — (850) 910-1290." },
  { path: "/palm-tree-trimming-fort-walton-beach-fl", title: "Palm Tree Trimming Fort Walton Beach FL | Gulf Coast Palms", description: "Palm tree trimming in Fort Walton Beach, FL. Diamond cutting, trunk skinning & condo palm care. 5.0★ · 100+ reviews · free estimates — (850) 910-1290." },
  { path: "/palm-tree-trimming-destin-fl", title: "Palm Tree Trimming Destin FL | Diamond Cutting | Gulf Coast Palms", description: "Palm tree trimming in Destin, FL. Diamond cutting specialists for luxury homes, HOAs & vacation rentals. 5.0★ · 100+ reviews · free quote — (850) 910-1290." },
  { path: "/palm-tree-trimming-30a-fl", title: "Palm Tree Trimming 30A Florida | Gulf Coast Palms", description: "Premium palm tree trimming along 30A, FL — Rosemary Beach, Alys Beach, WaterColor & Seaside. Diamond cutting & precision palm care. Call (850) 910-1290." },
  { path: "/palm-tree-trimming-perdido-key-fl", title: "Palm Tree Trimming Perdido Key FL | Gulf Coast Palms", description: "Palm tree trimming on Perdido Key, FL. Diamond cutting & condo palm care for barrier island properties. 5.0★ · 100+ reviews · free quote — (850) 910-1290." },
  { path: "/palm-tree-trimming-perdido-fl", title: "Palm Tree Trimming Perdido FL | Gulf Coast Palms", description: "Palm tree trimming in Perdido, FL — Innerarity Point, Perdido Bay & the bay-front communities west of Pensacola. 5.0★ · 100+ reviews — (850) 910-1290." },
  { path: "/palm-tree-trimming-niceville-fl", title: "Palm Tree Trimming Niceville FL | Gulf Coast Palms", description: "Palm tree trimming in Niceville, FL — Bluewater Bay, Rocky Bayou & Twin Cities. 5.0★ · 100+ reviews · free estimates — call (850) 910-1290." },
  { path: "/palm-tree-trimming-mary-esther-fl", title: "Palm Tree Trimming Mary Esther FL | Gulf Coast Palms", description: "Palm tree trimming in Mary Esther, FL. Trusted by military families & property managers near Hurlburt Field. 5.0★ · 100+ reviews — call (850) 910-1290." },
  { path: "/palm-tree-trimming-santa-rosa-beach-fl", title: "Palm Tree Trimming Santa Rosa Beach FL | 30A | Gulf Coast Palms", description: "Premium palm tree trimming in Santa Rosa Beach, FL — WaterColor, WaterSound & 30A luxury homes. 5.0★ · 100+ reviews · free quote — (850) 910-1290." },
  { path: "/palm-tree-trimming-pace-fl", title: "Palm Tree Trimming Pace FL | Gulf Coast Palms", description: "Palm tree trimming in Pace, FL. Serving Santa Rosa County's fastest-growing community. 5.0★ · 100+ reviews · free estimates — (850) 910-1290." },
  { path: "/palm-tree-trimming-milton-fl", title: "Palm Tree Trimming Milton FL | Gulf Coast Palms", description: "Palm tree trimming in Milton, FL — Blackwater River to Highway 90. 5.0★ · 100+ reviews · free estimates — call Gulf Coast Palms at (850) 910-1290." },
  { path: "/palm-tree-trimming-crestview-fl", title: "Palm Tree Trimming Crestview FL | Gulf Coast Palms", description: "Palm tree trimming in Crestview, FL — Okaloosa County's largest inland city. Cold-hardy species, storm cleanup & precision cuts. 5.0★ · 100+ reviews — (850) 910-1290." },
  { path: "/palm-trees/types", title: "Palm Tree Types for Florida's Emerald Coast | Gulf Coast Palms", description: "Learn the most popular palm species for Florida's Emerald Coast — care, trimming & install tips for Sabal, Canary Island Date, Washingtonia & more." },
  { path: "/palm-trees/canary-island-date-palm", title: "Canary Island Date Palm — Care, Trimming & Removal Guide | Gulf Coast Palms", description: "The crown jewel of luxury coastal landscaping — care, trimming, diamond cutting & removal advice for Canary Island Date Palms. Free quote (850) 910-1290." },
  { path: "/palm-trees/sabal-palm", title: "Sabal Palm — Florida State Tree Care & Trimming Guide | Gulf Coast Palms", description: "Sabal Palm is Florida's official state tree — hardy, native, coastal-ready. Care, trimming, install & removal tips from Gulf Coast Palms. (850) 910-1290." },
  { path: "/palm-trees/pindo-palm", title: "Pindo Palm — Cold-Hardy Palm Care & Trimming Guide | Gulf Coast Palms", description: "A cold-hardy palm with graceful blue-green fronds and sweet edible fruit. Care, trimming, install & removal advice for Pindo Palms — (850) 910-1290." },
  { path: "/palm-trees/washingtonia-palm", title: "Washingtonia Palm — Care, Trimming & Removal Guide | Gulf Coast Palms", description: "Tall, fast-growing & iconic — the classic silhouette of coastal Florida. Care, trimming, install & removal advice for Washingtonia Palms. (850) 910-1290." },
  { path: "/palm-trees/mule-palm", title: "Mule Palm — Cold-Hardy Hybrid Care & Trimming Guide | Gulf Coast Palms", description: "A stunning Pindo × Queen Palm hybrid — cold-hardy, fast-growing & elegant. Care, trimming, install & removal advice for Mule Palms. Call (850) 910-1290." },
  { path: "/palm-trees/buy", title: "Buy Palm Trees Delivered & Installed — Emerald Coast FL | Gulf Coast Palms", description: "Buy palm trees sourced, delivered & installed across Pensacola, Navarre & Destin. Sabal Palms from $350 installed, Sylvester from $1,200 — (850) 910-1290." },
  { path: "/palm-trees/guides", title: "Palm Care Guides — Expert Tips for Florida Palms | Gulf Coast Palms", description: "Expert palm tree care guides — trimming frequency, seasonal timing, species care & maintenance tips for Florida's Emerald Coast. Free quote (850) 910-1290." },
  { path: "/palm-trees/guides/how-often-should-palm-trees-be-trimmed", title: "How Often Should Palm Trees Be Trimmed? | Gulf Coast Palms", description: "How often should palm trees be trimmed in Florida? Expert advice on frequency, seasonal timing & why over-trimming damages palms. Free quote (850) 910-1290." },
  { path: "/learn", title: "Palm Tree Care Guides & Resources | Gulf Coast Palms NW Florida", description: "Expert palm tree care guides for NW Florida homeowners — when to trim, how to spot problems, hurricane prep tips & more. Free quote — (850) 910-1290." },
  { path: "/learn/how-often-trim-palm-trees-florida", title: "How Often Should You Trim Palm Trees in Florida? | Gulf Coast Palms", description: "Ideal palm-trimming frequency in Florida by species, timing, signs to watch for & why over-trimming damages palms. Free quote — (850) 910-1290." },
  { path: "/learn/palm-tree-turning-brown-florida", title: "Why Is My Palm Tree Turning Brown? Florida Guide | Gulf Coast Palms", description: "Florida palm turning brown? Causes from normal aging to lethal yellowing, nutrient deficiency & root rot — plus what to do. Free quote (850) 910-1290." },
  { path: "/learn/palm-tree-hurricane-prep-florida", title: "How to Prepare Palm Trees for Hurricane Season in Florida | Gulf Coast Palms", description: "Prep your Florida palms for hurricane season — what to trim, what to leave, timing & post-storm recovery. Call Gulf Coast Palms at (850) 910-1290." },
  { path: "/learn/how-to-tell-if-palm-tree-is-dead", title: "How to Tell If a Palm Tree Is Dead or Dying | Gulf Coast Palms", description: "Is your palm dead or can it be saved? Check the crown, fronds, trunk & roots to diagnose your palm's health. Free assessment — (850) 910-1290." },
  { path: "/learn/palm-tree-trimming-cost-florida", title: "Palm Tree Trimming Cost in Florida (2026 Guide) | Gulf Coast Palms", description: "In-depth Florida palm-trimming cost guide: price ranges by palm height & species, cost factors & what pro service includes. Free quote (850) 910-1290." },
  { path: "/hoa-commercial-palm-maintenance", title: "Commercial & HOA Palm Tree Maintenance NW Florida | Gulf Coast Palms", description: "Large-scale palm maintenance for HOAs, condos, resorts & commercial properties across the Emerald Coast. Licensed & insured — call (850) 910-1290." },
  { path: "/commercial", title: "Commercial & Property Management Palm & Tree Services | Gulf Coast Palms", description: "Portfolio palm & tree services for property managers, HOAs & commercial properties across NW Florida. Volume pricing, photo docs, priority storm response." },
  { path: "/commercial-palm-tree-services", title: "Commercial Palm Tree Services for Property Managers & HOAs | Gulf Coast Palms", description: "Volume-priced palm & tree services for property managers, HOAs & commercial portfolios across NW Florida. Photo documentation, direct invoicing, one point of contact." },
  { path: "/hurricane-palm-preparation", title: "Hurricane Palm Tree Preparation Navarre & NW Florida | Gulf Coast Palms", description: "Prep your palms for hurricane season — pre-storm trimming, hazard assessment & emergency response across NW Florida. Book early — (850) 910-1290." },
  { path: "/palm-tree-cost", title: "Palm Tree Trimming Cost — Instant Pricing | Gulf Coast Palms", description: "Get instant palm tree trimming, removal & install pricing across NW Florida. Text a photo for a same-day quote — free estimate at (850) 910-1290." },
  { path: "/emergency-palm-service", title: "Emergency Palm Tree Service NW Florida | Gulf Coast Palms", description: "Storm damage or leaning palms? Fast emergency palm removal, assessment & insurance documentation across Navarre, Pensacola & Destin. (850) 910-1290." },
  { path: "/holiday-lighting", title: "Holiday Lighting Installation NW Florida | Navarre, Gulf Breeze | Gulf Coast Palms", description: "Professional holiday lighting install & removal for homes, vacation rentals & HOAs across Navarre, Gulf Breeze, Fort Walton & the Emerald Coast." },
  { path: "/gallery", title: "Before & After Palm Tree Gallery | Gulf Coast Palms", description: "Real before & after photos from Gulf Coast Palms — palm trimming, removal, diamond cutting & HOA maintenance across Florida's Emerald Coast." },
  { path: "/about", title: "About Gulf Coast Palms | Navarre Beach's Palm Tree Specialists", description: "Family-owned in Navarre Beach, FL. Why NW Florida homeowners trust Gulf Coast Palms for expert palm trimming, removal & hurricane prep — (850) 910-1290." },
  { path: "/service-areas", title: "Palm Tree Service Areas | Gulf Coast Palms NW Florida", description: "Serving Navarre, Gulf Breeze, Pensacola, Fort Walton Beach, Destin, 30A, Perdido Key & all of NW Florida. View our full coverage — (850) 910-1290." },
  { path: "/jobs", title: "Jobs & Careers | Gulf Coast Palms Navarre FL", description: "Join the Gulf Coast Palms crew — now hiring palm tree trimmers, team leaders & operations staff in NW Florida. View open positions and apply today." },
  { path: "/referral", title: "Refer a Friend & Earn | Gulf Coast Palms Referral Program", description: "Love your results? Refer a neighbor or friend to Gulf Coast Palms and earn rewards. Join our NW Florida referral program — call (850) 910-1290." },
  { path: "/payments", title: "Pay Your Invoice | Gulf Coast Palms", description: "Pay your Gulf Coast Palms invoice online. Secure Stripe-powered payments — have your invoice number ready. Questions? Call (850) 910-1290." },
  { path: "/careers/gulf-coast-palms", title: "Careers at Gulf Coast Palms | NW Florida", description: "Build an outdoor career with Gulf Coast Palms. Open roles for groundsmen, team leaders & sales operations in Navarre & NW Florida — apply today." },
  { path: "/terms-of-service", title: "Terms of Service | Gulf Coast Palms", description: "Review the terms of service for Gulf Coast Palms palm tree trimming, removal & maintenance services across Northwest Florida." },
  { path: "/privacy-policy", title: "Privacy Policy | Gulf Coast Palms", description: "Read the Gulf Coast Palms privacy policy to understand how we collect, use & protect your personal information when you request service or a quote." },
  { path: "/text-consent", title: "SMS Text Consent | Gulf Coast Palms", description: "Opt in to receive text message updates from Gulf Coast Palms about your palm tree service appointments, estimates & scheduling in NW Florida." },
  { path: "/quote", title: "Get a Free Palm Tree Service Quote | Gulf Coast Palms", description: "Request a free quote for palm trimming, removal, installation, or hurricane prep across NW Florida. Same-day response — call or text (850) 910-1290." },
  { path: "/thank-you", title: "Thank You | Gulf Coast Palms", description: "Thanks for reaching out to Gulf Coast Palms. We typically respond within 15 minutes during business hours — (850) 910-1290.", noindex: true },
];

export function buildRouteMeta() {
  return rawRoutes.map((r) => ({
    path: r.path,
    title: r.title,
    description: r.description,
    ogTitle: r.title,
    ogDescription: r.description,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: DEFAULT_OG_IMAGE_ALT,
    ogType: "website",
    canonical: `${SITE_ORIGIN}${r.path}`,
    noindex: r.noindex === true,
  }));
}