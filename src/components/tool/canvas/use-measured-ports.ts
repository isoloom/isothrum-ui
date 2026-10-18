import { useContext, useEffect } from "react";
import { useUpdateNodeInternals } from "@xyflow/react";
import { SidesContext } from "./contexts";

/**
 * Which way each port of node `id` faces (`<id>:<port>` in the sides), as one key; React Flow
 * caches where handles are, so they are measured again when it changes.
 */
export function usePortSides(id: string) {
  const sides = useContext(SidesContext);
  const facing = Object.keys(sides)
    .filter((k) => k.startsWith(`${id}:`))
    .sort()
    .join(",");
  useRemeasure(id, facing);
  return sides;
}

/** Measures node `id`'s handles again whenever `key` changes. */
export function useRemeasure(id: string, key: string | undefined): void {
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, key, updateNodeInternals]);
}
