import { seoTags } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, FileText, Layers } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CEE_SUBJECTS } from "@/lib/cee";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tests")({
  head: () => ({
    meta: [
      { title: "CEE Mock Tests — Full Paper & Subject Practice" },
      {
        name: "description",
        content:
          "Choose a full 200-question CEE mock test or a subject-wise practice set in Physics, Chemistry, Botany, Zoology or MAT.",
      },
      { property: "og:title", content: "CEE Mock Tests — Full Paper & Subject Practice" },
      {
        property: "og:description",
        content: "Timed CEE Nepal mock tests and subject-wise practice sets.",
      },
      ...seoTags("/tests").meta,
    ],
    links: seoTags("/tests").links,
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
    (t) =>
      (filter === "all" || t.test_type === filter) && (subject === "all" || t.subject === subject),
  );

  return (
    <div className="page-shell">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:py-14">
        <div className="rise max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Practice papers
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Mock tests</h1>
          <p className="mt-2 text-muted-foreground">
            Full CEE papers and focused subject drills — same clock pressure as exam day.
          </p>
        </div>

        {!user && !loading ? (
          <div className="surface-panel mt-10 max-w-xl p-8">
            <h2 className="text-xl font-semibold">Sign in to take a test</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Attempts and leaderboard rank are tied to your Google account.
            </p>
            <Button asChild className="mt-5 press">
              <Link to="/auth">Continue with Google</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {(["all", "full", "subject"] as const).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? "default" : "outline"}
                    className="press"
                    onClick={() => setFilter(f)}
                  >
                    {f === "all" ? "All" : f === "full" ? "Full mock" : "Subject-wise"}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={subject === "all" ? "secondary" : "ghost"}
                  className="press"
                  onClick={() => setSubject("all")}
                >
                  All subjects
                </Button>
                {CEE_SUBJECTS.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={subject === s ? "secondary" : "ghost"}
                    className="press"
                    onClick={() => setSubject(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {isLoading && <p className="text-muted-foreground">Loading tests…</p>}
              {!isLoading && visible.length === 0 && (
                <div className="surface-panel p-10 text-center text-muted-foreground md:col-span-2">
                  No published tests match this filter yet.
                </div>
              )}
              {visible.map((t) => (
                <article
                  key={t.id}
                  className="surface-panel flex flex-col p-6 transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-xl font-semibold leading-snug">{t.title}</h2>
                    <Badge variant={t.test_type === "full" ? "default" : "secondary"}>
                      {t.test_type === "full" ? "Full mock" : (t.subject ?? "Subject")}
                    </Badge>
                  </div>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">
                    {t.description ?? "CEE format practice paper."}
                  </p>
                  <div className="mt-6 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-4" /> {t.duration_minutes} min
                      </span>
                      <span className={cn("inline-flex items-center gap-1.5")}>
                        {t.test_type === "full" ? (
                          <Layers className="size-4" />
                        ) : (
                          <FileText className="size-4" />
                        )}
                        {t.test_type === "full" ? "All subjects" : t.subject}
                      </span>
                    </div>
                    <Button asChild size="sm" className="press">
                      <Link to="/test/$testId" params={{ testId: t.id }}>
                        Start
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
