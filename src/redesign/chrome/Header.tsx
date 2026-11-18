/**
 * Site header. Tree Services and Palm Services lead, so each visitor sees their kind
 * of work first; Commercial sits in the bar for property managers.
 *
 * Call, text and quote links keep the placement names the current header uses
 * ("header", "header_mobile"), so the owner's website report stays comparable.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { GCP_BUSINESS } from "@/lib/business-info";
import { areaLinks, moreLinks, palmServices, propertyServices, treeServices, shortLabel, type NavItem } from "../data/nav";
import { CallLink, QuoteLink, TextLink } from "../lib/actions";
import { CameraIcon, ChevronIcon, MenuIcon, PhoneIcon } from "../lib/icons";
import { useMenu } from "./menu-context";

interface Group {
  id: string;
  label: string;
  items: NavItem[];
  /** Link at the foot of the panel to the page listing everything in the group. */
  all?: NavItem;
  columns?: 1 | 2;
  short?: boolean;
}

const GROUPS: Group[] = [
  { id: "tree", label: "Tree Services", items: treeServices.filter((i) => i.to !== "/services/tree-trimming-removal"), all: { label: "All tree services", to: "/services/tree-trimming-removal" }, short: true },
  { id: "palm", label: "Palm Services", items: palmServices, all: { label: "All services", to: "/services" }, columns: 2, short: true },
  { id: "areas", label: "Service Areas", items: areaLinks, all: { label: "All service areas", to: "/service-areas" }, columns: 2 },
  { id: "more", label: "More", items: [...propertyServices, ...moreLinks], columns: 2 },
];

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/" className="rd-brand" aria-label="Gulf Coast Palms home" onClick={onClick}>
      <span className="rd-brand__mark" aria-hidden />
      <span className="rd-brand__text">
        <span className="rd-brand__name">Gulf Coast Palms</span>
        <span className="rd-brand__sub">Tree &amp; palm service</span>
      </span>
    </Link>
  );
}

export default function Header() {
  const { pathname } = useLocation();
  const [openId, setOpenId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const menu = useMenu();

  useEffect(() => setOpenId(null), [pathname]);
  // The glass bar turns more solid once the page has moved. Written straight to the
  // element so scrolling never re-renders the header.
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    const update = () => { bar.current?.setAttribute("data-scrolled", String(window.scrollY > 8)); };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname]);
  useEffect(() => {
    if (!openId) return;
    const onDown = (e: PointerEvent) => { if (!navRef.current?.contains(e.target as Node)) setOpenId(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [openId]);

  const current = (to: string) => (pathname === to ? ("page" as const) : undefined);

  return (
    <header className="rd-hd" ref={bar}>
      <div className="rd-hd__bar">
        <Brand />

        <nav className="rd-hd__nav" aria-label="Main" ref={navRef}>
          {GROUPS.slice(0, 2).map((g) => <NavGroup key={g.id} group={g} open={openId === g.id} setOpenId={setOpenId} pathname={pathname} />)}
          <Link to="/jobs" className="rd-nav-link" aria-current={current("/jobs")}>Projects</Link>
          <NavGroup group={GROUPS[2]} open={openId === "areas"} setOpenId={setOpenId} pathname={pathname} />
          <Link to="/commercial" className="rd-nav-link" aria-current={current("/commercial")}>Commercial</Link>
          <NavGroup group={GROUPS[3]} open={openId === "more"} setOpenId={setOpenId} pathname={pathname} />
        </nav>

        <div className="rd-hd__tools">
          <CallLink placement="header" className="rd-hd__phone rd-hd__desk">
            <PhoneIcon size={17} />
            {GCP_BUSINESS.phoneDisplay}
          </CallLink>
          <TextLink placement="header" className="rd-icon-btn rd-hd__desk" ariaLabel="Text us a photo">
            <CameraIcon size={18} />
            <span className="rd-hd__label">Text a photo</span>
          </TextLink>
          <QuoteLink placement="header" className="rd-btn rd-btn--go rd-hd__quote rd-hd__desk" />

          <CallLink placement="header_mobile" className="rd-icon-btn rd-hd__mob" ariaLabel={`Call ${GCP_BUSINESS.phoneDisplay}`}>
            <PhoneIcon size={20} />
          </CallLink>
          <button
            type="button"
            className="rd-icon-btn rd-hd__mob"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={menu.open}
            data-rd-menu
            onPointerEnter={menu.warm}
            onTouchStart={menu.warm}
            onFocus={menu.warm}
            onClick={() => menu.setOpen(true)}
          >
            <MenuIcon size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}

function NavGroup({ group, open, setOpenId, pathname }: { group: Group; open: boolean; setOpenId: (id: string | null) => void; pathname: string }) {
  const here = group.items.some((i) => i.to === pathname) || group.all?.to === pathname;
  // With a mouse the panel is already open from hovering, so a click must not shut it again.
  // A finger tap or the keyboard has no hover, so there a press opens and closes it.
  const mousePress = useRef(false);
  return (
    <div className="rd-nav-group" onPointerLeave={(e) => { if (e.pointerType === "mouse") setOpenId(null); }}>
      <button
        type="button"
        className="rd-nav-link"
        aria-expanded={open}
        aria-controls={`rd-nav-${group.id}`}
        aria-current={here ? "page" : undefined}
        onPointerEnter={(e) => { if (e.pointerType === "mouse") setOpenId(group.id); }}
        onPointerDown={(e) => { mousePress.current = e.pointerType === "mouse"; }}
        onClick={(e) => {
          const byMouse = mousePress.current && e.detail > 0;
          mousePress.current = false;
          setOpenId(open && !byMouse ? null : group.id);
        }}
      >
        {group.label}
        <ChevronIcon size={15} />
      </button>
      <div id={`rd-nav-${group.id}`} className={`rd-nav-panel${group.columns === 2 ? " rd-nav-panel--two" : ""}`} hidden={!open}>
        <ul>
          {group.items.map((item) => (
            <li key={item.to}>
              <Link to={item.to} aria-current={pathname === item.to ? "page" : undefined}>
                <b>{group.short ? shortLabel(item) : item.label}</b>
                {item.note && <span>{item.note}</span>}
              </Link>
            </li>
          ))}
        </ul>
        {group.all && <Link to={group.all.to} className="rd-nav-panel__all rd-link">{group.all.label}</Link>}
      </div>
    </div>
  );
}
