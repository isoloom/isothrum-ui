/**
 * The editor as the desktop app bundles it (isoloom/isothrum#26): the same component as on
 * isothrum.com, without the site around it, so the app works offline. Accounts and saved projects
 * need the site: they stay off here. Built by scripts/build-desktop-editor.mjs.
 */
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/shantell-sans";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { LabCanvas } from "@/components/tool/lab-canvas";
import { LOCALES } from "@/lib/i18n";

// The page's language: the system's when the editor speaks it, else English.
const wanted = navigator.language.slice(0, 2).toLowerCase();
const lang = (LOCALES as readonly string[]).includes(wanted) ? wanted : "en";
document.documentElement.lang = lang;

const root = document.getElementById("root");
if (!root) throw new Error("The editor's page has no #root element.");

createRoot(root).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
    <LabCanvas lang={lang} accounts={false} />
  </ThemeProvider>,
);
