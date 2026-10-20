import type { ReactNode } from "react";

/* ============================================================
   Chrome navigasi Apple: global-nav hitam 44px,
   sub-nav frosted 52px, floating sticky bar 64px.
   ============================================================ */

export function GlobalNav({ brand }: { brand: string }) {
  return (
    <header className="sticky top-0 z-40 flex h-11 items-center justify-between bg-void px-5 sm:px-8">
      <span className="text-nav-link text-white/90">{brand}</span>
    </header>
  );
}

export function SubNav({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="frosted sticky top-0 z-40 flex h-[52px] items-center justify-between px-5 sm:px-8">
      <span className="text-tagline text-ink">{title}</span>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function FloatingStickyBar({ children }: { children: ReactNode }) {
  return (
    <div className="frosted fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-between px-4 sm:px-8">
      {children}
    </div>
  );
}
