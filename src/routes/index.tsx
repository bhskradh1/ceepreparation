import { seoTags, SITE_URL, OG_IMAGE } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Clock, Flame, ListChecks, Target, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CEE_BLUEPRINT, CEE_SUBJECTS } from "@/lib/cee";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CEE Prep Nepal — Free CEE Mock Tests & Weekly Ranking" },
      {
        name: "description",
        content:
          "Sit full 200-question CEE (Nepal) mock tests or subject-wise practice, get instant scoring with explanations, and rank on the weekly leaderboard.",
      },
      { property: "og:title", content: "CEE Prep Nepal — Free CEE Mock Tests & Weekly Ranking" },
      {
        property: "og:description",
        content:
          "Full CEE format mock tests, subject practice, instant results and a weekly average-based leaderboard for Nepali medical aspirants.",
      },
      ...seoTags("/").meta,
    ],
    links: seoTags("/").links,
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          name: "CEE Prep Nepal",
          url: SITE_URL,
          logo: OG_IMAGE,
          description:
            "Free CEE (Nepal) medical entrance mock tests in the official 200-question format with instant scoring and a weekly leaderboard.",
          areaServed: "NP",
        }),
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="page-shell">
      <AppHeader />
      {loading ? (
        <div className="grid flex-1 place-items-center py-24 text-muted-foreground">
          <div className="rise text-center">
            <div className="mx-auto size-10 animate-pulse rounded-full bg-primary/15" />
            <p className="mt-4 text-sm">Preparing your hall ticket…</p>
          </div>
        </div>
      ) : user ? (
        <Dashboard />
      ) : (
        <Landing />
      )}
      <SiteFooter />
    </div>
  );
}

function Landing() {
  return (
    <main className="flex-1">
      <section className="surface-hero min-h-[min(92dvh,52rem)]">
        <div className="mx-auto flex min-h-[min(92dvh,52rem)] w-full max-w-6xl flex-col justify-center px-4 py-20 md:py-28">
          <p className="rise font-display text-4xl font-semibold tracking-tight text-secondary-foreground sm:text-5xl md:text-7xl">
            CEE<span className="text-gradient-brand">Prep</span>
          </p>
          <h1 className="rise-delay-1 mt-5 max-w-3xl text-2xl font-semibold leading-tight text-secondary-foreground sm:text-3xl md:text-4xl">
            Real exam-day practice for Nepal&apos;s medical entrance.
          </h1>
          <p className="rise-delay-2 mt-5 max-w-xl text-base/7 text-secondary-foreground/80 md:text-lg/8">
            Timed 200-question CEE mocks, subject drills, instant scoring with explanations, and a
            weekly leaderboard ranked on your average.
          </p>
          <div className="rise-delay-3 mt-10 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="press bg-gold text-gold-foreground hover:bg-gold/90"
            >
              <Link to="/auth">
                Continue with Google <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="press border-secondary-foreground/25 bg-transparent text-secondary-foreground hover:bg-secondary-foreground/10"
            >
              <Link to="/leaderboard">This week&apos;s toppers</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold md:text-4xl">Built like the real hall</h2>
          <p className="mt-3 text-muted-foreground md:text-lg">
            Everything you need between now and exam morning — without the noise.
          </p>
        </div>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            {
              icon: Clock,
              title: "Exam-hall timing",
              body: "Live countdown, question palette, review marks, and auto-submit when time ends.",
            },
            {
              icon: Target,
              title: "Instant analysis",
              body: "Score, accuracy, and subject-wise breakdown the moment you submit.",
            },
            {
              icon: Trophy,
              title: "Weekly ranking",
              body: "Ranked on average score — take at least 3 tests in a week to qualify.",
            },
          ].map((f) => (
            <div key={f.title} className="group">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card/60 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold">Full paper blueprint</h2>
              <p className="mt-2 text-muted-foreground">
                200 questions · 180 minutes · official CEE subject mix
              </p>
            </div>
            <Button asChild variant="outline" className="press w-fit">
              <Link to="/auth">Start practising</Link>
            </Button>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {CEE_SUBJECTS.map((subject) => (
              <li key={subject} className="surface-panel px-4 py-5">
                <p className="text-sm text-muted-foreground">Subject</p>
                <p className="mt-1 font-display text-lg font-semibold">{subject}</p>
                <p className="mt-3 font-mono text-2xl font-bold text-primary">
                  {CEE_BLUEPRINT[subject]}
                </p>
                <p className="text-xs text-muted-foreground">questions</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function Dashboard() {
  const { user } = useAuth();

  const { data: attempts, isLoading } = useQuery({
    queryKey: ["my-attempts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attempts")
        .select(
          "id, test_id, percentage, correct_count, total_questions, submitted_at, tests(title)",
        )
        .order("submitted_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const total = attempts?.length ?? 0;
  const average = total
    ? (attempts!.reduce((s, a) => s + Number(a.percentage), 0) / total).toFixed(1)
    : "—";
  const best = total ? Math.max(...attempts!.map((a) => Number(a.percentage))).toFixed(1) : "—";
  const firstName =
    (user?.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0] ?? "student";

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:py-14">
      <div className="rise flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Your desk
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Namaste, {firstName}</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Take at least 3 tests this week to enter the leaderboard. Consistency beats cramming.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="press">
            <Link to="/tests">
              <BookOpen className="size-4" /> Browse mock tests
            </Link>
          </Button>
          <Button asChild variant="outline" className="press">
            <Link to="/leaderboard">Weekly leaderboard</Link>
          </Button>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <StatBlock icon={ListChecks} label="Recent tests" value={String(total)} />
        <StatBlock icon={Flame} label="Average score" value={total ? `${average}%` : "—"} />
        <StatBlock icon={Trophy} label="Best score" value={total ? `${best}%` : "—"} />
      </div>

      <div className="mt-12 flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold">Recent attempts</h2>
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading attempts…</p>}
        {!isLoading && total === 0 && (
          <div className="surface-panel p-10 text-center">
            <p className="font-medium">No attempts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start your first full mock or subject drill.
            </p>
            <Button asChild className="mt-5 press">
              <Link to="/tests">Open mock tests</Link>
            </Button>
          </div>
        )}
        {attempts?.map((a) => (
          <Link
            key={a.id}
            to="/result/$attemptId"
            params={{ attemptId: a.id }}
            className="surface-panel flex items-center justify-between gap-4 p-4 transition-colors hover:border-primary/30"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{a.tests?.title ?? "Mock test"}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(a.submitted_at).toLocaleString()} · {a.correct_count}/{a.total_questions}{" "}
                correct
              </p>
            </div>
            <span className="font-display text-2xl font-bold text-primary">
              {Number(a.percentage).toFixed(1)}%
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="surface-panel flex items-center gap-4 p-5">
      <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}
