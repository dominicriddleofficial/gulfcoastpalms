import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { prefetchRoute, isHoverCapable } from "@/lib/route-prefetch";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, onMouseEnter, onFocus, ...props }, ref) => {
    const path = typeof to === "string" ? to : null;
    const prefetch = path && isHoverCapable() ? () => prefetchRoute(path) : null;
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        onMouseEnter={(e) => {
          prefetch?.();
          onMouseEnter?.(e);
        }}
        onFocus={(e) => {
          prefetch?.();
          onFocus?.(e);
        }}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
