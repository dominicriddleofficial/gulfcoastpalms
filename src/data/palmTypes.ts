export interface PalmType {
  slug: string;
  name: string;
  scientificName: string;
  heroDescription: string;
  description: string[];
  height: string;
  growthRate: string;
  bestRegions: string;
  coldHardiness: string;
  maintenance: string[];
  trimmingRecommendations: string[];
  installationOverview: string[];
  priceRange: string;
  shortDescription: string;
}

export const palmTypes: PalmType[] = [
  {
    slug: "canary-island-date-palm",
    name: "Canary Island Date Palm",
    scientificName: "Phoenix canariensis",
    heroDescription: "The crown jewel of luxury coastal landscaping — massive, majestic, and iconic.",
    description: [
      "The Canary Island Date Palm is one of the most recognizable and sought-after palms for high-end Florida properties. Known for its thick, textured trunk and massive, arching crown of deep green fronds, this palm commands attention in any landscape. It's a favorite among waterfront estates, resort properties, and luxury HOA communities throughout the Emerald Coast.",
      "Native to the Canary Islands off the northwest coast of Africa, this species thrives in Florida's subtropical climate. It produces a dense, symmetrical canopy that can span 20–25 feet across, making it an excellent centerpiece tree or grand entrance statement. When properly maintained with diamond cutting and trunk skinning, it becomes a true showpiece.",
      "These palms are drought-tolerant once established and handle Florida's sandy, well-drained soils with ease. They're also moderately wind-resistant when trimmed correctly, making them a solid choice for storm-prone coastal areas — provided they receive professional care."
    ],
    height: "Installed at 8–15 ft | Max height: 30–35 ft",
    growthRate: "Slow to moderate — approximately 1–2 feet per year",
    bestRegions: "Thrives throughout Northwest Florida including Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, 30A, and Perdido Key. Prefers full sun and well-drained soil. Performs exceptionally well in coastal and waterfront settings.",
    coldHardiness: "Hardy to approximately 20°F (USDA Zone 9a–11)",
    maintenance: [
      "Requires annual or biannual trimming to remove dead and dying fronds",
      "Diamond cutting is highly recommended for a clean, sculpted trunk appearance",
      "Trunk skinning enhances aesthetics and removes pest-harboring debris",
      "Fertilize twice annually with a palm-specific slow-release fertilizer",
      "Monitor for common pests like palm weevils and scale insects",
      "Remove fruit stalks to prevent mess and reduce pest attraction"
    ],
    trimmingRecommendations: [
      "Never overcut — remove only dead, dying, or broken fronds",
      "Maintain a full crown with fronds at or above the 9 o'clock and 3 o'clock positions",
      "Diamond cutting should follow the natural boot pattern for a uniform, professional finish",
      "Improper trimming weakens the palm and reduces storm resistance — always use a professional",
      "Schedule trimming in spring or early summer before peak hurricane season"
    ],
    installationOverview: [
      "Canary Island Date Palms are typically installed as mature specimens for immediate impact",
      "Proper root ball preparation and planting depth are critical for establishment",
      "Bracing is required for 6–12 months after installation to ensure stability",
      "Irrigation must be consistent during the first growing season",
      "Gulf Coast Palms handles the full installation process including delivery, planting, bracing, and follow-up care"
    ],
    priceRange: "$1,200 – $1,500 installed",
    shortDescription: "Luxury statement palm with thick trunk and full canopy, common on high-end coastal properties. Final price depends on palm height, delivery distance, and access to the installation area."
  },
  {
    slug: "sabal-palm",
    name: "Sabal Palm",
    scientificName: "Sabal palmetto",
    heroDescription: "Florida's official state tree — hardy, native, and perfectly adapted to coastal life.",
    description: [
      "The Sabal Palm, also known as the Cabbage Palm, is Florida's official state tree and one of the most reliable palms for Gulf Coast landscapes. Its fan-shaped fronds, compact crown, and rugged trunk make it a versatile choice for residential, commercial, and municipal properties across the Emerald Coast.",
      "As a native species, the Sabal Palm is supremely well-adapted to Florida's soils, climate, and storm conditions. It's one of the most hurricane-resistant palms available, with a flexible trunk that bends rather than breaks in high winds. This makes it an excellent choice for homeowners and property managers concerned about storm preparedness.",
      "Sabal Palms require minimal maintenance compared to many other species, making them a cost-effective long-term investment. They're drought-tolerant, salt-tolerant, and can grow in a wide range of soil types — from sandy coastal lots to inland clay soils."
    ],
    height: "Installed at 8–16 ft | Max height: 30–40 ft",
    growthRate: "Slow — approximately 6–12 inches per year",
    bestRegions: "Native throughout Florida. Performs exceptionally well in Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, and all Emerald Coast communities. Extremely salt and wind tolerant — ideal for beachfront and waterfront properties.",
    coldHardiness: "Hardy to approximately 15°F (USDA Zone 8a–11)",
    maintenance: [
      "One of the lowest-maintenance palms available in Florida",
      "Trim once annually to remove dead fronds and maintain a clean appearance",
      "No trunk skinning needed — the natural boot pattern is part of its character",
      "Minimal fertilization required due to its native adaptation",
      "Highly resistant to most common palm pests and diseases"
    ],
    trimmingRecommendations: [
      "Remove only fully dead or hanging fronds — never green fronds",
      "Overtrimming Sabal Palms is one of the most common mistakes homeowners make",
      "A properly trimmed Sabal should retain a full, round crown",
      "Annual trimming is usually sufficient for most properties",
      "Professional trimming ensures proper technique that preserves storm resistance"
    ],
    installationOverview: [
      "Sabal Palms are commonly transplanted as field-grown specimens",
      "They have an excellent transplant survival rate when properly handled",
      "Installation includes planting, backfill, bracing, and initial watering",
      "Established Sabals require very little supplemental irrigation",
      "Gulf Coast Palms sources healthy, well-rooted specimens for all installations"
    ],
    priceRange: "$600 – $800 installed",
    shortDescription: "Florida's native state palm. Extremely hurricane-resistant and ideal for coastal landscapes. Final price depends on palm height, delivery distance, and access to the installation area."
  },
  {
    slug: "pindo-palm",
    name: "Pindo Palm",
    scientificName: "Butia odorata",
    heroDescription: "A cold-hardy beauty with graceful blue-green fronds and sweet edible fruit.",
    description: [
      "The Pindo Palm, also known as the Jelly Palm, is one of the most cold-hardy feather palms available for Florida landscapes. Its distinctive blue-green to silver-green fronds arch elegantly from a stout trunk, creating a lush, tropical look even in areas that experience occasional freezes.",
      "Native to South America, the Pindo Palm has become extremely popular throughout Northwest Florida and the Emerald Coast. It produces clusters of small, orange-yellow fruit that are edible and often used to make jelly — giving it its common nickname. The fruit adds seasonal interest but should be managed to prevent mess on walkways and driveways.",
      "With a mature height of only 15–25 feet, the Pindo Palm is an excellent choice for residential properties where a full-sized palm might be too large. It works beautifully as an accent tree, poolside planting, or grouped in clusters for a tropical grove effect."
    ],
    height: "Installed at 3–6 ft | Max height: 12–15 ft",
    growthRate: "Slow — approximately 6–12 inches per year",
    bestRegions: "Excellent throughout the Florida Panhandle including Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, 30A, and Perdido Key. One of the best choices for areas that experience occasional cold snaps.",
    coldHardiness: "Hardy to approximately 10°F (USDA Zone 8a–11) — one of the most cold-tolerant palms",
    maintenance: [
      "Trim annually to remove dead fronds and spent fruit stalks",
      "Fruit management is important to prevent mess on walkways and pool decks",
      "Fertilize once or twice per year with a palm-specific fertilizer",
      "Generally pest and disease resistant",
      "Well-drained soil is important — avoid planting in low, wet areas"
    ],
    trimmingRecommendations: [
      "Remove only dead and dying fronds — pindo palms should retain their graceful arching shape",
      "Cut spent fruit clusters to keep the tree tidy and reduce pest attraction",
      "Avoid aggressive pruning which can stress the palm and slow growth",
      "Professional trimming ensures clean cuts that promote healthy regrowth",
      "Annual or biannual trimming is typically sufficient"
    ],
    installationOverview: [
      "Pindo Palms transplant well when properly handled",
      "Best planted in full sun with well-drained soil",
      "Bracing may be needed for larger specimens during establishment",
      "Regular watering during the first growing season ensures strong root development",
      "Gulf Coast Palms handles complete installation including site preparation and aftercare guidance"
    ],
    priceRange: "$500 – $700 installed",
    shortDescription: "Compact cold-hardy palm with blue-green fronds perfect for residential landscapes. Final price depends on palm height, delivery distance, and access to the installation area."
  },
  {
    slug: "washingtonia-palm",
    name: "Washingtonia Palm",
    scientificName: "Washingtonia robusta",
    heroDescription: "Tall, fast-growing, and iconic — the classic silhouette of coastal Florida.",
    description: [
      "The Washingtonia Palm, commonly known as the Mexican Fan Palm, is one of the most recognizable palms in the world. Its tall, slender trunk and compact crown of fan-shaped fronds create the quintessential tropical skyline silhouette that defines coastal communities throughout Florida.",
      "Washingtonia Palms are one of the fastest-growing palm species, capable of adding 3–5 feet of height per year under ideal conditions. This makes them a popular choice for property owners who want immediate vertical impact in their landscape. They're commonly planted in rows along driveways, entrance ways, and property borders.",
      "While beautiful, Washingtonia Palms require regular maintenance to remain safe and attractive. Their rapid growth means they produce a large volume of dead fronds that must be removed regularly — both for aesthetics and to prevent fire and pest hazards. At mature heights of 60–80+ feet, professional trimming is essential."
    ],
    height: "Installed at 8–16 ft | Max height: 40–50 ft",
    growthRate: "Fast — approximately 3–5 feet per year",
    bestRegions: "Grows well throughout the Emerald Coast including Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, and 30A. Prefers full sun. Commonly found lining streets, commercial properties, and resort entrances.",
    coldHardiness: "Hardy to approximately 20°F (USDA Zone 9a–11)",
    maintenance: [
      "Requires regular trimming due to fast growth and heavy frond production",
      "Dead fronds should be removed at least annually — biannual trimming is recommended",
      "At mature heights, professional equipment and experienced climbers are essential",
      "Trunk skinning creates a clean, uniform appearance on younger specimens",
      "Monitor for pest issues in the dense thatch of dead fronds"
    ],
    trimmingRecommendations: [
      "Regular trimming is critical — dead fronds pose fire and pest risks",
      "Never attempt to trim tall Washingtonias without professional equipment",
      "Maintain a balanced crown — avoid the common mistake of overtrimming to a 'rooster tail'",
      "Remove seed stalks to reduce mess and weight on the crown",
      "Schedule trimming before hurricane season for maximum wind resistance"
    ],
    installationOverview: [
      "Washingtonia Palms are often installed as tall specimens for instant impact",
      "Their relatively small root ball makes them easier to transport and plant",
      "Bracing is important for the first year due to their tall, slender profile",
      "They establish quickly with consistent watering during the first season",
      "Gulf Coast Palms can source and install Washingtonias at various heights to match your vision"
    ],
    priceRange: "$700 – $900 installed",
    shortDescription: "Fast-growing fan palm that adds dramatic vertical height to landscapes. Final price depends on palm height, delivery distance, and access to the installation area."
  },
  {
    slug: "queen-palm",
    name: "Queen Palm",
    scientificName: "Syagrus romanzoffiana",
    heroDescription: "Graceful, fast-growing, and lush — a tropical favorite for Florida landscapes.",
    description: [
      "The Queen Palm is one of the most popular landscape palms in Florida, prized for its graceful, arching fronds and smooth, ringed trunk. It creates a lush, tropical canopy that provides filtered shade and elegant movement in coastal breezes — making it a favorite for poolside plantings, entranceways, and residential streetscapes.",
      "Originally from South America, the Queen Palm has adapted well to Florida's climate and is widely planted throughout the Emerald Coast. It grows relatively quickly and produces large clusters of orange fruit that add seasonal color but require management to prevent mess beneath the tree.",
      "While beautiful, Queen Palms do have specific care requirements. They're susceptible to nutrient deficiencies — particularly manganese and potassium — which can cause frond discoloration and decline if not addressed. Proper fertilization and professional trimming are key to keeping Queen Palms healthy and attractive long-term."
    ],
    height: "30–50 feet tall with a crown spread of 15–25 feet",
    growthRate: "Moderate to fast — approximately 2–3 feet per year",
    bestRegions: "Performs well throughout the Florida Panhandle in protected locations. Best in Destin, Fort Walton Beach, 30A, and coastal areas with milder winter temperatures. Benefits from windbreak protection in exposed locations.",
    coldHardiness: "Hardy to approximately 25°F (USDA Zone 9b–11) — less cold-tolerant than some alternatives",
    maintenance: [
      "Requires regular fertilization with a palm-specific formula to prevent nutrient deficiencies",
      "Trim annually or biannually to remove dead fronds and fruit clusters",
      "Monitor for manganese and potassium deficiency (yellowing or browning fronds)",
      "Fruit management is important near walkways, driveways, and pool areas",
      "Inspect regularly for common pests including palm weevils"
    ],
    trimmingRecommendations: [
      "Remove only fully dead fronds — yellowing fronds are still providing nutrients to the tree",
      "Cut fruit clusters before they mature to reduce mess and pest attraction",
      "Never 'hurricane cut' a Queen Palm — this severely weakens the tree",
      "Professional trimming ensures proper technique that preserves crown health",
      "Annual trimming is typically sufficient for well-maintained specimens"
    ],
    installationOverview: [
      "Queen Palms transplant well and establish relatively quickly",
      "Choose a site with full sun and some wind protection for best results",
      "Proper planting depth is critical — too deep can cause trunk rot",
      "Consistent irrigation during establishment and ongoing fertilization are essential",
      "Gulf Coast Palms provides complete installation with aftercare recommendations tailored to your property"
    ],
    priceRange: "$250 – $1,500 installed (varies by height and trunk caliper)",
    shortDescription: "Graceful feather palm with lush arching fronds. Fast-growing tropical favorite for pools, entrances, and streetscapes."
  },
  {
    slug: "mule-palm",
    name: "Mule Palm",
    scientificName: "× Butyagrus nabonnandii",
    heroDescription: "A stunning hybrid combining the best traits of Pindo and Queen Palms — cold-hardy, fast-growing, and elegant.",
    description: [
      "The Mule Palm is a naturally occurring hybrid between the Pindo Palm (Butia odorata) and the Queen Palm (Syagrus romanzoffiana). This rare cross produces a palm that combines the cold hardiness and resilience of the Pindo with the graceful, tropical appearance of the Queen — making it one of the most desirable palms for the Emerald Coast.",
      "Like a mule (the horse-donkey hybrid), this palm is sterile and does not produce viable seed, which means it must be intentionally crossed and grown from seed each time. This makes Mule Palms rarer and more valuable than either parent species. The result is a robust, fast-growing palm with elegant arching fronds and a clean trunk.",
      "Mule Palms are increasingly popular among Emerald Coast property owners who want the lush tropical look of a Queen Palm but need better cold tolerance for Northwest Florida's occasional freezes. They're an excellent investment for waterfront estates, HOA communities, and residential properties looking for a distinctive, premium palm."
    ],
    height: "Installed at 3–6 ft | Max height: 12–15 ft",
    growthRate: "Moderate — approximately 1.5–3 feet per year",
    bestRegions: "Excellent throughout the Florida Panhandle including Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, 30A, and Perdido Key. Performs well in both coastal and slightly inland locations. More cold-tolerant than Queen Palms.",
    coldHardiness: "Hardy to approximately 15°F (USDA Zone 8b–11) — significantly more cold-hardy than Queen Palms",
    maintenance: [
      "Trim annually to remove dead fronds and maintain a clean crown",
      "Does not produce viable fruit, reducing cleanup compared to parent species",
      "Fertilize twice annually with a palm-specific slow-release fertilizer",
      "Generally resistant to most common palm pests and diseases",
      "Well-drained soil preferred — avoid low, wet planting areas",
      "Benefits from diamond cutting on mature specimens"
    ],
    trimmingRecommendations: [
      "Remove only dead and dying fronds — never cut green, healthy fronds",
      "Maintain a full, rounded crown for best appearance and health",
      "Professional trimming ensures proper technique on this premium species",
      "Annual trimming is typically sufficient for well-maintained specimens",
      "Pairs well with trunk skinning for a clean, polished look"
    ],
    installationOverview: [
      "Mule Palms are typically installed as mature specimens due to their rarity",
      "Proper root ball handling is critical for successful transplanting",
      "Bracing is recommended for 6–12 months after installation",
      "Consistent watering during the first growing season ensures strong establishment",
      "Gulf Coast Palms sources premium Mule Palms and handles complete installation with warranty"
    ],
    priceRange: "$900 – $1,100 installed",
    shortDescription: "Cold-hardy hybrid palm combining the beauty of queen palms with the durability of pindo palms. Final price depends on palm height, delivery distance, and access to the installation area."
  }
];
