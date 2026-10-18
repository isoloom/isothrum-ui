import { useEffect, useState } from "react";

/** A message at the bottom of the canvas, for a few seconds (longer when it is long). */
export function useToast(): [string | null, (message: string | null) => void] {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, Math.max(4000, toast.length * 60));
    return () => {
      clearTimeout(timer);
    };
  }, [toast]);
  return [toast, setToast];
}
