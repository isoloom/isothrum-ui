"use client";

import type { CSSProperties } from "react";
import { Container, Laptop, Monitor, Router, Server, Shield, type LucideIcon } from "lucide-react";
import type { SimpleIcon } from "simple-icons";
import { dockerLogo, isDark, logoFor } from "@/lib/tool/logos";
import type { IconId, MachineData } from "@/lib/tool/model";
import { cn } from "@/lib/utils";

/** By icon id; a node from a link or an old draft may name one we don't have: a container then. */
const ICONS: Partial<Record<string, LucideIcon>> = {
  container: Container,
  server: Server,
  router: Router,
  shield: Shield,
  monitor: Monitor,
  laptop: Laptop,
};

/** What a machine is for, as people say it: its role in the lab. */
export function roleOf(m: Pick<MachineData, "kind" | "icon" | "image">): "router" | "firewall" | "workstation" | "server" | "desktop" | "host" {
  if (m.icon === "router") return "router";
  if (m.icon === "shield") return "firewall";
  if (m.icon === "laptop") return "workstation";
  if (m.icon === "server") return "server";
  if (m.icon === "monitor") return m.kind === "vm" ? "host" : "desktop";
  return "host";
}

/** Business: a device's accent, by what it is (the pastels' strong counterparts). */
export function accentFor(m: Pick<MachineData, "kind" | "icon">): string {
  if (m.icon === "router") return "#d97706";
  if (m.icon === "shield") return "#dc2626";
  if (m.icon === "laptop") return "#7c3aed";
  return m.kind === "vm" ? "#0d9488" : "#2563eb";
}

/** Each kind of device has its pastel, as on a whiteboard. */
export function pastelFor(m: Pick<MachineData, "kind" | "icon">): string {
  if (m.icon === "router") return "var(--pastel-yellow)";
  if (m.icon === "shield") return "var(--pastel-red)";
  if (m.icon === "laptop") return "var(--pastel-violet)";
  return m.kind === "vm" ? "var(--pastel-green)" : "var(--pastel-blue)";
}

/** Roles whose icon says more than the OS logo would: the logo becomes a small badge. */
const ROLE_ICONS: IconId[] = ["router", "laptop", "shield"];

/**
 * A brand logo in its own color. On the dark theme the color is lifted toward white, so deep
 * brand colors (Alpine, Kali, PostgreSQL) stay readable while keeping their hue.
 */
function BrandLogo({ icon, className }: { icon: SimpleIcon; className?: string }) {
  const dark = isDark(icon.hex);
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={icon.title}
      className={cn(className, !dark && "fill-[var(--logo)] dark:fill-[color-mix(in_oklab,var(--logo)_60%,white)]")}
      style={{ "--logo": `#${icon.hex}` } as CSSProperties}
    >
      <path d={icon.path} fill={dark ? "currentColor" : undefined} />
    </svg>
  );
}

/** The tile's look: tinted with the accent (business), the pastel (a small one), or plain. */
function tileStyle(data: Pick<MachineData, "kind" | "icon">, size: "sm" | "md", accent: string | undefined): CSSProperties | undefined {
  if (accent) return { backgroundColor: `color-mix(in oklab, ${accent} 11%, var(--card))`, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 22%, transparent)` };
  return size === "sm" ? { backgroundColor: pastelFor(data) } : undefined;
}

/**
 * A device's picture: the logo of what it runs (its OS or image) when we know one, otherwise
 * a generic icon. Routers and workstations keep their role icon, with the OS logo as a badge.
 */
export function DeviceIcon({
  data,
  size = "md",
  accent,
}: {
  data: Pick<MachineData, "kind" | "image" | "os" | "icon">;
  size?: "sm" | "md";
  /** Business: the tile takes this tint, its glyph this color. */
  accent?: string;
}) {
  const logo = logoFor(data) ?? (data.kind === "container" ? dockerLogo : null);
  const role = ROLE_ICONS.includes(data.icon);
  const Icon = ICONS[data.icon] ?? Container;
  const glyph = size === "md" ? "size-6" : "size-4";
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center bg-background text-foreground ring-1 ring-foreground/10", size === "md" ? "size-11 rounded-lg" : "size-8 rounded-md")}
      style={tileStyle(data, size, accent)}
    >
      {logo && !role ? <BrandLogo icon={logo} className={cn(glyph, "text-foreground")} /> : <Icon className={glyph} style={accent ? { color: accent } : undefined} aria-hidden />}
      {logo && role && (
        <span className="absolute -right-1.5 -bottom-1.5 grid size-5 place-items-center rounded-full border bg-card shadow-sm">
          <BrandLogo icon={logo} className="size-3 text-foreground" />
        </span>
      )}
    </span>
  );
}
