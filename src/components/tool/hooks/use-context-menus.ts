import { useState } from "react";

/** A right-click on a machine (desktop): its console, its screen, starting or stopping it. */
export interface MachineMenuAt {
  x: number;
  y: number;
  machine: string;
}

/**
 * A right-click on a cable or a LAN (desktop): capture its traffic, suspend or resume it.
 * `machines`: a cable's ends that are machines (their ports); none for a whole LAN.
 */
export interface LinkMenuAt {
  x: number;
  y: number;
  network: string;
  title: string;
  machines?: string[];
}

/** The right-click menus open on the canvas (desktop app only). */
export function useContextMenus() {
  const [machineMenu, setMachineMenu] = useState<MachineMenuAt | null>(null);
  const [linkMenu, setLinkMenu] = useState<LinkMenuAt | null>(null);
  return {
    machineMenu,
    setMachineMenu,
    linkMenu,
    setLinkMenu,
    closeMenus: () => {
      setMachineMenu(null);
      setLinkMenu(null);
    },
  };
}

