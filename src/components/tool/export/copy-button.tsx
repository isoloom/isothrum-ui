"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useText } from "../text";

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const t = useText().exportPanel;
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="xs"
      variant="ghost"
      onClick={() => {
        // There is no clipboard outside a secure context (plain http): then nothing happens.
        const clipboard = navigator.clipboard as Clipboard | undefined;
        void clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => {
            setCopied(false);
          }, 1500);
        });
      }}
    >
      {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
      {copied ? t.copied : (label ?? t.copy)}
    </Button>
  );
}

/** A command to copy, under its label. */
export function Command({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border bg-surface">
      <div className="flex items-center justify-between border-b px-3 py-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <CopyButton text={text} />
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs">
        <code>{text}</code>
      </pre>
    </div>
  );
}
