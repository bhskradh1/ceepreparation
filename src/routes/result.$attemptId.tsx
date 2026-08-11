import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/result/$attemptId")({
  head: () => ({
    meta: [
      { title: "Your CEE mock test result — CEE Prep Nepal" },
      {
        name: "description",
        content: "Score, accuracy and subject-wise breakdown of your CEE mock test attempt.",
      },
      { property: "og:title", content: "Your CEE mock test result — CEE Prep Nepal" },
      { property: "og:description", content: "Detailed CEE mock test result with answer review." },
    ],
  }),
  component: ResultPage,
});

const LETTERS = ["A", "B", "C", "D"] as const;

function ResultPage() {
  const { attemptId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: async () => {
      const { data: attempt, error } = await supabase
        .from("attempts")
        .select("*, tests(title, test_type, subject)")
        .eq("id", attemptId)
        .maybeSingle();
      if (error) throw error;
      if (!attempt) return null;

      const { data: rows, error: qErr } = await supabase
        .from("test_questions")
        .select(
          "q_order, questions(id, question, option_a, option_b, option_c, option_d, correct_option, explanation, subject)",
        )
        .eq("test_id", attempt.test_id)
        .order("q_order");
      if (qErr) throw qErr;

      return { attempt, rows: rows ?? [] };
    },
  });

  if (isLoading)
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Loading result…
      </div>
    );
  if (!data?.attempt) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <p className="font-medium">Result not found.</p>
          <Button className="mt-4" asChild>
            <Link to="/tests">Back to tests</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { attempt, rows } = data;
  const given = (attempt.answers ?? {}) as Record<string, string>;
  const pct = Number(attempt.percentage);

  const bySubject = new Map<string, { correct: number; total: number }>();
  for (const r of rows) {
    const q = r.questions;
    if (!q) continue;
    const s = q.subject ?? "Other";
    const entry = bySubject.get(s) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (given[q.id] === q.correct_option) entry.correct += 1;
    bySubject.set(s, entry);
  }

  return (
    <div className="page-shell">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 md:py-14">
        <section className="overflow-hidden rounded-2xl border border-border shadow-xl">
          <div className="surface-hero px-6 py-10 text-center">
            <p className="rise text-sm opacity-80">{attempt.tests?.title ?? "Mock test"}</p>
            <p className="rise-delay-1 font-display text-6xl font-bold text-gradient-brand md:text-7xl">
              {pct.toFixed(1)}%
            </p>
            <p className="rise-delay-2 mt-3 text-sm opacity-85">
              {attempt.correct_count} correct · {attempt.total_questions - attempt.correct_count}{" "}
              wrong or skipped
            </p>
          </div>
          <div className="grid gap-3 bg-card p-5 sm:grid-cols-3 sm:gap-4 sm:p-6">
            <Stat label="Questions" value={String(attempt.total_questions)} />
            <Stat label="Correct" value={String(attempt.correct_count)} />
            <Stat
              label="Time taken"
              value={
                attempt.time_taken_seconds
                  ? `${Math.floor(attempt.time_taken_seconds / 60)}m ${attempt.time_taken_seconds % 60}s`
                  : "—"
              }
            />
          </div>
        </section>

        <section className="surface-panel mt-6 p-6">
          <h2 className="text-lg font-semibold">Subject-wise performance</h2>
          <div className="mt-4 space-y-4">
            {[...bySubject.entries()].map(([subject, s]) => (
              <div key={subject}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{subject}</span>
                  <span className="text-muted-foreground">
                    {s.correct}/{s.total} ({((s.correct / s.total) * 100).toFixed(0)}%)
                  </span>
                </div>
                <Progress className="mt-1.5 h-2" value={(s.correct / s.total) * 100} />
              </div>
            ))}
          </div>
        </section>

        <h2 className="mt-10 text-xl font-semibold">Answer review</h2>
        <div className="mt-4 space-y-4">
          {rows.map((r, i) => {
            const q = r.questions;
            if (!q) return null;
            const picked = given[q.id];
            const correct = picked === q.correct_option;
            return (
              <article key={q.id} className="surface-panel p-5">
                <div className="flex items-start gap-3">
                  {picked ? (
                    correct ? (
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                    )
                  ) : (
                    <MinusCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">Q{i + 1}</Badge>
                      {q.subject && <Badge variant="outline">{q.subject}</Badge>}
                    </div>
                    <p className="mt-2 font-medium">{q.question}</p>
                    <div className="mt-3 space-y-1.5">
                      {LETTERS.map((letter) => {
                        const text =
                          letter === "A"
                            ? q.option_a
                            : letter === "B"
                              ? q.option_b
                              : letter === "C"
                                ? q.option_c
                                : q.option_d;
                        const isCorrect = q.correct_option === letter;
                        const isPicked = picked === letter;
                        return (
                          <p
                            key={letter}
                            className={cn(
                              "rounded-md border border-transparent px-3 py-1.5 text-sm",
                              isCorrect && "border-success/40 bg-success/10 text-foreground",
                              isPicked && !isCorrect && "border-destructive/40 bg-destructive/10",
                            )}
                          >
                            <span className="font-semibold">{letter}.</span> {text}
                            {isPicked && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (your answer)
                              </span>
                            )}
                          </p>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <p className="mt-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Explanation: </span>
                        {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild className="press">
            <Link to="/tests">Take another test</Link>
          </Button>
          <Button asChild variant="outline" className="press">
            <Link to="/leaderboard">View leaderboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/80 p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold">{value}</p>
    </div>
  );
}
