"use client";

import { createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The product mark the empty canvas shows. It is a port so a host can inject its own mark while the
 * package stays brand-neutral; the default below is the Isothrum mark (the geometry is shared with
 * the website's favicon and OG images), themed by the host's `--primary` tokens.
 */
export interface BrandMarkProps {
  className?: string;
}

export type BrandMark = (props: BrandMarkProps) => ReactNode;

const logoMark = {
  viewBox: "0 0 32 32",
  radius: 9,
  fill: "M7.2 8.1 14.6 7.8 14.4 15.3 7 15.5Z M17.6 16.6 25.1 16.3 24.9 24 17.4 23.8Z",
  stroke: "M14.6 11.6C16.8 11.3 19.4 11.9 21.2 11.7 21.5 13.2 21.1 14.8 21.3 16.4",
  strokeWidth: 2.25,
} as const;

/** The default Isothrum mark, themed by `--primary`/`--primary-foreground`. */
export function DefaultBrandMark({ className }: BrandMarkProps) {
  return (
    <svg viewBox={logoMark.viewBox} aria-hidden className={cn("size-7 shrink-0", className)}>
      <rect width="32" height="32" rx={logoMark.radius} className="fill-primary" />
      <path d={logoMark.fill} strokeWidth={1} strokeLinejoin="round" className="fill-primary-foreground stroke-primary-foreground" />
      <path d={logoMark.stroke} fill="none" strokeWidth={logoMark.strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="stroke-primary-foreground" />
    </svg>
  );
}

const BrandMarkContext = createContext<BrandMark>(DefaultBrandMark);

/** Lets a host replace the editor's product mark. Omit it to keep the default Isothrum mark. */
export function BrandMarkProvider({ mark, children }: { mark: BrandMark; children: ReactNode }) {
  return <BrandMarkContext.Provider value={mark}>{children}</BrandMarkContext.Provider>;
}

/** The product mark in use (the injected one, or the default). */
export function useBrandMark(): BrandMark {
  return useContext(BrandMarkContext);
}
