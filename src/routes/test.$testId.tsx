import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ChevronLeft, ChevronRight, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatClock } from "@/lib/cee";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/test/$testId")({
  head: () => ({
    meta: [
      { title: "Taking a CEE mock test — CEE Prep Nepal" },
      {
        name: "description",
        content: "Timed CEE mock test with question palette, review marks and auto-submit.",
      },
      { property: "og:title", content: "Taking a CEE mock test — CEE Prep Nepal" },
      { property: "og:description", content: "Timed CEE Nepal mock test in progress." },
    ],
  }),
  component: TestRunner,
});

const LETTERS = ["A", "B", "C", "D"] as const;

function TestRunner() {
  const { testId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  const { data: test } = useQuery({
    queryKey: ["test", testId],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("*")
        .eq("id", testId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["test-questions", testId],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_test_questions", { p_test_id: testId });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (test?.duration_minutes && secondsLeft === null) {
      setSecondsLeft(test.duration_minutes * 60);
      startedAt.current = Date.now();
    }
  }, [test?.duration_minutes, secondsLeft]);

  const submit = useCallback(
    async (auto = false) => {
      if (submitting) return;
      setSubmitting(true);
      const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
      const { data, error } = await supabase.rpc("submit_attempt", {
        p_test_id: testId,
        p_answers: answers,
        p_time_taken: elapsed,
      });
      if (error || !data) {
        setSubmitting(false);
        toast.error("Could not submit your test. Please try again.");
        return;
      }
      if (auto) toast.info("Time's up — your test was submitted automatically.");
      void navigate({
        to: "/result/$attemptId",
        params: { attemptId: data as string },
        replace: true,
      });
    },
    [answers, navigate, submitting, testId],
  );

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      void submit(true);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, submit]);

  const list = questions ?? [];
  const current = list[index];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  if (isLoading || !test) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Loading test…
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <AlertTriangle className="mx-auto size-8 text-warning" />
          <p className="mt-3 font-medium">This test has no questions yet.</p>
          <Button className="mt-4" onClick={() => void navigate({ to: "/tests" })}>
            Back to tests
          </Button>
        </div>
      </div>
    );
  }

  const toggleMark = (id: string) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold md:text-lg">{test.title}</p>
            <p className="text-xs text-muted-foreground">
              {answeredCount}/{list.length} answered
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 font-mono text-sm sm:text-base",
                secondsLeft !== null && secondsLeft < 300 && "border-destructive text-destructive",
              )}
            >
              <Timer className="size-4" />
              {secondsLeft === null ? "--:--" : formatClock(secondsLeft)}
            </Badge>
            <Button
              size="sm"
              className="press"
              onClick={() => setConfirmOpen(true)}
              disabled={submitting}
            >
              Submit
            </Button>
          </div>
        </div>
        <Progress value={(answeredCount / list.length) * 100} className="h-1 rounded-none" />
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:py-8 lg:grid-cols-[1fr_280px]">
        <section className="surface-panel p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Question {index + 1}</Badge>
            {current?.subject && <Badge variant="outline">{current.subject}</Badge>}
          </div>
          <p className="mt-5 text-lg font-medium leading-relaxed md:text-xl">{current?.question}</p>

          <div className="mt-7 space-y-3">
            {LETTERS.map((letter) => {
              const value =
                letter === "A"
                  ? current?.option_a
                  : letter === "B"
                    ? current?.option_b
                    : letter === "C"
                      ? current?.option_c
                      : current?.option_d;
              const selected = current ? answers[current.id] === letter : false;
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => current && setAnswers((a) => ({ ...a, [current.id]: letter }))}
                  className={cn(
                    "press flex w-full items-start gap-3 rounded-xl border border-border bg-background/70 p-4 text-left hover:border-primary/45 hover:bg-muted/50",
                    selected && "border-primary bg-primary/5 ring-1 ring-primary",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full border border-border text-sm font-semibold",
                      selected && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {letter}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{value}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="press"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="press"
              disabled={index === list.length - 1}
              onClick={() => setIndex((i) => i + 1)}
            >
              Next <ChevronRight className="size-4" />
            </Button>
            {current && (
              <Button
                variant={marked.has(current.id) ? "secondary" : "ghost"}
                size="sm"
                className="press"
                onClick={() => toggleMark(current.id)}
              >
                {marked.has(current.id) ? "Unmark" : "Mark for review"}
              </Button>
            )}
            {current && answers[current.id] && (
              <Button
                variant="ghost"
                size="sm"
                className="press"
                onClick={() =>
                  setAnswers((a) => {
                    const next = { ...a };
                    delete next[current.id];
                    return next;
                  })
                }
              >
                Clear answer
              </Button>
            )}
          </div>
        </section>

        <aside className="surface-panel h-fit p-4 lg:sticky lg:top-24">
          <p className="text-sm font-semibold">Question palette</p>
          <div className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
            {list.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "press grid aspect-square place-items-center rounded-md border border-border text-xs font-semibold",
                  answers[q.id] && "border-success bg-success text-success-foreground",
                  marked.has(q.id) && "border-warning bg-warning text-warning-foreground",
                  i === index && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
            <p>
              <span className="mr-2 inline-block size-3 rounded-sm bg-success align-middle" />{" "}
              Answered
            </p>
            <p>
              <span className="mr-2 inline-block size-3 rounded-sm bg-warning align-middle" />{" "}
              Marked for review
            </p>
          </div>
        </aside>
      </main>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this test?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} of {list.length} questions. Unanswered questions
              score zero and this attempt counts towards your weekly average.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submit(false)}>Submit now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
