import { useState } from "react";
import { Play } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { videoTestimonials } from "@/data/video-testimonials";

const VideoTestimonials = () => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  if (videoTestimonials.length === 0) return null;

  return (
    <section className="section-padding bg-palm-dark">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <p className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
            Video Testimonials
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-palm-sand mb-4">
            From Our Customers
          </h2>
          <p className="font-body text-palm-sand/70 max-w-2xl mx-auto">
            Real NW Florida homeowners share their experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videoTestimonials.map((video) => (
            <button
              key={video.id}
              onClick={() => setActiveVideo(video.videoUrl)}
              className="group text-left bg-card border border-border rounded-xl overflow-hidden hover:border-primary transition-colors"
            >
              <div className="relative aspect-video">
                <img
                  src={video.thumbnailUrl}
                  alt={`${video.customerName} from ${video.city} — ${video.service} testimonial`}
                  className="w-full h-full object-cover"
                  width={640}
                  height={360}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center group-hover:bg-foreground/40 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-primary-foreground/90 flex items-center justify-center">
                    <Play className="w-7 h-7 text-primary ml-1" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="font-display font-bold text-foreground text-sm">
                  {video.customerName} — {video.city}
                </p>
                <p className="font-body text-sm text-muted-foreground italic mt-1">
                  "{video.quote}"
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!activeVideo} onOpenChange={() => setActiveVideo(null)}>
        <DialogContent className="max-w-3xl p-0 bg-foreground border-none">
          <DialogTitle className="sr-only">Customer Video Testimonial</DialogTitle>
          {activeVideo && (
            <div className="aspect-video w-full">
              <iframe
                src={activeVideo}
                title="Customer video testimonial"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default VideoTestimonials;
