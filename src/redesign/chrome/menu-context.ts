import { createContext, useContext } from "react";

/** Lets the header and the phone action bar open the same menu. */
export interface MenuControl {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Start downloading the menu before it is needed (hover, touch). */
  warm: () => void;
}

export const MenuContext = createContext<MenuControl>({ open: false, setOpen: () => {}, warm: () => {} });
export const useMenu = () => useContext(MenuContext);
