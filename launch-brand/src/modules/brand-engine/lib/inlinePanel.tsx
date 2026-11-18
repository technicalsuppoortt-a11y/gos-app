"use client";
/**
 * Launch Brand has no pop-ups. This is a drop-in replacement for the parts of
 * @radix-ui/react-dialog (and react-alert-dialog) that the workspace uses, but
 * the "dialog" renders where it is written in the page, as an inline panel,
 * with no overlay, no portal and no focus trap. Everything that used to open
 * over the page now opens in place, pushing the content below it down.
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

type Ctx = { open: boolean; setOpen: (open: boolean) => void };
const PanelContext = React.createContext<Ctx>({ open: false, setOpen: () => undefined });

export function Root({ open, defaultOpen = false, onOpenChange, children }: {
  open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; modal?: boolean; children?: React.ReactNode;
}) {
  const [inner, setInner] = React.useState(defaultOpen);
  const controlled = open !== undefined;
  const current = controlled ? open : inner;
  const setOpen = React.useCallback((next: boolean) => {
    if (!controlled) setInner(next);
    onOpenChange?.(next);
  }, [controlled, onOpenChange]);
  const value = React.useMemo(() => ({ open: current, setOpen }), [current, setOpen]);
  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>;
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean };

export const Trigger = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild, onClick, ...props }, ref) => {
    const { open, setOpen } = React.useContext(PanelContext);
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} type={asChild ? undefined : "button"} aria-expanded={open}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => { onClick?.(event); if (!event.defaultPrevented) setOpen(!open); }}
      {...props} />;
  },
);
Trigger.displayName = "InlinePanelTrigger";

/** Radix portals content to <body>; here it stays in place. */
export function Portal({ children }: { children?: React.ReactNode; container?: unknown; forceMount?: boolean }) {
  return <>{children}</>;
}

/** The dimming backdrop is the pop-up; there is none. */
export const Overlay = Object.assign(
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { forceMount?: boolean }>(() => null),
  { displayName: "InlinePanelOverlay" },
);

type ContentProps = React.HTMLAttributes<HTMLDivElement> & {
  forceMount?: boolean;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: Event) => void;
  onInteractOutside?: (event: Event) => void;
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
  asChild?: boolean;
};

export const Content = React.forwardRef<HTMLDivElement, ContentProps>(
  ({ className, children, onEscapeKeyDown, onKeyDown, forceMount: _f, onPointerDownOutside: _p, onInteractOutside: _i,
    onOpenAutoFocus: _o, onCloseAutoFocus: _c, asChild: _a, ...props }, forwarded) => {
    const { open, setOpen } = React.useContext(PanelContext);
    const local = React.useRef<HTMLDivElement | null>(null);
    React.useEffect(() => {
      if (open) local.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    }, [open]);
    if (!open) return null;
    return <div
      ref={node => {
        local.current = node;
        if (typeof forwarded === "function") forwarded(node); else if (forwarded) forwarded.current = node;
      }}
      role="region"
      tabIndex={-1}
      data-state="open"
      className={`lb-inline-panel ${className ?? ""}`}
      onKeyDown={event => {
        onKeyDown?.(event);
        if (event.key !== "Escape" || event.defaultPrevented) return;
        const escape = event.nativeEvent;
        onEscapeKeyDown?.(escape);
        if (!escape.defaultPrevented) { event.stopPropagation(); setOpen(false); }
      }}
      {...props}
    >{children}</div>;
  },
);
Content.displayName = "InlinePanelContent";

export const Title = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  (props, ref) => <h2 ref={ref} {...props} />,
);
Title.displayName = "InlinePanelTitle";

export const Description = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  (props, ref) => <p ref={ref} {...props} />,
);
Description.displayName = "InlinePanelDescription";

export const Close = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild, onClick, ...props }, ref) => {
    const { setOpen } = React.useContext(PanelContext);
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} type={asChild ? undefined : "button"}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => { onClick?.(event); if (!event.defaultPrevented) setOpen(false); }}
      {...props} />;
  },
);
Close.displayName = "InlinePanelClose";

// react-alert-dialog names for the same parts.
export const Action = Close;
export const Cancel = Close;
