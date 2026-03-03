import job1 from "@/assets/gallery/job-1.jpeg";
import job2 from "@/assets/gallery/job-2.jpeg";
import job3 from "@/assets/gallery/job-3.jpeg";
import job4 from "@/assets/gallery/job-4.jpeg";
import job5 from "@/assets/gallery/job-5.jpeg";
import job6 from "@/assets/gallery/job-6.jpeg";
import job7 from "@/assets/gallery/job-7.jpeg";
import job8 from "@/assets/gallery/job-8.jpeg";
import job9 from "@/assets/gallery/job-9.jpeg";
import job10 from "@/assets/gallery/job-10.jpeg";
import job11 from "@/assets/gallery/job-11.jpeg";

export interface LocationData {
  slug: string;
  city: string;
  state: string;
  h1: string;
  subheading: string;
  introParagraphs: string[];
  highlight?: string;
  services: string[];
  whyChooseTitle: string;
  whyChoosePoints: string[];
  whyChooseClosing: string;
  ctaHeading: string;
  ctaText: string;
  images: { src: string; alt: string }[];
  metaTitle: string;
  metaDescription: string;
  nearbyLinks: string[]; // slugs of nearby cities
}

export const locations: LocationData[] = [
  {
    slug: "palm-tree-trimming-pensacola-fl",
    city: "Pensacola",
    state: "FL",
    h1: "Palm Tree Trimming in Pensacola, FL",
    subheading: "Professional Palm Care, Diamond Cutting & Safe Removals for Homes, HOAs & Commercial Properties",
    introParagraphs: [
      "Gulf Coast Palms provides expert palm tree trimming and professional palm care throughout Pensacola, FL. From historic neighborhoods and waterfront estates to commercial properties and condominium communities, our team delivers clean cuts, healthy crowns, and long-term palm protection designed for Florida's coastal climate.",
      "We specialize in proper trimming techniques that protect palm health and storm resistance — because overcutting and improper pruning can permanently damage your trees. Whether you own a single palm at your downtown Pensacola home or manage a large HOA community with mature palms lining every street, our crew has the expertise and equipment to handle it right.",
      "Pensacola's unique coastal environment — from the historic districts near Palafox Street to the waterfront properties along Pensacola Bay and Perdido Bay — demands a specialized approach to palm maintenance. Salt spray, humidity, and seasonal storms all affect how palms should be trimmed and maintained. Our team understands these local conditions and adjusts our techniques accordingly.",
      "We've built a strong reputation across Escambia County by consistently delivering clean, professional results that enhance property values and protect palm health for years to come. Many of our Pensacola clients started working with us after experiencing damage from inexperienced crews who overcut or improperly pruned their palms.",
    ],
    services: [
      "Palm tree trimming & pruning",
      "Diamond cutting",
      "Trunk skinning",
      "Palm installations",
      "Safe palm removals",
      "Large-scale property maintenance (100+ palms)",
    ],
    whyChooseTitle: "Why Pensacola Homeowners & Property Managers Choose Us",
    whyChoosePoints: [
      "500+ palm jobs completed in 2025",
      "Experienced with large properties and HOA communities",
      "Licensed & insured",
      "5-star rated across the Emerald Coast",
      "Locally owned & operated",
    ],
    whyChooseClosing: "We frequently correct damage caused by improper trimming from other companies, ensuring stronger crowns and healthier palms built to withstand coastal winds and storms. Whether you have a few palms at your home or manage a property with dozens or hundreds, we have the equipment and experience to handle it safely and efficiently.",
    ctaHeading: "Need professional palm tree trimming in Pensacola?",
    ctaText: "Call or text today for a free quote.",
    images: [
      { src: job1, alt: "Palm tree trimming at a Pensacola waterfront home" },
      { src: job5, alt: "Professional palm care in Pensacola FL" },
      { src: job8, alt: "Diamond cut palms at Pensacola property" },
    ],
    metaTitle: "Palm Tree Trimming Pensacola FL | Gulf Coast Palms",
    metaDescription: "Professional palm tree trimming in Pensacola, FL. Diamond cutting, trunk skinning, installations & removals. 500+ jobs completed. Call (850) 910-1290.",
    nearbyLinks: ["palm-tree-trimming-gulf-breeze-fl", "palm-tree-trimming-perdido-key-fl", "palm-tree-trimming-navarre-fl"],
  },
  {
    slug: "palm-tree-trimming-gulf-breeze-fl",
    city: "Gulf Breeze",
    state: "FL",
    h1: "Palm Tree Trimming in Gulf Breeze, FL",
    subheading: "Resort-Quality Palm Care for Waterfront Homes, HOAs & Coastal Estates",
    introParagraphs: [
      "From waterfront homes along the Sound to high-end residential communities, Gulf Coast Palms delivers resort-quality palm care in Gulf Breeze, FL. We understand the expectations of Gulf Breeze homeowners — clean work, attention to detail, and proper trimming that enhances curb appeal while protecting long-term tree health.",
      "Our team maintains properties featuring dozens to hundreds of palms and understands how to keep them uniform, healthy, and storm-ready. Gulf Breeze is known for its beautiful waterfront properties along Santa Rosa Sound and Pensacola Bay, and our palm care services help maintain that signature coastal aesthetic.",
      "Many Gulf Breeze homeowners invest significantly in their landscaping, and palms are often the centerpiece of that investment. That's why proper trimming technique matters — not just for appearance, but for the long-term structural health of each tree. Overcutting weakens palms and makes them more vulnerable to storm damage.",
      "We work with individual homeowners, HOA boards, and property management companies throughout Gulf Breeze to develop maintenance schedules that keep palms looking their best year-round while protecting them from Florida's unpredictable weather.",
    ],
    services: [
      "Professional palm trimming",
      "Precision diamond cutting",
      "Trunk skinning",
      "Palm installation & replacements",
      "Safe removals",
      "Large HOA & waterfront estate maintenance",
    ],
    whyChooseTitle: "Why Gulf Breeze Trusts Us",
    whyChoosePoints: [
      "500+ jobs completed in 2025",
      "Trusted by property managers & HOAs",
      "Licensed & insured professionals",
      "5-star rated locally",
      "Specialists in diamond cutting & coastal care",
    ],
    whyChooseClosing: "We don't just trim palms — we specialize in them. Improper cutting can weaken a palm permanently. Our trimming approach prioritizes structural integrity and long-term growth, delivering clean results that Gulf Breeze homeowners expect.",
    ctaHeading: "Schedule your free Gulf Breeze palm evaluation today.",
    ctaText: "Call or text for a free quote.",
    images: [
      { src: job2, alt: "Aerial view of Gulf Breeze waterfront palm maintenance" },
      { src: job6, alt: "Beachfront condo palm care in Gulf Breeze" },
      { src: job9, alt: "Palm trimming at Gulf Breeze residential property" },
    ],
    metaTitle: "Palm Tree Trimming Gulf Breeze FL | Gulf Coast Palms",
    metaDescription: "Expert palm tree trimming in Gulf Breeze, FL. Resort-quality diamond cutting, trunk skinning & palm care. 500+ jobs completed. Call (850) 910-1290.",
    nearbyLinks: ["palm-tree-trimming-pensacola-fl", "palm-tree-trimming-navarre-fl", "palm-tree-trimming-fort-walton-beach-fl"],
  },
  {
    slug: "palm-tree-trimming-navarre-fl",
    city: "Navarre",
    state: "FL",
    h1: "Palm Tree Trimming in Navarre, FL",
    subheading: "The Emerald Coast's Leading Palm Tree Specialists — Serving Beachfront Homes, HOAs & Large Coastal Properties",
    introParagraphs: [
      "Gulf Coast Palms is a leading provider of palm tree trimming in Navarre, FL, serving beachfront homes, residential neighborhoods, and large coastal properties. With extensive experience maintaining properties featuring 100+ palms, we understand the precision required to protect palm health while maintaining a clean, uniform appearance.",
      "Navarre's coastal winds and storms demand proper trimming techniques — not overcutting. Our team uses industry-best practices to ensure each cut promotes healthy regrowth and strengthens the palm's natural storm resistance. From the beachside communities along Navarre Beach to the established neighborhoods near the Intracoastal Waterway, we deliver consistent, professional results.",
      "Many of our clients in Navarre rely on us for routine seasonal trimming to maintain curb appeal and storm preparedness year-round. We've maintained some of the largest palm properties in the Navarre area, including waterfront estates, resort-style communities, and commercial properties along Highway 98.",
      "Navarre is one of our strongest service areas, and our deep familiarity with the local landscape and community makes us the go-to palm specialists for homeowners and property managers alike. We take pride in the relationships we've built with Navarre residents who trust us to keep their palms healthy and beautiful season after season.",
    ],
    highlight: "Many of our clients in Navarre rely on us for routine seasonal trimming to maintain curb appeal and storm preparedness year-round.",
    services: [
      "Expert palm tree trimming & shaping",
      "Diamond cutting specialists",
      "Trunk skinning & thinning",
      "New palm installations",
      "Safe palm tree removals",
      "Large-scale property programs (100+ palms)",
    ],
    whyChooseTitle: "Why Choose Us in Navarre",
    whyChoosePoints: [
      "500+ palm jobs completed in 2025",
      "Experienced with large-scale properties",
      "Diamond cutting specialists",
      "Locally owned & operated",
      "Fully licensed & insured",
    ],
    whyChooseClosing: "We often repair long-term damage caused by aggressive trimming from inexperienced crews. Our approach protects your investment and ensures palms that look beautiful and stand strong through every Florida storm season.",
    ctaHeading: "Need professional palm trimming in Navarre?",
    ctaText: "Call or text today for a free quote.",
    images: [
      { src: job11, alt: "Luxury property with trimmed palms in Navarre FL" },
      { src: job3, alt: "Palm maintenance at Navarre coastal property" },
      { src: job7, alt: "Professional palm trimming in Navarre Florida" },
    ],
    metaTitle: "Palm Tree Trimming Navarre FL | Gulf Coast Palms",
    metaDescription: "Leading palm tree trimming in Navarre, FL. Diamond cutting, trunk skinning & large-scale palm care. 500+ jobs completed. Call (850) 910-1290.",
    nearbyLinks: ["palm-tree-trimming-gulf-breeze-fl", "palm-tree-trimming-fort-walton-beach-fl", "palm-tree-trimming-destin-fl"],
  },
  {
    slug: "palm-tree-trimming-fort-walton-beach-fl",
    city: "Fort Walton Beach",
    state: "FL",
    h1: "Palm Tree Trimming in Fort Walton Beach, FL",
    subheading: "Professional Palm Care for Waterfront Estates, Condos & Commercial Properties",
    introParagraphs: [
      "Gulf Coast Palms provides professional palm tree trimming and coastal palm care throughout Fort Walton Beach, FL. From waterfront estates and condominium complexes to commercial properties and shopping centers, we maintain palms with precision and safety.",
      "Proper trimming is critical in Fort Walton's coastal climate, where storm exposure can weaken poorly cut trees. Our team uses proven techniques that strengthen each palm's natural structure while delivering the clean, manicured look that Fort Walton Beach property owners expect.",
      "Fort Walton Beach sits at the heart of the Emerald Coast, and its mix of residential communities, vacation rentals, and commercial properties creates a diverse range of palm care needs. Whether you're a homeowner on Okaloosa Island, a condo association along the harbor, or a business owner on Miracle Strip Parkway, our crew delivers consistent, high-quality results.",
      "We understand that Fort Walton Beach properties face unique challenges — from salt air exposure to high winds during storm season. Our trimming methods account for these factors, promoting stronger root systems and healthier crowns that can withstand whatever the Gulf throws at them.",
    ],
    services: [
      "Palm tree trimming & crown shaping",
      "Diamond cutting",
      "Trunk skinning",
      "Palm tree installations",
      "Safe removals & stump cleanup",
      "Condo & commercial property maintenance",
    ],
    whyChooseTitle: "Why Fort Walton Beach Property Owners Trust Us",
    whyChoosePoints: [
      "500+ palm jobs completed in 2025",
      "Trusted by condo associations & commercial properties",
      "Licensed & insured professionals",
      "5-star rated across the Emerald Coast",
      "Experienced with waterfront & high-wind properties",
    ],
    whyChooseClosing: "From Okaloosa Island condominiums to residential neighborhoods along the Choctawhatchee Bay, we deliver professional palm care that protects property values and palm health. Our team regularly maintains large-scale properties and understands the unique demands of Fort Walton's coastal environment.",
    ctaHeading: "Need palm tree trimming in Fort Walton Beach?",
    ctaText: "Call or text today for a free estimate.",
    images: [
      { src: job6, alt: "Condo palm care in Fort Walton Beach FL" },
      { src: job4, alt: "Palm trimming at Fort Walton Beach property" },
      { src: job10, alt: "Professional palm services in Fort Walton Beach" },
    ],
    metaTitle: "Palm Tree Trimming Fort Walton Beach FL | Gulf Coast Palms",
    metaDescription: "Professional palm tree trimming in Fort Walton Beach, FL. Diamond cutting, trunk skinning & condo palm care. 500+ jobs completed. Call (850) 910-1290.",
    nearbyLinks: ["palm-tree-trimming-navarre-fl", "palm-tree-trimming-destin-fl", "palm-tree-trimming-gulf-breeze-fl"],
  },
  {
    slug: "palm-tree-trimming-destin-fl",
    city: "Destin",
    state: "FL",
    h1: "Palm Tree Trimming in Destin, FL",
    subheading: "Premium Palm Care for Luxury Homes, Vacation Rentals, HOAs & High-End Commercial Landscapes",
    introParagraphs: [
      "Destin properties demand exceptional curb appeal. Gulf Coast Palms delivers resort-quality palm care for homes, vacation properties, HOAs, and commercial landscapes throughout Destin, FL. We maintain high-end coastal properties and understand the importance of clean diamond cuts, uniform crowns, and storm-ready palms.",
      "From the luxury homes along Crystal Beach to the high-visibility vacation rental properties on Holiday Isle, Destin's palm care needs go beyond basic trimming. Property owners here expect perfection — and that's exactly what we deliver. Our diamond cutting technique creates a signature polished look that sets properties apart.",
      "Destin's thriving vacation rental market means that curb appeal directly impacts bookings and property value. We work with vacation rental owners and property management companies to maintain palms on a regular schedule, ensuring properties always look their best for guests and potential buyers.",
      "Whether you manage a luxury beachfront estate on Scenic Highway 98, a condo community near Henderson Beach State Park, or a commercial property along the Destin harbor, our team brings the expertise and professionalism that premium Destin properties require. We treat every property like a five-star resort.",
    ],
    services: [
      "Premium palm trimming & shaping",
      "Signature diamond cutting",
      "Trunk skinning & detailing",
      "Palm installations for new landscapes",
      "Safe removals with full cleanup",
      "Luxury property & vacation rental maintenance",
    ],
    whyChooseTitle: "Why Destin Properties Choose Gulf Coast Palms",
    whyChoosePoints: [
      "500+ palm jobs completed in 2025",
      "Trusted by luxury homeowners & vacation rental managers",
      "Diamond cutting specialists",
      "Licensed & insured",
      "5-star rated — matching Destin's standards",
    ],
    whyChooseClosing: "Destin's reputation as a premier coastal destination means your property's appearance matters. We help protect that reputation with palm care that meets the highest standards — clean cuts, healthy trees, and results that impress guests, buyers, and neighbors alike.",
    ctaHeading: "Request a free Destin palm care quote today.",
    ctaText: "Call or text for premium palm services.",
    images: [
      { src: job11, alt: "Luxury Destin property with professionally trimmed palms" },
      { src: job2, alt: "Resort-quality palm care in Destin FL" },
      { src: job1, alt: "Diamond cut palms at Destin waterfront estate" },
    ],
    metaTitle: "Palm Tree Trimming Destin FL | Gulf Coast Palms",
    metaDescription: "Premium palm tree trimming in Destin, FL. Diamond cutting, trunk skinning & luxury palm care for vacation rentals & estates. Call (850) 910-1290.",
    nearbyLinks: ["palm-tree-trimming-fort-walton-beach-fl", "palm-tree-trimming-30a-fl", "palm-tree-trimming-navarre-fl"],
  },
  {
    slug: "palm-tree-trimming-30a-fl",
    city: "30A",
    state: "FL",
    h1: "Palm Tree Trimming Along 30A, Florida",
    subheading: "Boutique Palm Care for 30A's Distinctive Coastal Communities — From Rosemary Beach to WaterColor",
    introParagraphs: [
      "The communities along Scenic Highway 30A are known for distinctive architecture, curated landscapes, and an unmatched coastal lifestyle. Gulf Coast Palms provides premium palm tree trimming and professional palm care for homes, vacation rentals, and commercial properties throughout the 30A corridor.",
      "From Rosemary Beach and Alys Beach to WaterColor, Seaside, and Grayton Beach, each 30A community has its own design standards and aesthetic expectations. Our team understands these nuances and delivers palm care that complements the unique character of each neighborhood — whether that means pristine diamond cuts for a modern Alys Beach home or natural shaping for a laid-back Grayton Beach cottage.",
      "30A's vacation rental market is one of the most competitive in Florida, and first impressions start at the curb. Well-maintained palms signal quality and attention to detail that guests notice immediately. We partner with 30A property managers and homeowners to keep palms looking their best year-round.",
      "The 30A corridor's proximity to the Gulf means palms face constant salt exposure, high humidity, and storm winds. Our trimming techniques account for these coastal conditions, promoting stronger crowns and healthier root systems that keep palms thriving for years to come.",
    ],
    services: [
      "Boutique palm trimming & shaping",
      "Precision diamond cutting",
      "Trunk skinning",
      "Palm installations & landscape enhancement",
      "Safe removals",
      "Vacation rental & community maintenance programs",
    ],
    whyChooseTitle: "Why 30A Communities Trust Gulf Coast Palms",
    whyChoosePoints: [
      "500+ palm jobs completed in 2025",
      "Experienced with 30A's distinctive communities",
      "Diamond cutting specialists",
      "Licensed & insured",
      "Locally owned & operated",
    ],
    whyChooseClosing: "30A properties deserve palm care that matches their surroundings — polished, intentional, and built to last. We deliver that standard with every job, whether it's a single palm at a beach cottage or a full property maintenance program for a luxury development.",
    ctaHeading: "Need palm care along 30A?",
    ctaText: "Call or text for a free quote on any 30A property.",
    images: [
      { src: job3, alt: "Palm tree maintenance at a 30A beach community" },
      { src: job9, alt: "Professional palm care along Scenic Highway 30A" },
      { src: job5, alt: "Diamond cut palms at 30A luxury property" },
    ],
    metaTitle: "Palm Tree Trimming 30A Florida | Gulf Coast Palms",
    metaDescription: "Premium palm tree trimming along 30A, FL. Serving Rosemary Beach, Alys Beach, WaterColor & Seaside. Diamond cutting & professional palm care. Call (850) 910-1290.",
    nearbyLinks: ["palm-tree-trimming-destin-fl", "palm-tree-trimming-fort-walton-beach-fl", "palm-tree-trimming-navarre-fl"],
  },
  {
    slug: "palm-tree-trimming-perdido-key-fl",
    city: "Perdido Key",
    state: "FL",
    h1: "Palm Tree Trimming in Perdido Key, FL",
    subheading: "Professional Palm Care for Perdido Key's Beachfront Condos, Waterfront Homes & Coastal Estates",
    introParagraphs: [
      "Gulf Coast Palms provides professional palm tree trimming and coastal palm care throughout Perdido Key, FL. From the high-rise condominiums along the beach to waterfront homes on Old River and the Intracoastal Waterway, we deliver clean, precise palm care that protects property values and tree health.",
      "Perdido Key's barrier island location means palms face some of the most challenging coastal conditions in Northwest Florida — constant salt spray, sandy soil, high winds, and direct storm exposure. Our team understands these unique conditions and uses trimming techniques specifically designed to strengthen palms against these environmental stresses.",
      "Many Perdido Key properties feature mature palms that require careful, experienced handling. Overcutting or improper pruning — common mistakes from less experienced crews — can permanently weaken these trees and make them vulnerable to storm damage. Our approach prioritizes long-term palm health while delivering the manicured appearance that Perdido Key property owners expect.",
      "Whether you manage a beachfront condo association, own a waterfront home along the bay, or maintain a vacation rental property, our crew delivers reliable, high-quality palm care with minimal disruption to your property and your guests.",
    ],
    services: [
      "Professional palm trimming & pruning",
      "Diamond cutting",
      "Trunk skinning",
      "Palm installations",
      "Safe palm removals",
      "Condo association & multi-property maintenance",
    ],
    whyChooseTitle: "Why Perdido Key Property Owners Choose Us",
    whyChoosePoints: [
      "500+ palm jobs completed in 2025",
      "Experienced with barrier island properties",
      "Licensed & insured professionals",
      "5-star rated across the Gulf Coast",
      "Specialists in storm-resilient palm care",
    ],
    whyChooseClosing: "Perdido Key's palms face tougher conditions than most — and they need a crew that understands that. We protect your investment with trimming techniques that promote stronger, healthier palms built to handle everything the Gulf throws at them.",
    ctaHeading: "Need palm care on Perdido Key?",
    ctaText: "Call or text today for a free quote.",
    images: [
      { src: job8, alt: "Palm trimming at Perdido Key beachfront condo" },
      { src: job7, alt: "Professional palm care on Perdido Key FL" },
      { src: job4, alt: "Waterfront palm maintenance at Perdido Key property" },
    ],
    metaTitle: "Palm Tree Trimming Perdido Key FL | Gulf Coast Palms",
    metaDescription: "Professional palm tree trimming on Perdido Key, FL. Diamond cutting, trunk skinning & condo palm care for barrier island properties. Call (850) 910-1290.",
    nearbyLinks: ["palm-tree-trimming-pensacola-fl", "palm-tree-trimming-gulf-breeze-fl", "palm-tree-trimming-navarre-fl"],
  },
];

export const getLocationBySlug = (slug: string): LocationData | undefined =>
  locations.find((l) => l.slug === slug);
