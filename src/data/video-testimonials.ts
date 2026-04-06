export interface VideoTestimonial {
  id: string;
  customerName: string;
  city: string;
  quote: string;
  thumbnailUrl: string;
  videoUrl: string; // YouTube embed URL: https://www.youtube-nocookie.com/embed/VIDEO_ID
  service: string;
}

/**
 * Add real video testimonials here when available.
 * The VideoTestimonials section will only render when this array is non-empty.
 *
 * To add a video:
 * 1. Upload to YouTube (unlisted is fine)
 * 2. Get the video ID from the URL
 * 3. Set thumbnailUrl to: https://img.youtube.com/vi/[VIDEO_ID]/maxresdefault.jpg
 * 4. Set videoUrl to: https://www.youtube-nocookie.com/embed/[VIDEO_ID]
 * 5. Add an entry to this array
 */
export const videoTestimonials: VideoTestimonial[] = [
  // Example (remove and replace with real testimonials):
  // {
  //   id: "1",
  //   customerName: "Mike",
  //   city: "Navarre, FL",
  //   quote: "They transformed my entire yard. Best money I've spent on the house.",
  //   thumbnailUrl: "https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg",
  //   videoUrl: "https://www.youtube-nocookie.com/embed/VIDEO_ID",
  //   service: "Palm Tree Trimming"
  // }
];
