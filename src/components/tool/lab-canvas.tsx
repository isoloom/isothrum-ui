"use client";

import { useRef } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { editorText } from "@/lib/tool/text";
import { AuthClientProvider, type AuthClient } from "@/lib/auth";
import { BrandMarkProvider, type BrandMark } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { RunningLabMenus } from "./context-menus";
import { SessionWatch } from "./editor-menu";
import { FlowCanvas } from "./flow-canvas";
import { useEditor, type EditorModel } from "./hooks/use-editor";
import { Overlays } from "./overlays";
import { EditorTextContext } from "./text";
import { Toolbar } from "./toolbar";
import { TopLeft, TopRight } from "./top-bars";
import { EditorWindows } from "./windows/editor-windows";

/** The hidden file input a GNS3 project is picked with (the menu opens it). */
function Gns3Input({ e, input }: { e: EditorModel; input: React.RefObject<HTMLInputElement | null> }) {
  return (
    <input
      ref={input}
      type="file"
      accept=".gns3,application/json"
      hidden
      aria-label={e.t.menu.gns3File}
      onChange={(ev) => {
        const file = ev.target.files?.[0];
        if (file) void e.actions.importGns3(file);
        ev.target.value = "";
      }}
    />
  );
}

function Editor({ lang, accounts }: { lang: string; accounts: boolean }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gns3Input = useRef<HTMLInputElement>(null);
  const e = useEditor(lang, accounts, canvasRef);
  const { tools } = e;
  return (
    <div
      ref={canvasRef}
      className={cn(
        "fixed inset-0 bg-background",
        e.tool && "[&_.react-flow__pane]:!cursor-crosshair",
        tools.mode === "hand" && "[&_.react-flow__pane]:!cursor-grab [&_.react-flow__pane.dragging]:!cursor-grabbing",
      )}
      onDragOver={(ev) => {
        ev.preventDefault();
      }}
      onDrop={e.placement.onDrop}
      data-design={e.design.design}
    >
      <Gns3Input e={e} input={gns3Input} />
      {accounts && <SessionWatch onChange={e.projects.setSignedInNow} />}
      <FlowCanvas e={e} />
      <TopLeft e={e} onImportGns3={() => gns3Input.current?.click()} />
      <Toolbar e={e} />
      <TopRight e={e} />
      <Overlays e={e} />
      <RunningLabMenus e={e} />
      <EditorWindows e={e} />
    </div>
  );
}

/** The props of the lab editor. */
export interface LabCanvasProps {
  /** The editor's language (one of the editor's locales); anything else falls back to English. */
  lang: string;
  /**
   * Whether the accounts UI (sign in, save to projects) is shown. When `true`, pass `auth`.
   * Defaults to `false`, for hosts without accounts (the desktop app, a standalone embed).
   */
  accounts?: boolean;
  /** The host's auth client, required when `accounts` is `true`; ignored otherwise. */
  auth?: AuthClient | null;
  /** A product mark for the empty canvas; defaults to the Isothrum mark. */
  brandMark?: BrandMark;
}

/** The lab editor: the editor's words in the page's language, for every part of it (windows, canvas, export). */
export function LabCanvas({ lang, accounts = false, auth = null, brandMark }: LabCanvasProps) {
  const text = editorText(lang);
  const inner = (
    <EditorTextContext.Provider value={text}>
      <ReactFlowProvider>
        <Editor lang={lang} accounts={accounts} />
      </ReactFlowProvider>
    </EditorTextContext.Provider>
  );
  const withAuth = <AuthClientProvider client={auth}>{inner}</AuthClientProvider>;
  return brandMark ? <BrandMarkProvider mark={brandMark}>{withAuth}</BrandMarkProvider> : withAuth;
}
