"use client";

import { useEffect, type ReactNode } from "react";
import { Monitor, Play, Plug, Radio, RotateCw, Square, SquareTerminal, Unplug, type LucideIcon } from "lucide-react";
import type { EditorModel } from "./hooks/use-editor";
import type { LinkMenuAt, MachineMenuAt } from "./hooks/use-context-menus";
import type { LinkAction, MachineAction } from "./hooks/use-machine-actions";
import { useText } from "./text";

/** A menu at the pointer (a right-click): Escape or a click elsewhere closes it. */
function ContextMenu({ at, title, onClose, children }: { at: { x: number; y: number }; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        role="menu"
        aria-label={title}
        style={{ left: Math.min(at.x, window.innerWidth - 248), top: Math.min(at.y, window.innerHeight - 260) }}
        className="fixed z-50 w-60 rounded-lg border bg-popover p-1 text-popover-foreground shadow-[0_8px_30px_-8px_rgb(0_0_0/0.25)]"
        onClick={onClose}
      >
        <p className="truncate px-2 pt-1 pb-1.5 font-mono text-xs text-muted-foreground">{title}</p>
        {children}
      </div>
    </>
  );
}

function MenuItem({ icon: Icon, label, enabled = true, onClick }: { icon: LucideIcon; label: string; enabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={!enabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon className="size-4 text-muted-foreground" aria-hidden /> {label}
    </button>
  );
}

const Divider = () => <div className="my-1 h-px bg-border" />;

/** Desktop only: a machine's menu, on a right-click, as in GNS3. */
function MachineMenu({ at, running, state, onClose, onConsole, onDisplay, onAction }: { at: MachineMenuAt; running: boolean; state: string | undefined; onClose: () => void; onConsole: () => void; onDisplay: () => void; onAction: (action: MachineAction) => void }) {
  const t = useText().machineRun;
  const up = running && state === "running";
  return (
    <ContextMenu at={at} title={at.machine} onClose={onClose}>
      <MenuItem icon={SquareTerminal} label={t.console} enabled={up} onClick={onConsole} />
      <MenuItem icon={Monitor} label={t.display} enabled={up} onClick={onDisplay} />
      <Divider />
      {up ? (
        <>
          <MenuItem icon={RotateCw} label={t.restart} onClick={() => { onAction("restart"); }} />
          <MenuItem icon={Square} label={t.stop} onClick={() => { onAction("stop"); }} />
        </>
      ) : (
        <MenuItem icon={Play} label={t.start} enabled={running && !!state} onClick={() => { onAction("start"); }} />
      )}
      {!running && <p className="px-2 pt-1 pb-1 text-xs text-muted-foreground">{t.runFirst}</p>}
    </ContextMenu>
  );
}

/**
 * Desktop only: a cable's or a LAN's menu, on a right-click, as in GNS3: capture its traffic,
 * suspend or resume it (a cable's ends, or every link of a LAN).
 */
function LinkMenu({ at, running, capturing, suspended, onClose, onCapture, onLink }: { at: LinkMenuAt; running: boolean; capturing: boolean; suspended: boolean; onClose: () => void; onCapture: () => void; onLink: (action: LinkAction) => void }) {
  const t = useText();
  const ends = at.machines;
  const all = !ends;
  return (
    <ContextMenu at={at} title={at.title} onClose={onClose}>
      {capturing ? <MenuItem icon={Square} label={t.capture.stop} onClick={onCapture} /> : <MenuItem icon={Radio} label={t.capture.start} enabled={running} onClick={onCapture} />}
      {(!ends || ends.length > 0) && (
        <>
          <Divider />
          {suspended ? (
            <MenuItem icon={Plug} label={all ? t.link.resumeAll : t.link.resume} enabled={running} onClick={() => { onLink("resume"); }} />
          ) : (
            <MenuItem icon={Unplug} label={all ? t.link.suspendAll : t.link.suspend} enabled={running} onClick={() => { onLink("suspend"); }} />
          )}
        </>
      )}
      {!running && <p className="px-2 pt-1 pb-1 text-xs text-muted-foreground">{t.capture.runFirst}</p>}
    </ContextMenu>
  );
}

/** The right-click menus of the running lab (desktop app only). */
export function RunningLabMenus({ e }: { e: EditorModel }) {
  const { invoke, desk } = e;
  const { machineMenu, linkMenu, setMachineMenu, setLinkMenu } = desk.menus;
  const running = desk.state.run === "running";
  const { captures, capture, stopCapture } = desk.captures;
  if (!invoke) return null;
  return (
    <>
      {machineMenu && (
        <MachineMenu
          at={machineMenu}
          running={running}
          state={desk.live.machineStates[machineMenu.machine]}
          onClose={() => { setMachineMenu(null); }}
          onConsole={() => void desk.actions.machineConsole(machineMenu.machine)}
          onDisplay={() => void desk.actions.machineDisplay(machineMenu.machine)}
          onAction={(action) => void desk.actions.machineAct(machineMenu.machine, action)}
        />
      )}
      {linkMenu && (
        <LinkMenu
          at={linkMenu}
          running={running}
          capturing={linkMenu.network in captures}
          suspended={desk.live.links.some((l) => l.network === linkMenu.network && (!linkMenu.machines || linkMenu.machines.includes(l.machine)))}
          onClose={() => { setLinkMenu(null); }}
          onCapture={() => void (linkMenu.network in captures ? stopCapture(linkMenu.network) : capture(linkMenu.network))}
          onLink={(action) => void desk.actions.linkAct(linkMenu.network, linkMenu.machines, action)}
        />
      )}
    </>
  );
}
