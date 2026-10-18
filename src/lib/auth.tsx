"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The accounts surface the editor uses, injected by the host (the website wires Better Auth; the
 * desktop app and the standalone editor leave it out and run with `accounts={false}`). Keeping it
 * an injected port is what lets this package stay free of any auth implementation.
 */
export interface AuthSessionUser {
  name?: string | null;
  email: string;
}

export interface AuthSession {
  user: AuthSessionUser;
}

export interface AuthClient {
  /** React hook: the current session (or `null`), and whether it is still loading. */
  useSession: () => { data: AuthSession | null; isPending: boolean };
  signOut: () => Promise<unknown> | void;
  signIn: {
    oauth2: (options: { providerId: string; callbackURL: string; errorCallbackURL: string }) => Promise<unknown> | void;
  };
}

const AuthClientContext = createContext<AuthClient | null>(null);

/** Provides the host's auth client to the editor. Omit it (or pass `null`) to run without accounts. */
export function AuthClientProvider({ client, children }: { client: AuthClient | null; children: ReactNode }) {
  return <AuthClientContext.Provider value={client}>{children}</AuthClientContext.Provider>;
}

/**
 * The injected auth client. It is present only where accounts are enabled; the editor reads it
 * solely inside `accounts`-gated UI, so a missing client there is a wiring error, not a normal path.
 */
export function useAuthClient(): AuthClient {
  const client = useContext(AuthClientContext);
  if (!client) throw new Error("Accounts are enabled but no AuthClient was provided to the editor.");
  return client;
}
