"use client";

import { LayoutTemplate, X } from "lucide-react";
import { useBrandMark } from "@/lib/brand";
import { Button, buttonVariants } from "@/components/ui/button";
import type { EditorModel } from "./hooks/use-editor";
import { useText } from "./text";

/** Handwritten hints, pointing at the menu and the toolbar. */
function WelcomeHints() {
  const t = useText().welcome;
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute top-14 left-6 z-0 hidden items-start gap-1 font-heading text-sm text-muted-foreground md:flex">
        <svg viewBox="0 0 40 40" className="size-9 -scale-x-100" fill="none">
          <path d="M34 36C30 22 22 12 8 6m0 0 2 8M8 6l8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="mt-6">{t.menuHint}</span>
      </div>
      <div aria-hidden className="pointer-events-none absolute top-24 left-1/2 z-0 hidden -translate-x-[calc(100%+40px)] items-start gap-1 font-heading text-sm text-muted-foreground md:flex">
        <span className="mt-6">{t.toolbarHint}</span>
        <svg viewBox="0 0 40 40" className="size-9" fill="none">
          <path d="M6 36C12 24 22 14 34 8m0 0-8 0m8 0-2 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
    </>
  );
}

/** The empty canvas: who we are, where to start, and handwritten pointers to the controls. */
function Welcome({ onExample, lang }: { onExample: () => void; lang: string }) {
  const t = useText().welcome;
  const LogoMark = useBrandMark();
  return (
    <>
      <WelcomeHints />
      <div className="pointer-events-none absolute inset-0 z-0 grid place-items-center p-6">
        {/* Only the buttons take clicks: a drop or a click elsewhere goes to the canvas below. */}
        <div className="flex max-w-md flex-col items-center text-center">
          <LogoMark className="size-14" />
          <p className="mt-4 font-heading text-4xl font-semibold lowercase">isothrum</p>
          <p className="mt-3 text-muted-foreground text-pretty">{t.pitch}</p>
          <div className="pointer-events-auto mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={onExample}>
              <LayoutTemplate data-icon="inline-start" /> {t.example}
            </Button>
            <a href={`/${lang}/about`} className={buttonVariants({ variant: "outline" })}>
              {t.how}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

/** Desktop app: a newer release is out; restarting installs it. */
function UpdateBanner({ e, version }: { e: EditorModel; version: string }) {
  const t = e.t.update;
  const { invoke, updating, setUpdating, setUpdate } = e.desk.state;
  async function install() {
    if (!invoke) return;
    setUpdating(true);
    try {
      await invoke("update_install");
    } catch (err) {
      e.setToast(String(err));
      setUpdating(false);
    }
  }
  return (
    <div role="status" className="absolute right-4 bottom-4 z-30 flex items-center gap-3 rounded-lg border bg-popover px-3 py-2 text-sm shadow-sm">
      <span>{t.available(version)}</span>
      <Button size="sm" disabled={updating} onClick={() => void install()}>
        {updating ? t.installing : t.restart}
      </Button>
      <button type="button" className="text-muted-foreground hover:text-foreground" aria-label={t.later} title={t.later} onClick={() => { setUpdate(null); }}>
        <X className="size-4" />
      </button>
    </div>
  );
}

/** What floats over the canvas's bottom: the welcome, an update, a toast, an engine that didn't load. */
export function Overlays({ e }: { e: EditorModel }) {
  const { update } = e.desk.state;
  return (
    <>
      {/* The empty canvas welcomes, as Excalidraw does. Hidden while a device is picked, so the whole canvas is free to click. */}
      {e.empty && !e.tools.activeTool && <Welcome onExample={() => { e.actions.loadExample(); }} lang={e.lang} />}
      {update && <UpdateBanner e={e} version={update} />}
      {e.toast && (
        <p role="status" className="absolute bottom-4 left-1/2 z-30 w-max max-w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-sm shadow-sm">
          {e.toast}
        </p>
      )}
      {e.engineError && (
        <p role="alert" className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-sm text-destructive shadow-sm">
          {e.t.engineDidntLoad(e.engineError)}
        </p>
      )}
    </>
  );
}
