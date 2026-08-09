import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, FileText, Layers } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CEE_SUBJECTS } from "@/lib/cee";

export const Route = createFileRoute("/tests")({
  head: () => ({
    meta: [
      { title: "CEE Mock Tests — Full Paper & Subject Practice" },
      {
        name: "description",
        content: "Choose a full 200-question CEE mock test or a subject-wise practice set in Physics, Chemistry, Botany, Zoology or MAT.",
      },
      { property: "og:title", content: "CEE Mock Tests — Full Paper & Subject Practice" },
      { property: "og:description", content: "Timed CEE Nepal mock tests and subject-wise practice sets." },
    ],
  }),
  component: TestsPage,
});

type Filter = "all" | "full" | "subject";

function TestsPage() {
  const { user, loading } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [subject, setSubject] = useState<string>("all");

  const { data: tests, isLoading } = useQuery({
    queryKey: ["published-tests"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("id, title, description, test_type, subject, duration_minutes, is_published")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const visible = (tests ?? []).filter(
    (t) => (filter === "all" || t.test_type === filter) && (subject === "all" || t.subject === subject),
  );

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold">Mock tests</h1>
        <p className="mt-1 text-muted-foreground">Full CEE papers and focused subject drills.</p>

        {!user && !loading ? (
          <Card className="card-elevated mt-8">
            <CardHeader>
              <CardTitle>Sign in to take a test</CardTitle>
              <CardDescription>Your attempts and leaderboard rank are tied to your Google account.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/auth">Continue with Google</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
              {(["all", "full", "subject"] as const).map((f) => (
                <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                  {f === "all" ? "All" : f === "full" ? "Full mock" : "Subject-wise"}
                </Button>
              ))}
              <span className="mx-2 hidden w-px bg-border sm:block" />
              <Button size="sm" variant={subject === "all" ? "secondary" : "ghost"} onClick={() => setSubject("all")}>
                All subjects
              </Button>
              {CEE_SUBJECTS.map((s) => (
                <Button key={s} size="sm" variant={subject === s ? "secondary" : "ghost"} onClick={() => setSubject(s)}>
                  {s}
                </Button>
              ))}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {isLoading && <p className="text-muted-foreground">Loading tests…</p>}
              {!isLoading && visible.length === 0 && (
                <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground md:col-span-2">
                  No published tests match this filter yet.
                </p>
              )}
              {visible.map((t) => (
                <Card key={t.id} className="card-elevated">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-lg">{t.title}</CardTitle>
                      <Badge variant={t.test_type === "full" ? "default" : "secondary"}>
                        {t.test_type === "full" ? "Full mock" : t.subject ?? "Subject"}
                      </Badge>
                    </div>
                    <CardDescription>{t.description ?? "CEE format practice paper."}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-4" /> {t.duration_minutes} min
                      </span>
                      <span className="flex items-center gap-1.5">
                        {t.test_type === "full" ? <Layers className="size-4" /> : <FileText className="size-4" />}
                        {t.test_type === "full" ? "All subjects" : t.subject}
                      </span>
                    </div>
                    <Button asChild size="sm">
                      <Link to="/test/$testId" params={{ testId: t.id }}>
                        Start
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
