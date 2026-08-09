import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock, Flame, ListChecks, Target, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    ],
  }),
  component: Home,
});

function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen">
      <AppHeader />
      {loading ? <div className="p-10 text-center text-muted-foreground">Loading…</div> : user ? <Dashboard /> : <Landing />}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Built for CEE (Nepal) aspirants · Practice daily, rank weekly.
      </footer>
    </div>
  );
}

function Landing() {
  return (
    <main>
      <section className="surface-hero">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1.15fr_1fr] md:py-28">
          <div className="text-secondary-foreground">
            <Badge variant="outline" className="border-gold/60 text-gold">
              CEE Nepal · MBBS / BDS entrance
            </Badge>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] md:text-6xl">
              Crack CEE with <span className="text-gradient-brand">real exam-day</span> practice.
            </h1>
            <p className="mt-5 max-w-xl text-base/7 opacity-85">
              Timed mock tests in the official 200-question CEE format, subject-wise drills, instant
              scoring with explanations, and a weekly leaderboard that ranks you on your average.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Continue with Google</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-gold/50 text-gold hover:bg-gold/10">
                <Link to="/leaderboard">See this week's toppers</Link>
              </Button>
            </div>
          </div>

          <div className="card-elevated p-6">
            <h2 className="font-display text-lg font-semibold">Full paper blueprint</h2>
            <p className="mt-1 text-sm text-muted-foreground">200 questions · 180 minutes</p>
            <ul className="mt-4 space-y-2">
              {CEE_SUBJECTS.map((subject) => (
                <li key={subject} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                  <span className="font-medium">{subject}</span>
                  <span className="text-muted-foreground">{CEE_BLUEPRINT[subject]} questions</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-16 md:grid-cols-3">
        {[
          { icon: Clock, title: "Exam-hall timing", body: "A live countdown, question palette and auto-submit when time is up." },
          { icon: Target, title: "Instant analysis", body: "Score, accuracy and subject-wise breakdown right after you submit." },
          { icon: Trophy, title: "Weekly ranking", body: "Ranked on your average score — minimum 3 tests a week to qualify." },
        ].map((f) => (
          <Card key={f.title} className="card-elevated">
            <CardHeader>
              <f.icon className="size-6 text-primary" />
              <CardTitle className="mt-2 text-lg">{f.title}</CardTitle>
              <CardDescription>{f.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </main>
  );
}

function Dashboard() {
  const { user } = useAuth();

  const { data: attempts } = useQuery({
    queryKey: ["my-attempts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attempts")
        .select("id, test_id, percentage, correct_count, total_questions, submitted_at, tests(title)")
        .order("submitted_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const total = attempts?.length ?? 0;
  const average = total ? (attempts!.reduce((s, a) => s + Number(a.percentage), 0) / total).toFixed(1) : "—";
  const best = total ? Math.max(...attempts!.map((a) => Number(a.percentage))).toFixed(1) : "—";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">
        Namaste, {(user?.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0] ?? "student"} 👋
      </h1>
      <p className="mt-1 text-muted-foreground">Take at least 3 tests this week to enter the leaderboard.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={ListChecks} label="Recent tests" value={String(total)} />
        <StatCard icon={Flame} label="Average score" value={total ? `${average}%` : "—"} />
        <StatCard icon={Trophy} label="Best score" value={total ? `${best}%` : "—"} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/tests">
            <BookOpen className="size-4" /> Browse mock tests
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/leaderboard">Weekly leaderboard</Link>
        </Button>
      </div>

      <h2 className="mt-12 text-xl font-semibold">Recent attempts</h2>
      <div className="mt-4 space-y-3">
        {total === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            No attempts yet — start your first mock test.
          </p>
        )}
        {attempts?.map((a) => (
          <Link
            key={a.id}
            to="/result/$attemptId"
            params={{ attemptId: a.id }}
            className="card-elevated flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/60"
          >
            <div>
              <p className="font-medium">{a.tests?.title ?? "Mock test"}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(a.submitted_at).toLocaleString()} · {a.correct_count}/{a.total_questions} correct
              </p>
            </div>
            <span className="font-display text-xl font-bold text-primary">{Number(a.percentage).toFixed(1)}%</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <Card className="card-elevated">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
