"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { Check, CopyPlus, FileUp, FolderOpen, Info, Languages, LayoutTemplate, Link2, LogIn, LogOut, Maximize, Menu, Moon, Newspaper, Palette, Save, Sun, Trash2 } from "lucide-react";
import { useAuthClient } from "@/lib/auth";
import { LOCALES, localeNames } from "@/lib/i18n";
import { DESIGNS, type Design } from "@/lib/tool/model";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useText } from "./text";

/** Signed in: saving to and opening from the user's projects. */
interface ProjectActions {
  onSave: () => void;
  onSaveAs: () => void;
  onOpen: () => void;
}

interface EditorMenuProps {
  lang: string;
  onExample: () => void;
  onVlanExample: () => void;
  onShare: () => void;
  onImportGns3: () => void;
  design: Design;
  onDesign: (d: Design) => void;
  accounts: boolean;
  projects: ProjectActions | null;
  onClear: () => void;
  onFit: () => void;
  canClear: boolean;
}

/** Reports whether someone is signed in (mounted only where accounts exist). */
export function SessionWatch({ onChange }: { onChange: (signedIn: boolean) => void }) {
  const authClient = useAuthClient();
  const { data } = authClient.useSession();
  useEffect(() => {
    onChange(!!data);
  }, [data, onChange]);
  return null;
}

/** Signed in through Cyber Auth, or the way to sign in (the editor works without an account). */
function AccountItems() {
  const t = useText().account;
  const authClient = useAuthClient();
  const { data, isPending } = authClient.useSession();
  if (isPending) return null;
  const back = window.location.pathname;
  return (
    <>
      <DropdownMenuSeparator />
      {data ? (
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal text-muted-foreground">{t.signedInAs(data.user.name || data.user.email)}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => void authClient.signOut()}>
            <LogOut /> {t.signOut}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      ) : (
        <DropdownMenuItem onClick={() => void authClient.signIn.oauth2({ providerId: "cyber-auth", callbackURL: back, errorCallbackURL: back })}>
          <LogIn /> {t.signIn}
        </DropdownMenuItem>
      )}
    </>
  );
}

/** Saving to and opening from the user's projects. */
function ProjectItems({ projects }: { projects: ProjectActions }) {
  const tp = useText().projects;
  return (
    <>
      <DropdownMenuItem onClick={projects.onSave}>
        <Save /> {tp.save}
        <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={projects.onSaveAs}>
        <CopyPlus /> {tp.saveAs}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={projects.onOpen}>
        <FolderOpen /> {tp.openList}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  );
}

/** The light or dark theme, and the canvas's look. */
function LookItems({ design, onDesign }: Pick<EditorMenuProps, "design" | "onDesign">) {
  const t = useText().menu;
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <>
      <DropdownMenuItem onClick={() => { setTheme(dark ? "light" : "dark"); }}>
        {dark ? <Sun /> : <Moon />} {dark ? t.light : t.dark}
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Palette /> {t.style}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {DESIGNS.map((d) => (
            <DropdownMenuItem key={d} onClick={() => { onDesign(d); }}>
              {d === design ? <Check /> : <span className="size-4" />} {t.styles[d]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}

/** The editor in another language, and the site's pages about it. */
function SiteItems({ lang, accounts }: Pick<EditorMenuProps, "lang" | "accounts">) {
  const t = useText().menu;
  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Languages /> {t.language}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {LOCALES.map((l) => (
            <DropdownMenuItem key={l} disabled={l === lang} render={<a href={`/${l}`} />}>
              {localeNames[l]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      {accounts && <AccountItems />}
      <DropdownMenuSeparator />
      <DropdownMenuItem render={<a href={`/${lang}/about`} />}>
        <Info /> {t.about}
      </DropdownMenuItem>
      <DropdownMenuItem render={<a href={`/${lang}/blog`} />}>
        <Newspaper /> {t.blog}
      </DropdownMenuItem>
    </>
  );
}

/** The editor's menu (top left): examples, projects, files, the look, the language. */
export function EditorMenu(p: EditorMenuProps) {
  const t = useText().menu;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={t.menu} className="grid size-9 place-items-center rounded-lg border bg-popover shadow-sm hover:bg-muted">
        <Menu className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={p.onExample}>
          <LayoutTemplate /> {t.example}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={p.onVlanExample}>
          <LayoutTemplate /> {t.vlanExample}
        </DropdownMenuItem>
        {p.projects && <ProjectItems projects={p.projects} />}
        <DropdownMenuItem onClick={p.onImportGns3}>
          <FileUp /> {t.gns3}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={p.onShare} disabled={!p.canClear}>
          <Link2 /> {t.share}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={p.onFit}>
          <Maximize /> {t.fit}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={p.onClear} disabled={!p.canClear}>
          <Trash2 /> {t.clear}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <LookItems design={p.design} onDesign={p.onDesign} />
        <SiteItems lang={p.lang} accounts={p.accounts} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
