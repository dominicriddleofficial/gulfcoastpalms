/**
 * Phone action bar: call, text, menu and the quote button within thumb reach.
 *
 * It stays out of the way while a page's own main buttons are on screen and slides in
 * once they scroll off. Placement stays "sticky_bar", the name the current bottom bar
 * reports under.
 */
import { GCP_BUSINESS } from "@/lib/business-info";
import { CallLink, QuoteLink, TextLink } from "../lib/actions";
import { CameraIcon, MenuIcon, PhoneIcon } from "../lib/icons";
import { useMenu } from "./menu-context";

export default function Dock({ shown, quote = true }: { shown: boolean; quote?: boolean }) {
  const menu = useMenu();
  return (
    <div className="rd-dock" data-shown={shown} aria-hidden={!shown}>
      <CallLink placement="sticky_bar" className="rd-dock__item" ariaLabel={`Call ${GCP_BUSINESS.phoneDisplay}`}>
        <PhoneIcon size={20} />
        <span>Call</span>
      </CallLink>
      <TextLink placement="sticky_bar" className="rd-dock__item" ariaLabel="Text us a photo">
        <CameraIcon size={20} />
        <span>Text</span>
      </TextLink>
      <button type="button" className="rd-dock__item" onClick={() => menu.setOpen(true)} onTouchStart={menu.warm} aria-haspopup="dialog">
        <MenuIcon size={20} />
        <span>Menu</span>
      </button>
      {quote && <QuoteLink placement="sticky_bar" className="rd-dock__quote">Free quote</QuoteLink>}
    </div>
  );
}
