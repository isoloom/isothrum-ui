import { createContext } from "react";
import type { LiveView } from "@/lib/tool/live";
import type { Side } from "@/lib/tool/model";
import type { Addresses, RouterPorts } from "@/lib/tool/router-ports";

/** What the canvas's nodes and cables read from the editor, without props through React Flow. */

/** Each machine's addresses (from the engine), by machine name: [network, IPv4][]. */
export const AddressesContext = createContext<Addresses>({});

/** Each real router's interfaces, by node id. */
export const PortsContext = createContext<Partial<Record<string, RouterPorts>>>({});

/** The running lab as the desktop app reads it (null: not running, or in a browser). */
export const LiveContext = createContext<LiveView | null>(null);

/** The LAN border each appliance sits on, by node id (so its port can face out), and the side each switch or router port faces, by `<id>:<port>`. */
export const SidesContext = createContext<Partial<Record<string, Side>>>({});
