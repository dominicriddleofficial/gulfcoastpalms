import { MessageSquare } from "lucide-react";
import { trackChatOpen } from "@/lib/analytics";

interface ChatButtonProps {
  className?: string;
  ariaLabel?: string;
  onOpen: () => void;
}

/**
 * Stateless chat-launcher button. Owns the GA "chat_widget_open" event
 * and delegates the open action to the parent so the heavy ChatWidget
 * code can stay lazy until needed.
 */
const ChatButton = ({
  className = "fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] md:bottom-6 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center",
  ariaLabel = "Open chat assistant",
  onOpen,
}: ChatButtonProps) => (
  <button
    type="button"
    onClick={() => {
      trackChatOpen();
      onOpen();
    }}
    className={className}
    aria-label={ariaLabel}
  >
    <MessageSquare className="w-6 h-6" aria-hidden="true" />
  </button>
);

export default ChatButton;