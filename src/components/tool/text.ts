import { createContext, useContext } from "react";
import { defaultText, type EditorText } from "@/lib/tool/text";

/** The editor's words, set once by the editor from the page's language; English outside it. */
export const EditorTextContext = createContext<EditorText>(defaultText);

export function useText(): EditorText {
  return useContext(EditorTextContext);
}
