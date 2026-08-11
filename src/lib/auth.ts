import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

function isLovableHost(hostname: string): boolean {
  return (
    hostname.endsWith(".lovable.app") ||
    hostname.endsWith(".lovableproject.com") ||
    hostname.includes("lovable.dev")
  );
}

/**
 * Google sign-in that works on both Lovable Cloud and self-hosted (Vercel).
 * Lovable hosts use the cloud OAuth broker; everywhere else uses Supabase Google OAuth.
 */
export async function signInWithGoogle(
  redirectTo = typeof window !== "undefined" ? window.location.origin : "/",
) {
  if (typeof window !== "undefined" && isLovableHost(window.location.hostname)) {
    return lovable.auth.signInWithOAuth("google", { redirect_uri: redirectTo });
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error) return { error, redirected: false as const };
  return { error: null, redirected: true as const };
}
