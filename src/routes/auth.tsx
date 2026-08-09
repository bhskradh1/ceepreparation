import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CEE Prep Nepal" },
      { name: "description", content: "Sign in with Google to take CEE mock tests and join the weekly leaderboard." },
      { property: "og:title", content: "Sign in — CEE Prep Nepal" },
      { property: "og:description", content: "Google sign-in for CEE Nepal mock tests and weekly rankings." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/", replace: true });
  }, [loading, user, navigate]);

  const signIn = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Could not sign in with Google. Please try again.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/", replace: true });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="card-elevated w-full max-w-md">
        <CardHeader className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-6" />
          </span>
          <CardTitle className="mt-4 text-2xl">Welcome to CEE Prep</CardTitle>
          <CardDescription>Sign in with your Google account to start practising.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" size="lg" disabled={busy} onClick={() => void signIn()}>
            {busy ? "Opening Google…" : "Continue with Google"}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Your scores are private. Only your name, photo and weekly average appear on the leaderboard.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
