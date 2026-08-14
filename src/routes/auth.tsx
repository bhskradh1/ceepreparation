import { noIndexTags } from "@/lib/seo";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { signInWithGoogle } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CEE Prep Nepal" },
      {
        name: "description",
        content: "Sign in with Google to take CEE mock tests and join the weekly leaderboard.",
      },
      { property: "og:title", content: "Sign in — CEE Prep Nepal" },
      {
        property: "og:description",
        content: "Google sign-in for CEE Nepal mock tests and weekly rankings.",
      },
      ...noIndexTags().meta,
    ],
  }),
  component: AuthPage,
});

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        opacity=".9"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        opacity=".75"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        opacity=".6"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        opacity=".8"
      />
    </svg>
  );
}

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/", replace: true });
  }, [loading, user, navigate]);

  const signIn = async () => {
    setBusy(true);
    const result = await signInWithGoogle(window.location.origin);
    if (result.error) {
      setBusy(false);
      toast.error(result.error.message || "Could not sign in with Google. Please try again.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/", replace: true });
  };

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-16">
      <div className="surface-hero pointer-events-none absolute inset-0 opacity-95" />
      <div className="rise relative w-full max-w-md surface-panel p-8 text-foreground shadow-2xl">
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_16px_40px_-18px_var(--color-primary)]">
            <GraduationCap className="size-7" />
          </span>
          <p className="mt-6 font-display text-3xl font-semibold tracking-tight">
            CEE<span className="text-primary">Prep</span>
          </p>
          <h1 className="mt-3 text-lg font-medium text-muted-foreground">
            Sign in to start practising
          </h1>
        </div>

        <Button
          className="press mt-8 w-full gap-2"
          size="lg"
          disabled={busy || loading}
          onClick={() => void signIn()}
        >
          <GoogleGlyph className="size-5" />
          {busy ? "Opening Google…" : "Continue with Google"}
        </Button>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
          Scores stay private. Only your name, photo and weekly average appear on the leaderboard.
        </p>
      </div>
    </main>
  );
}
