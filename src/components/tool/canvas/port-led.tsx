/**
 * Business: a socket's status light, in its VLAN's or network's color (a trunk's stripes), lit
 * when something is assigned to the port; dark when nothing is.
 */
export function PortLed({ color }: { color: string | null }) {
  return (
    <>
      {/* The socket's latch. */}
      <span aria-hidden className="pointer-events-none absolute inset-x-[6px] top-[3px] h-[4px] rounded-t-[1px] border border-b-0 border-white/12" />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-[3px] left-1/2 h-[3px] w-3 -translate-x-1/2 rounded-full"
        style={color ? { background: color, boxShadow: color.startsWith("repeating") ? undefined : `0 0 5px ${color}` } : { background: "#2a3341" }}
      />
    </>
  );
}

/** The look of a port's square: business sockets are dark and recessed. */
export const PORT_BOX = "rounded-[3px] border border-foreground/40";
export const BUSINESS_SOCKET = "rounded-[2px] border-black/80 shadow-[inset_0_1px_3px_rgb(0_0_0/0.7)]";
