import { toast } from "sonner";

const REDIRECT_KEY = "cs_redirect_after_auth";
const MSG_KEY = "cs_auth_message";

export function requireAuthOrRedirect(
  user: unknown,
  navigate: (opts: { to: string }) => void,
  opts?: { redirectTo?: string; message?: string },
): boolean {
  if (user) return true;
  const redirectTo =
    opts?.redirectTo ??
    (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/browse");
  const message = opts?.message ?? "Create a free account to start buying or selling.";
  if (typeof window !== "undefined") {
    sessionStorage.setItem(REDIRECT_KEY, redirectTo);
    sessionStorage.setItem(MSG_KEY, message);
  }
  toast.message(message);
  navigate({ to: "/signup" });
  return false;
}

export function consumeAuthRedirect(): string | null {
  if (typeof window === "undefined") return null;
  const to = sessionStorage.getItem(REDIRECT_KEY);
  sessionStorage.removeItem(REDIRECT_KEY);
  sessionStorage.removeItem(MSG_KEY);
  return to;
}

export function peekAuthMessage(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(MSG_KEY);
}