import { hasLocale, type Locale } from "@/lib/i18n";
import { de } from "./de";
import { en, type EditorText } from "./en";
import { es } from "./es";
import { fr } from "./fr";

export type { EditorText };

/**
 * The editor's own words in each language. They live here, typed, rather than in the site's
 * JSON dictionaries: the editor only renders in the browser, and many of its strings take
 * values (names, counts), which functions say better than templates.
 */
const TEXTS: Record<Locale, EditorText> = { en, fr, es, de };

export function editorText(lang: string): EditorText {
  return hasLocale(lang) ? TEXTS[lang] : en;
}

/** English: the source the other languages follow. */
export const defaultText = en;
