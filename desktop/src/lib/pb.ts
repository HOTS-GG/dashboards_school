import PocketBase, { AsyncAuthStore } from "pocketbase";
import { invoke } from "@tauri-apps/api/core";

export type User = { id: string; name: string; email: string; role: "member" | "admin" | "" };

let client: PocketBase | null = null;

/** Creates the shared client; the session lives in Windows Credential Manager (see src-tauri/src/auth.rs). */
export async function initClient(): Promise<PocketBase> {
  if (client) return client;
  const [url, saved] = await Promise.all([
    invoke<string>("server_url"),
    invoke<string | null>("session_load"),
  ]);
  const store = new AsyncAuthStore({
    save: (s) => invoke("session_save", { value: s }),
    clear: () => invoke("session_clear"),
    initial: saved ?? undefined,
  });
  client = new PocketBase(url, store);
  client.autoCancellation(false);
  return client;
}

export function pb(): PocketBase {
  if (!client) throw new Error("PocketBase client not initialised");
  return client;
}

export function currentUser(): User | null {
  return (pb().authStore.record as User | null) ?? null;
}

type OAuthCallback = { code: string; state: string; redirect_url: string };

/** Google sign-in through the system browser and a loopback redirect. */
export async function loginWithGoogle(): Promise<void> {
  const users = pb().collection("users");
  const methods = await users.listAuthMethods();
  const google = methods.oauth2.providers.find((p) => p.name === "google");
  if (!google) throw new Error("서버에 Google 로그인이 설정되어 있지 않습니다.");
  const cb = await invoke<OAuthCallback>("google_login", { authUrl: google.authURL });
  if (cb.state !== google.state) throw new Error("로그인 응답이 올바르지 않습니다. 다시 시도하세요.");
  await users.authWithOAuth2Code("google", cb.code, google.codeVerifier, cb.redirect_url);
}

/**
 * Renews a saved session. Returns false only when the server rejected it
 * (expired or account removed); network errors keep the session for offline use.
 */
export async function refreshSession(): Promise<boolean> {
  try {
    await pb().collection("users").authRefresh();
    return true;
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403 || err?.status === 404) {
      pb().authStore.clear();
      return false;
    }
    return true;
  }
}

export function logout() {
  pb().realtime.unsubscribe();
  pb().authStore.clear();
}
