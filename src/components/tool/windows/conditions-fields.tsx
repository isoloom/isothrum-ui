"use client";

import { withCondition } from "@/lib/tool/conditions";
import type { LinkConditions } from "@/lib/tool/model";
import { cn } from "@/lib/utils";
import { useText } from "../text";
import { field } from "./fields";

/** How a cable or a LAN behaves: four optional numbers (empty: none). */
export function ConditionsFields({ value, onChange }: { value: LinkConditions | undefined; onChange: (tc: LinkConditions | undefined) => void }) {
  const t = useText().windows.conditions;
  const fields: [keyof LinkConditions, string, number][] = [
    ["delay", t.delay, 1],
    ["jitter", t.jitter, 1],
    ["loss", t.loss, 0.1],
    ["rate", t.rate, 1],
  ];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-muted-foreground">{t.title}</legend>
      <div className="grid grid-cols-2 gap-2">
        {fields.map(([key, label, step]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <input
              type="number"
              min={0}
              step={step}
              inputMode="decimal"
              className={cn(field, "font-mono")}
              value={value?.[key] ?? ""}
              disabled={key === "jitter" && !value?.delay}
              onChange={(e) => {
                onChange(withCondition(value, key, e.target.value));
              }}
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t.hint}</p>
    </fieldset>
  );
}
