/**
 * Phone menu: a full-screen sheet with the two service routes first and the three
 * contact actions pinned at the bottom, inside thumb reach.
 *
 * Built on the same Radix dialog the current menu uses, so focus stays inside it,
 * Escape closes it and the page behind does not scroll. Menu analytics events keep
 * their current names (mobile_menu_opened / mobile_menu_link_clicked).
 */
import * as Dialog from "@radix-ui/react-dialog";
import { Link, useLocation } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { GCP_BUSINESS } from "@/lib/business-info";
import { coastAreas, moreLinks, palmServices, propertyServices, shortLabel, treeServices, type NavItem } from "../data/nav";
import { CallLink, QuoteLink, TextLink } from "../lib/actions";
import { CameraIcon, CloseIcon, PhoneIcon } from "../lib/icons";
import { useReturnFocus } from "../lib/useReturnFocus";
import { Brand } from "./Header";

const TOP_LINKS: NavItem[] = [
  { label: "Completed projects", to: "/jobs" },
  { label: "Commercial & property managers", to: "/commercial" },
  { label: "Service areas", to: "/service-areas" },
  ...propertyServices,
];

export default function Menu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { pathname } = useLocation();
  const returnFocus = useReturnFocus(open);
  const close = () => onOpenChange(false);
  const pick = (label: string) => {
    trackEvent("mobile_menu_link_clicked", { source: "mobile_menu", cta_text: label });
    close();
  };
  const row = (item: NavItem, short = false) => {
    const label = short ? shortLabel(item) : item.label;
    return (
      <li key={item.to}>
        <Link to={item.to} onClick={() => pick(item.label)} aria-current={pathname === item.to ? "page" : undefined}>
          <b>{label}</b>
          {item.note && <span>{item.note}</span>}
        </Link>
      </li>
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* The backdrop is what stops the page behind from scrolling while the menu is open. */}
        <Dialog.Overlay className="rd-menu__veil" />
        <Dialog.Content className="rd rd-menu" aria-describedby={undefined} onCloseAutoFocus={returnFocus}>
          <div className="rd-menu__top">
            <Brand onClick={close} />
            <Dialog.Close className="rd-icon-btn" aria-label="Close menu">
              <CloseIcon size={22} />
            </Dialog.Close>
          </div>
          <Dialog.Title className="rd-sr">Menu</Dialog.Title>

          <nav className="rd-menu__scroll" aria-label="Site">
            <section>
              <h2 className="rd-menu__head">Tree services</h2>
              <ul className="rd-menu__list">{treeServices.map((i) => row(i, true))}</ul>
            </section>
            <section>
              <h2 className="rd-menu__head">Palm services</h2>
              <ul className="rd-menu__list rd-menu__list--two">{palmServices.map((i) => row({ ...i, note: undefined }, true))}</ul>
            </section>
            <section>
              <ul className="rd-menu__list">{TOP_LINKS.map((i) => row({ ...i, note: undefined }))}</ul>
            </section>
            <section>
              <h2 className="rd-menu__head">Where we work</h2>
              <ul className="rd-menu__chips">
                {coastAreas.map((a) => (
                  <li key={a.to}><Link to={a.to} onClick={() => pick(a.city)} aria-current={pathname === a.to ? "page" : undefined}>{a.city}</Link></li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="rd-menu__head">More</h2>
              <ul className="rd-menu__list rd-menu__list--two rd-menu__list--plain">{moreLinks.map((i) => row(i))}</ul>
            </section>
          </nav>

          <div className="rd-menu__actions">
            <QuoteLink placement="mobile_menu" className="rd-btn rd-btn--go rd-btn--wide" onClick={() => pick("Get a Free Quote")} />
            <CallLink placement="mobile_menu" className="rd-btn rd-btn--line" onClick={close} ariaLabel={`Call ${GCP_BUSINESS.phoneDisplay}`}>
              <PhoneIcon size={18} /> Call
            </CallLink>
            <TextLink placement="mobile_menu" className="rd-btn rd-btn--line" onClick={close}>
              <CameraIcon size={18} /> Text a photo
            </TextLink>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
