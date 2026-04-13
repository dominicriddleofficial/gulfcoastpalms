import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Phone, MessageSquare } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import NotFound from "@/pages/NotFound";

interface Article {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  sections: { heading?: string; paragraphs: string[] }[];
}

const articles: Article[] = [
  {
    slug: "how-often-trim-palm-trees-florida",
    title: "How Often Should You Trim Palm Trees in Florida?",
    metaTitle: "How Often Should You Trim Palm Trees in Florida? | Gulf Coast Palms",
    metaDescription: "Learn the ideal trimming frequency for Florida palm trees by species. Expert advice on timing, signs to watch for, and why over-trimming damages palms.",
    sections: [
      {
        paragraphs: [
          "One of the most common questions we hear from Northwest Florida homeowners is: how often should palm trees be trimmed? The answer depends on the palm species, its location, and the local climate — but for most palms along the Emerald Coast, annual or biannual trimming is the sweet spot.",
          "Florida's warm, humid climate promotes faster palm growth than you'd see in drier regions. That means more frond production, more seed pods, and more dead material accumulating throughout the year. Regular trimming keeps palms healthy, safe, and attractive — but the key is knowing how much to remove and when.",
        ],
      },
      {
        heading: "Trimming Frequency by Palm Species",
        paragraphs: [
          "Queen Palms are among the fastest-growing palms in Northwest Florida and typically need trimming every 12 to 18 months. They produce abundant seed pods and flower stalks that should be removed before they drop fruit and create a mess on driveways, patios, and pool decks.",
          "Sabal Palms (Cabbage Palms), Florida's state tree, are slower-growing and more low-maintenance. Most Sabal palms only need trimming every 18 to 24 months unless dead fronds are creating a safety hazard or aesthetic concern. They're naturally hardy and evolved to thrive in Florida's conditions with minimal intervention.",
          "Canary Island Date Palms are show-stopping specimens that benefit from annual trimming to maintain their signature pineapple-cut crown. These palms produce heavy fronds that can become dangerous if allowed to accumulate, so yearly professional maintenance is strongly recommended.",
          "Washingtonia Palms (Mexican Fan Palms and Washington Palms) produce rapid frond growth and create a distinctive 'skirt' of dead fronds if left untrimmed. Most property owners prefer annual trimming to keep these tall palms looking clean and prevent falling fronds during storms.",
          "Pindo Palms (Jelly Palms) are compact, slower-growing palms that typically only need trimming every 2 to 3 years. Their lower fronds brown naturally and can be removed as needed without aggressive pruning.",
        ],
      },
      {
        heading: "Signs It's Time to Trim Your Palms",
        paragraphs: [
          "Don't wait for a calendar reminder — your palms will tell you when they need attention. Watch for these signs: brown or yellowing fronds hanging below the horizontal plane of the crown, heavy seed pods weighing down frond clusters, loose fronds that could blow off during a storm, fronds encroaching on power lines or structures, and dead material accumulating against the trunk.",
          "If you notice any of these signs, it's time to schedule professional trimming. Waiting too long increases the risk of storm damage, pest infestations, and disease — and makes the eventual trimming job more complex and expensive.",
        ],
      },
      {
        heading: "The Danger of Over-Trimming (Hurricane Cutting)",
        paragraphs: [
          "One of the most damaging mistakes in palm care is over-trimming, sometimes called 'hurricane cutting.' This involves removing all but a few fronds at the very top, leaving the palm looking like a feather duster. Despite the name, hurricane cutting actually makes palms MORE vulnerable to storm damage, not less.",
          "Live green fronds are not dead weight — they're the palm's energy source. Each frond produces food through photosynthesis that the palm needs to grow, heal, and strengthen its trunk. Removing too many live fronds starves the tree, weakens the trunk, and can cause a condition called 'pencil pointing' where the trunk narrows at the top and becomes structurally compromised.",
          "The rule of thumb is the '9 and 3 rule' — never remove fronds that are above the horizontal plane (imagine the crown as a clock face, and only remove fronds below the 9 o'clock and 3 o'clock positions). This preserves enough canopy to keep the palm healthy while removing dead and dying material.",
        ],
      },
      {
        heading: "Professional Trimming vs. DIY",
        paragraphs: [
          "Small palms under 10 feet can sometimes be maintained by homeowners with proper tools — hand saws, loppers, and pole pruners. However, any palm taller than one story should always be trimmed by a professional crew with proper climbing equipment, bucket trucks, and insurance.",
          "Professional trimming isn't just about height — it's about technique. Improper cuts can introduce disease, damage the trunk, and create wounds that never fully heal. A professional crew knows exactly where to cut, how much to remove, and how to handle each species' unique growth pattern.",
          "The cost of professional palm trimming in Florida typically ranges from $45 to $200 per palm depending on height, species, and access. That investment protects trees worth far more in landscape value and prevents expensive emergency removals down the road.",
        ],
      },
      {
        heading: "Best Time of Year to Trim Palms in Florida",
        paragraphs: [
          "In Northwest Florida, the ideal window for palm trimming is late spring through early fall — roughly April through September. This is when palms are actively growing and can recover quickly from trimming. Avoid heavy trimming during winter months (December through February) when growth slows and palms are more vulnerable to cold stress.",
          "If you're in the Navarre, Pensacola, Gulf Breeze, Fort Walton Beach, or Destin area, scheduling your annual trimming for April or May gives your palms the maximum growing season to recover before hurricane season peaks in August and September.",
          "Gulf Coast Palms serves the entire Emerald Coast with professional palm trimming year-round. Whether your palms are overdue for maintenance or you want to get ahead of storm season, our team delivers clean, proper trimming that keeps your palms healthy and beautiful for years to come.",
        ],
      },
    ],
  },
  {
    slug: "palm-tree-turning-brown-florida",
    title: "Why Is My Palm Tree Turning Brown? Florida Guide",
    metaTitle: "Why Is My Palm Tree Turning Brown? Florida Guide | Gulf Coast Palms",
    metaDescription: "Florida palm tree turning brown? Learn the causes — from normal aging to lethal yellowing, nutrient deficiency, and root rot — plus what to do about each.",
    sections: [
      {
        paragraphs: [
          "Seeing brown fronds on your palm tree can be alarming, but it's not always a sign of trouble. Some browning is completely normal — while other patterns indicate serious problems that need immediate attention. As Northwest Florida's palm specialists, we've diagnosed thousands of brown palm cases across Navarre, Pensacola, Gulf Breeze, Destin, and the entire Emerald Coast.",
          "Understanding why your palm is turning brown is the first step toward saving it. Here's a comprehensive guide to the most common causes and what you should do about each one.",
        ],
      },
      {
        heading: "Normal Frond Browning (Nothing to Worry About)",
        paragraphs: [
          "Every palm naturally sheds its oldest, lowest fronds as part of its growth cycle. These bottom fronds gradually turn yellow, then brown, and eventually dry out and hang down or fall off. This is completely normal and healthy — it's the palm equivalent of a deciduous tree dropping autumn leaves.",
          "You can identify normal browning because it only affects the lowest fronds in the canopy. The newer fronds at the top remain green and healthy. If only your bottom fronds are browning while the crown looks vibrant, your palm is fine — it's just shedding old growth.",
          "You can remove these brown fronds for aesthetics, but there's no urgency. Many property owners schedule annual trimming to clean up this natural accumulation and keep their palms looking tidy.",
        ],
      },
      {
        heading: "Lethal Yellowing Disease",
        paragraphs: [
          "Lethal yellowing is one of the most serious palm diseases in Florida. It's caused by a phytoplasma (a type of bacteria) spread by planthopper insects, and it can kill a palm within three to six months if untreated. Symptoms start with premature fruit drop, then flower stalks blacken, lower fronds turn yellow (not brown initially), and the yellowing progresses upward through the crown until the bud dies.",
          "The most susceptible species in NW Florida include Coconut Palms, some Date Palms, and certain Sabal Palm varieties. If you suspect lethal yellowing, contact a palm specialist immediately — early antibiotic trunk injections (oxytetracycline) can sometimes save the tree, but timing is critical.",
          "Unfortunately, once the growing bud at the top of the palm dies, the tree cannot be saved and should be removed promptly to prevent the insects from spreading to neighboring palms.",
        ],
      },
      {
        heading: "Potassium Deficiency (Most Common Nutrient Issue)",
        paragraphs: [
          "Potassium deficiency is the single most common nutritional problem affecting palms in Florida's sandy soils. Symptoms appear first on the oldest fronds: the tips and margins turn yellow, then orange, then brown, with translucent yellow or orange spotting on the frond surface. In severe cases, the frond tips become necrotic (dry and brown) and curl.",
          "Northwest Florida's sandy, well-drained soils are naturally low in potassium, and heavy rains leach whatever potassium is present even further. The fix is relatively simple: apply a slow-release palm-specific fertilizer with a high potassium ratio (look for an 8-2-12 or similar formulation with micronutrients) three to four times per year.",
          "Don't use generic lawn fertilizer on palms — the high nitrogen content can actually worsen potassium deficiency by promoting rapid growth that the palm can't support nutritionally. Always use a fertilizer specifically formulated for palms.",
        ],
      },
      {
        heading: "Root Rot from Poor Drainage",
        paragraphs: [
          "Palms need well-drained soil to thrive. When roots sit in waterlogged soil for extended periods, root rot fungi (primarily Phytophthora and Pythium species) can attack the root system. Symptoms include browning fronds that wilt and droop rather than drying out crisply, a soft or mushy trunk base, reduced new growth, and a general decline in the palm's vigor.",
          "Root rot is common in low-lying areas, near downspouts, or where irrigation systems overwater. If caught early, improving drainage and reducing watering can save the palm. Severe cases may require fungicide treatments or, if the root system is too compromised, removal.",
          "When planting new palms, always ensure proper drainage by raising the planting site slightly and amending heavy clay soils with sand or organic matter. Prevention is always easier than treatment.",
        ],
      },
      {
        heading: "Freeze Damage",
        paragraphs: [
          "Northwest Florida occasionally experiences hard freezes that can damage or kill tropical and semi-tropical palms. After a freeze, affected fronds turn brown and papery within a few days. The extent of damage depends on the temperature, duration of the freeze, wind exposure, and the palm's species and health going into winter.",
          "After a freeze, resist the urge to immediately remove all brown fronds. Those damaged fronds actually help insulate the growing bud at the center of the crown. Wait until spring when new growth begins to emerge before trimming away cold-damaged fronds. If the bud is still alive (you'll see new green fronds emerging from the center), the palm will recover.",
          "If no new growth appears by late spring, the growing bud is likely dead and the palm will need to be removed. Species like Sabal Palms and Pindo Palms are much more cold-hardy than Queen Palms or Coconut Palms — consider replacing cold-killed palms with hardier species suited to NW Florida's climate.",
        ],
      },
      {
        heading: "When to Call a Professional",
        paragraphs: [
          "If browning is limited to the lowest fronds, it's likely normal shedding. But if you notice browning that starts at the top of the crown, rapidly progresses from bottom to top, affects the center bud, is accompanied by a soft trunk, or shows unusual spotting patterns, contact a palm specialist as soon as possible.",
          "Gulf Coast Palms provides free palm health assessments across the Emerald Coast. Text us a photo of your browning palm and we'll give you an honest evaluation of what's happening and whether it can be saved. Early intervention is the key to saving a sick palm — don't wait and hope it gets better on its own.",
        ],
      },
    ],
  },
  {
    slug: "palm-tree-hurricane-prep-florida",
    title: "How to Prepare Your Palm Trees for Hurricane Season in Florida",
    metaTitle: "How to Prepare Palm Trees for Hurricane Season | Gulf Coast Palms",
    metaDescription: "Expert guide to preparing your palm trees for Florida hurricane season. Learn what to trim, what to leave, timing, and post-storm recovery from Gulf Coast Palms.",
    sections: [
      {
        paragraphs: [
          "Hurricane season runs from June 1 through November 30, and for Northwest Florida property owners, preparing your palm trees is an essential part of storm readiness. Properly maintained palms are remarkably wind-resistant — in fact, palms are among the best trees for surviving hurricanes. But improperly trimmed palms can become liabilities.",
          "This guide covers everything you need to know about hurricane-proofing your palms, from pre-season trimming to post-storm recovery. Whether you're in Navarre, Pensacola, Destin, or anywhere along the Emerald Coast, these strategies will help protect your palms and your property.",
        ],
      },
      {
        heading: "Why Proper Trimming Reduces Hurricane Damage",
        paragraphs: [
          "Palms have evolved over millions of years to withstand tropical storms. Their flexible trunks bend rather than snap, and their streamlined frond canopies allow wind to pass through rather than catching it like a sail. A properly trimmed palm lets wind flow through the crown naturally, reducing wind load and the risk of trunk failure.",
          "The key word is 'properly.' A full, healthy canopy with dead material removed is actually more wind-resistant than an over-trimmed palm. Dead fronds, heavy seed pods, and hanging fruit are the real hazards — they can detach in high winds and become projectiles. Removing this dead material while preserving live fronds is the correct pre-hurricane strategy.",
          "Think of it like this: live fronds are flexible and aerodynamic. Dead fronds are rigid and brittle. Remove the rigid material, keep the flexible canopy, and your palm is naturally engineered to ride out the storm.",
        ],
      },
      {
        heading: "The Hurricane Cut Myth (Why Over-Trimming Is Dangerous)",
        paragraphs: [
          "Every hurricane season, well-meaning but misinformed tree crews offer 'hurricane cuts' — stripping palms down to just a few fronds at the very top. This is one of the most damaging things you can do to a palm before a storm. Here's why:",
          "Over-trimming removes the palm's energy source. Each green frond produces food through photosynthesis. Removing too many live fronds starves the tree, weakening the trunk and root system right before it needs maximum strength to survive a storm.",
          "A stripped palm also becomes a worse wind target, not a better one. With only a few fronds at the very top, the palm becomes top-heavy and acts like a lever — concentrating all the wind force on a narrow point at the crown instead of distributing it across a full, flexible canopy.",
          "Research from the University of Florida and the International Society of Arboriculture consistently shows that palms with fuller canopies survive hurricanes better than over-trimmed palms. Don't let anyone hurricane-cut your palms.",
        ],
      },
      {
        heading: "What to Trim Before Hurricane Season",
        paragraphs: [
          "Focus your pre-hurricane trimming on these specific items: dead or brown fronds that hang below the 9 o'clock position on the canopy, heavy seed pods and fruit clusters (especially on Queen Palms and Date Palms), dried flower stalks, any fronds that are touching or rubbing against structures, power lines, or fences, and loose bark or debris trapped in the crown.",
          "Leave all green, healthy fronds in place — even if they look a bit shaggy. Those fronds are actively feeding the palm and will help it recover faster after a storm. The goal is to remove dead weight that could become airborne, not to reshape the entire canopy.",
        ],
      },
      {
        heading: "Timing: Complete Trimming by May 31",
        paragraphs: [
          "The ideal window for pre-hurricane palm trimming in Northwest Florida is April through May. This gives the palm time to recover from trimming and produce new growth before peak hurricane season arrives in August and September.",
          "Don't wait until a storm is in the forecast to schedule trimming — by then, every tree crew in the region is booked solid, and rushed last-minute work is often done poorly. Plan ahead and schedule your pre-season trimming early.",
          "If you have multiple palms, consider a maintenance plan that includes pre-season inspection and trimming. Gulf Coast Palms offers annual and semi-annual maintenance programs that ensure your palms are always storm-ready without the last-minute scramble.",
        ],
      },
      {
        heading: "What to Do After a Hurricane",
        paragraphs: [
          "After a storm passes, resist the urge to immediately start cutting. Give yourself and your crew at least 24 to 48 hours to assess damage safely — downed power lines, unstable structures, and saturated soil create serious hazards in the immediate aftermath.",
          "For storm-damaged palms, remove any broken or hanging fronds that pose an immediate safety hazard. But don't remove fronds that are bent or drooping — many will recover and straighten out within a few weeks as the palm rehydrates and resumes normal growth.",
          "Check the center bud (the heart of the palm at the top of the crown). If the bud is intact and the trunk is solid, the palm will almost certainly survive and recover. If the bud is missing, torn out, or rotting, the palm is likely lost and should be removed.",
          "Don't fertilize palms immediately after a storm. Wait at least two to three weeks for the root system to stabilize in the waterlogged soil before adding nutrients. Premature fertilization can actually stress the roots further.",
          "Gulf Coast Palms provides post-storm emergency service across the Emerald Coast. If your palms sustained hurricane damage, call us for a free assessment and priority scheduling for cleanup and recovery trimming.",
        ],
      },
    ],
  },
  {
    slug: "how-to-tell-if-palm-tree-is-dead",
    title: "How to Tell If a Palm Tree Is Dead or Dying",
    metaTitle: "How to Tell If a Palm Tree Is Dead or Dying | Gulf Coast Palms",
    metaDescription: "Is your palm tree dead or can it be saved? Learn how to check the crown, fronds, trunk, and roots to diagnose your palm's health. Expert guide from Gulf Coast Palms.",
    sections: [
      {
        paragraphs: [
          "A palm tree that looks rough doesn't necessarily need to be cut down — but a truly dead palm becomes a safety hazard that should be removed before it falls on its own. Knowing the difference between a struggling palm that can be saved and a dead palm that needs removal can save you thousands of dollars and protect your property.",
          "Here's how to assess your palm's condition using the same diagnostic approach our crew uses on every job across Northwest Florida.",
        ],
      },
      {
        heading: "Check the Crown (The Heart/Bud)",
        paragraphs: [
          "The single most important indicator of a palm's viability is its growing bud — the apical meristem located at the very center of the crown. Unlike most trees, palms only have one growing point. If the bud dies, the entire palm dies. There's no coming back from a dead bud.",
          "To check the bud, look at the center of the crown from below (or from a second-story window if the palm is tall). You should see a tight cluster of new fronds emerging from the center. These are called 'spear leaves' — they're the newest growth, typically lighter green and still furled. If spear leaves are present and look healthy, your palm is alive.",
          "If the center of the crown is empty, brown, mushy, or has a foul smell, the bud is dead. No amount of fertilizer, water, or trimming will revive it. Schedule removal before the dead palm becomes a falling hazard.",
        ],
      },
      {
        heading: "Evaluate the Color of New Fronds",
        paragraphs: [
          "Healthy new fronds emerge bright green (or sometimes with a yellowish-green tint that darkens as they mature). If new growth is consistently yellow, brown, stunted, or deformed, the palm is likely suffering from a serious nutritional deficiency, disease, or root system failure.",
          "New fronds that emerge already brown or with brown tips may indicate Fusarium wilt, a fatal fungal disease, or severe boron deficiency. Both require immediate professional diagnosis because Fusarium wilt can spread to neighboring palms through contaminated pruning tools.",
          "If your palm hasn't produced any new fronds in several months during the growing season (April through September in NW Florida), that's a red flag. A healthy palm should consistently push out new growth during warm months.",
        ],
      },
      {
        heading: "Test the Trunk for Firmness",
        paragraphs: [
          "A healthy palm trunk is solid and firm throughout its entire length. Walk around the base of your palm and press firmly against the trunk with your hand. It should feel rock-solid with no give.",
          "If the trunk feels soft, spongy, or hollow in any section — especially at the base or near the crown — the internal vascular tissue is compromised. This could be from trunk rot (Thielaviopsis or Ganoderma fungi), physical damage, or advanced decay. A soft trunk means the palm's structural integrity is failing, and it could collapse without warning.",
          "Look for visual signs of trunk problems too: horizontal cracks, oozing sap, fungal fruiting bodies (shelf fungi or mushrooms growing from the trunk), and constricted sections where the trunk narrows abnormally. Any of these warrant immediate professional evaluation.",
        ],
      },
      {
        heading: "Inspect the Root Zone",
        paragraphs: [
          "Palm roots spread outward from the base in a dense mat. While you can't see most of the root system, you can look for signs of root problems at the surface. Check for: standing water or soggy soil around the base (indicating poor drainage that can cause root rot), exposed roots that appear dark, mushy, or foul-smelling (healthy roots are firm and light-colored), the palm leaning at an increasing angle (suggesting root failure on one side), and soil heaving or cracking around the base (indicating the root ball is shifting).",
          "If the palm is leaning and the lean has increased over time, this is a serious safety concern. A palm with a failing root system can topple in moderate winds — not just hurricanes. Have it assessed and potentially removed before it falls on a structure, vehicle, or person.",
        ],
      },
      {
        heading: "Salvageable vs. Needs Removal",
        paragraphs: [
          "A palm CAN be saved if: the bud is alive with emerging spear leaves, the trunk is firm throughout, the problem is nutritional (fixable with proper fertilization), or the browning is limited to lower fronds (normal shedding). In these cases, targeted treatment — proper fertilization, improved drainage, pest management, or disease intervention — can often restore the palm to health.",
          "A palm NEEDS removal if: the bud is dead, the trunk is soft or hollow, the palm is leaning with increasing severity, large sections of the crown are dead with no new growth, or it has confirmed Fusarium wilt or advanced Ganoderma. Don't wait on removal — a dead palm is a falling hazard that gets more dangerous every day.",
        ],
      },
      {
        heading: "The Cost of Waiting Too Long",
        paragraphs: [
          "Dead palm removal is straightforward and relatively affordable when the palm is still standing and structurally sound. The cost increases significantly once the palm begins to decompose, lean, or break apart. A palm that has partially collapsed or fallen on a structure can easily cost three to five times more to remove than one that's still upright.",
          "Insurance may cover storm damage to structures, but it rarely covers the cost of removing a palm that the homeowner knew was dead and failed to address. Proactive removal protects your property and your wallet.",
          "Gulf Coast Palms provides free palm health assessments across the Emerald Coast. If you're unsure whether your palm can be saved, text us a photo and we'll give you an honest professional opinion — no sales pressure, just straight answers about your tree's condition.",
        ],
      },
    ],
  },
  {
    slug: "palm-tree-trimming-cost-florida",
    title: "How Much Does Palm Tree Trimming Cost in Florida? (2026 Guide)",
    metaTitle: "Palm Tree Trimming Cost Florida 2026 | Gulf Coast Palms",
    metaDescription: "How much does palm tree trimming cost in Florida? Price ranges by palm height and type, cost factors, and what's included in professional service. 2026 guide.",
    sections: [
      {
        paragraphs: [
          "If you're a Florida homeowner searching for palm tree trimming costs, you want straight answers — not vague ranges or hidden fees. This guide provides real pricing data based on our experience maintaining hundreds of palms annually across Northwest Florida's Emerald Coast.",
          "Palm tree trimming costs vary based on several factors, but most homeowners in the Navarre, Pensacola, Gulf Breeze, Fort Walton Beach, and Destin area can expect to pay between $45 and $250 per palm for professional trimming. Here's how that breaks down.",
        ],
      },
      {
        heading: "Price Ranges by Palm Height",
        paragraphs: [
          "Small palms (under 15 feet) typically cost $45 to $75 per palm. These include young Queen Palms, Pindo Palms, smaller Sabal Palms, and ornamental varieties. They can usually be trimmed with hand tools or small pole saws without climbing equipment or bucket trucks.",
          "Medium palms (15 to 30 feet) range from $75 to $150 per palm. This includes most mature residential palms — established Queen Palms, Washingtonia Palms, and mid-size Sabal Palms. These typically require a ladder, climbing gear, or a bucket truck to access the crown safely.",
          "Tall palms (30+ feet) cost $150 to $250+ per palm. Mature Canary Island Date Palms, tall Washingtonia Palms, and old-growth Sabal Palms fall in this range. These require bucket truck access or specialized climbing, and the fronds and debris are heavier and more voluminous to remove.",
          "Very tall palms (50+ feet) may cost $250 to $400+ per palm due to the equipment, time, and risk involved. These are typically limited to commercial properties, parks, or estates with exceptionally mature specimens.",
        ],
      },
      {
        heading: "Cost by Palm Species",
        paragraphs: [
          "Canary Island Date Palms are among the most expensive to trim because of their massive, heavy fronds and the sharp spines along the frond stems (petioles). Expect $150 to $300+ per palm depending on height. The spines require extra safety precautions and slower, more careful work.",
          "Queen Palms are moderately priced at $50 to $125 per palm. They produce abundant seed pods and flower stalks that add bulk to the trimming job, but the fronds themselves are relatively light and easy to handle.",
          "Sabal Palms are typically $50 to $150 depending on height. They're straightforward to trim with moderate frond weight, though very tall specimens require bucket truck access.",
          "Washingtonia Palms range from $75 to $200+ per palm. They grow rapidly and produce dense frond growth, creating a large volume of debris — especially if they haven't been trimmed in several years and have developed a thick 'skirt' of dead fronds.",
        ],
      },
      {
        heading: "Factors That Affect Price",
        paragraphs: [
          "Number of palms is the biggest cost factor. Most professional companies offer per-palm discounts when trimming multiple trees at the same property. A single palm might cost $100, but ten palms at the same property might average $65 to $75 each because setup, travel, and equipment deployment costs are spread across more trees.",
          "Access and site conditions matter significantly. Palms near power lines, structures, fences, pools, or in tight spaces require extra care and sometimes specialized equipment. If a bucket truck can't reach the palm and climbing is required, expect a premium of $25 to $75 per palm.",
          "Current condition affects pricing too. A palm that's been regularly maintained is quicker to trim than one that hasn't been touched in three or four years. Heavy accumulations of dead fronds, massive seed pods, and thick frond boots require more time and generate more debris to haul away.",
          "Debris removal is typically included in the quoted price from professional companies, but some budget operators quote a low per-palm rate and then charge extra for cleanup and hauling. Always confirm that debris removal is included before you hire.",
        ],
      },
      {
        heading: "Why Cheap Services Are Risky",
        paragraphs: [
          "If someone offers to trim your palms for $25 to $35 each, ask yourself what corners they're cutting. Common issues with bargain-rate palm services include: no insurance (you're liable if they're injured on your property), aggressive over-trimming that damages the palm long-term, improper cutting technique that introduces disease, debris left on your property or blown into your neighbor's yard, and no cleanup of the trunk or surrounding landscape.",
          "We've spent thousands of dollars repairing palms damaged by cheap crews — palms with pencil-pointed trunks from years of hurricane cutting, disease infections from dirty tools, and structural damage from improper climbing techniques. The initial savings of $20 or $30 per palm often turns into hundreds or thousands in recovery costs or premature removal.",
          "Professional palm trimming isn't just about cutting fronds — it's about understanding each species' biology, using proper technique to promote healthy regrowth, and protecting the long-term value of trees that take years or decades to reach maturity.",
        ],
      },
      {
        heading: "Multi-Palm Discounts and Maintenance Plans",
        paragraphs: [
          "Most professional companies, including Gulf Coast Palms, offer volume discounts for properties with multiple palms. If you have five or more palms, ask about package pricing — it's almost always cheaper per palm than booking individual trees.",
          "Maintenance plans offer even better value. An annual or semi-annual maintenance agreement locks in a per-palm rate, guarantees scheduling priority (important before hurricane season), and ensures your palms receive consistent, proper care from a crew that knows your property and your trees.",
          "For HOA communities and commercial properties with dozens or hundreds of palms, we offer comprehensive maintenance programs with monthly or quarterly visits, property mapping, and detailed reporting. These programs provide the best value per palm and ensure uniform, professional appearance across the entire property.",
        ],
      },
      {
        heading: "What's Included in Professional Service",
        paragraphs: [
          "When you hire Gulf Coast Palms, every job includes: removal of all dead, dying, and loose fronds; removal of seed pods, flower stalks, and fruit clusters; inspection of the palm for disease, pest, or nutritional issues; trunk cleanup (optional skinning available for an additional fee); complete ground cleanup and debris hauling; and recommendations for any follow-up care needed.",
          "We don't charge for estimates, and we don't surprise you with hidden fees. The price we quote is the price you pay — period. If we discover an issue during trimming that wasn't visible from the ground, we'll discuss it with you and provide options before doing any additional work.",
          "Ready to get a quote for your palms? Call or text Gulf Coast Palms at (850) 910-1290 for a free estimate. We serve the entire Emerald Coast from Perdido Key to 30A.",
        ],
      },
    ],
  },
];

const LearnArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = articles.find((a) => a.slug === slug);

  if (!article) return <NotFound />;

  return (
    <Layout>
      <SEOHead
        title={article.metaTitle}
        description={article.metaDescription}
        canonicalUrl={`/learn/${article.slug}`}
      />

      <section className="py-16 md:py-24 bg-palm-dark">
        <div className="container mx-auto px-4">
          <Link to="/learn" className="inline-flex items-center gap-2 font-body text-palm-sand/60 hover:text-palm-sand text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Guides
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-3xl md:text-5xl font-bold text-primary-foreground max-w-3xl"
          >
            {article.title}
          </motion.h1>
        </div>
      </section>

      <article className="section-padding bg-background">
        <div className="container mx-auto max-w-3xl">
          <div className="prose prose-lg max-w-none">
            {article.sections.map((section, i) => (
              <div key={i} className="mb-8">
                {section.heading && (
                  <h2 className="font-display text-2xl font-bold text-foreground mt-10 mb-4">{section.heading}</h2>
                )}
                {section.paragraphs.map((p, j) => (
                  <p key={j} className="font-body text-muted-foreground leading-relaxed mb-4">{p}</p>
                ))}
              </div>
            ))}
          </div>

          {/* Lead CTA */}
          <div className="mt-16 p-8 rounded-2xl bg-primary/5 border border-primary/20 text-center">
            <h3 className="font-display text-2xl font-bold text-foreground mb-3">Need Professional Palm Care?</h3>
            <p className="font-body text-muted-foreground mb-6 max-w-lg mx-auto">
              Text us a photo of your palms for a free assessment and quote. Our team serves the entire Emerald Coast.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="sms:8509101290" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-body font-bold hover:bg-palm-light transition-colors">
                <MessageSquare className="w-5 h-5" /> Text Us a Photo
              </a>
              <a href="tel:8509101290" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-primary text-primary font-body font-bold hover:bg-primary hover:text-primary-foreground transition-colors">
                <Phone className="w-5 h-5" /> (850) 910-1290
              </a>
            </div>
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default LearnArticle;