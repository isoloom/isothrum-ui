"use client";

import { APPLIANCES, idleByDefault, type MachineData } from "@/lib/tool/model";
import { OS_CHOICES } from "@/lib/tool/os";
import { cn } from "@/lib/utils";
import { useText } from "../text";
import { area, field } from "./fields";

type Change = (patch: Partial<MachineData>) => void;

/** A Cisco OS in its container: which one, what it needs, and its own IOS configuration. */
function ApplianceFields({ m, onChange }: { m: MachineData; onChange: Change }) {
  const t = useText().inspector;
  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">{t.ciscoOs}</span>
        <select
          className={field}
          value={m.appliance}
          onChange={(e) => {
            const a = APPLIANCES.find((x) => x.id === e.target.value);
            if (a) onChange({ appliance: a.id, image: a.image });
          }}
        >
          {APPLIANCES.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        {APPLIANCES.find((a) => a.id === m.appliance)?.kvm && <span className="text-xs text-muted-foreground">{t.needsKvm}</span>}
        {m.appliance === "cisco-dynamips" && <span className="text-xs text-muted-foreground">{t.dynamipsFirmware(m.name)}</span>}
      </label>
      <p className="text-xs text-muted-foreground">
        {t.applianceNote}{" "}
        <a className="underline" href="https://github.com/srl-labs/vrnetlab/tree/master/cisco/iol" target="_blank" rel="noreferrer">
          vrnetlab
        </a>
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">{t.iosConfig}</span>
        <textarea
          className={`min-h-28 ${area}`}
          placeholder={"router ospf 1\n network 10.0.0.0 0.255.255.255 area 0"}
          value={m.config ?? ""}
          onChange={(e) => {
            onChange({ config: e.target.value });
          }}
          spellCheck={false}
        />
        <span className="text-xs text-muted-foreground">{t.iosConfigHint}</span>
      </label>
    </>
  );
}

/** A container: its image (none to type for Dynamips), and a Cisco OS's fields or whether it idles. */
export function ContainerFields({ m, onChange }: { m: MachineData; onChange: Change }) {
  const t = useText().inspector;
  return (
    <>
      {m.appliance !== "cisco-dynamips" && (
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">{t.image}</span>
          <input className={cn(field, "font-mono")} value={m.image} onChange={(e) => { onChange({ image: e.target.value }); }} />
        </label>
      )}
      {m.appliance ? (
        <ApplianceFields m={m} onChange={onChange} />
      ) : (
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-0.5" checked={m.idle ?? idleByDefault(m.image)} onChange={(e) => { onChange({ idle: e.target.checked }); }} />
          <span>
            {t.keepRunning}
            <span className="block text-xs text-muted-foreground">{t.keepRunningHint}</span>
          </span>
        </label>
      )}
    </>
  );
}

/** A VM: its OS and its provisioning steps. */
export function VmFields({ m, onChange }: { m: MachineData; onChange: Change }) {
  const t = useText().inspector;
  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">{t.os}</span>
        <select className={field} value={m.os} onChange={(e) => { onChange({ os: e.target.value }); }}>
          {OS_CHOICES.map((os) => (
            <option key={os} value={os}>
              {os}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">{t.provision}</span>
        <textarea
          className={`min-h-16 ${area}`}
          placeholder={m.os.startsWith("windows") ? `provision/${m.name}.ps1` : `provision/${m.name}.sh`}
          value={m.provision}
          onChange={(e) => { onChange({ provision: e.target.value }); }}
        />
      </label>
    </>
  );
}

/** A machine's services and whether the user lands on it (not an automatic router, nor an appliance). */
export function ServiceFields({ m, onChange }: { m: MachineData; onChange: Change }) {
  const t = useText().inspector;
  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">{t.ports}</span>
        <input className={field} placeholder="80, 443/https, 53/udp" value={m.ports} onChange={(e) => { onChange({ ports: e.target.value }); }} />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={m.access} onChange={(e) => { onChange({ access: e.target.checked }); }} />
        {t.access}
      </label>
    </>
  );
}
