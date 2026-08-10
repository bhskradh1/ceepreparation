import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Shuffle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CEE_BLUEPRINT, CEE_FULL_DURATION_MINUTES, CEE_SUBJECTS, type CeeSubject } from "@/lib/cee";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * Picks `need` random ids, preferring ones that were not used in the previous
 * paper. At most `maxRepeat` recycled ids are allowed back in.
 */
function pickWithRepeatCap(pool: string[], used: Set<string>, need: number, maxRepeat: number) {
  const fresh = shuffle(pool.filter((id) => !used.has(id)));
  const recycled = shuffle(pool.filter((id) => used.has(id)));
  const picks = fresh.slice(0, need);
  if (picks.length < need) {
    picks.push(...recycled.slice(0, Math.min(maxRepeat, need - picks.length)));
  }
  return picks;
}

export function TestBuilder() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"full" | "subject">("full");
  const [subject, setSubject] = useState<CeeSubject>("Physics");
  const [count, setCount] = useState(50);
  const [duration, setDuration] = useState(CEE_FULL_DURATION_MINUTES);
  const [maxRepeatPct, setMaxRepeatPct] = useState(10);

  const { data: tests } = useQuery({
    queryKey: ["admin-tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("id, title, test_type, subject, duration_minutes, is_published, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: async () => {
      // Questions used by the most recent paper of the same kind.
      const previous = (tests ?? []).find(
        (t) => t.test_type === type && (type === "full" || t.subject === subject),
      );
      const used = new Set<string>();
      if (previous) {
        const { data: prevLinks } = await supabase
          .from("test_questions")
          .select("question_id")
          .eq("test_id", previous.id);
        for (const row of prevLinks ?? []) used.add(row.question_id);
      }

      const total = type === "full" ? 200 : count;
      let repeatBudget = Math.floor((total * maxRepeatPct) / 100);
      const picks: string[] = [];

      const takeSubject = async (s: CeeSubject, need: number) => {
        const { data, error } = await supabase.from("questions").select("id").eq("subject", s).limit(2000);
        if (error) throw error;
        const pool = (data ?? []).map((q) => q.id);
        if (pool.length < need) throw new Error(`Not enough ${s} questions (${pool.length}/${need}).`);
        const chosen = pickWithRepeatCap(pool, used, need, repeatBudget);
        repeatBudget -= chosen.filter((id) => used.has(id)).length;
        if (chosen.length < need) {
          throw new Error(
            `Only ${chosen.length}/${need} fresh ${s} questions available within the ${maxRepeatPct}% repeat limit. Import more questions.`,
          );
        }
        picks.push(...chosen);
      };

      if (type === "full") {
        for (const s of CEE_SUBJECTS) await takeSubject(s, CEE_BLUEPRINT[s]);
      } else {
        await takeSubject(subject, count);
      }

      const ordered = shuffle(picks);

      const { data: test, error: testError } = await supabase
        .from("tests")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          test_type: type,
          subject: type === "subject" ? subject : null,
          duration_minutes: duration,
          is_published: false,
        })
        .select("id")
        .single();
      if (testError) throw testError;

      const links = ordered.map((questionId, i) => ({
        test_id: test.id,
        question_id: questionId,
        q_order: i + 1,
      }));
      const { error: linkError } = await supabase.from("test_questions").insert(links);
      if (linkError) throw linkError;

      const repeats = ordered.filter((id) => used.has(id)).length;
      return { count: links.length, repeats };
    },
    onSuccess: ({ count: n, repeats }) => {
      toast.success(
        `Test created with ${n} randomly selected questions (${repeats} repeated from the last paper). Publish it when ready.`,
      );
      setTitle("");
      setDescription("");
      void queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || "Could not create the test."),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const { error } = await supabase.from("tests").update({ is_published: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-tests"] }),
    onError: () => toast.error("Could not update the test."),
  });

  const removeTest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Test deleted.");
      void queryClient.invalidateQueries({ queryKey: ["admin-tests"] });
    },
    onError: () => toast.error("Could not delete the test."),
  });

  return (
    <div className="space-y-6">
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="size-5 text-primary" /> Create a test
          </CardTitle>
          <CardDescription>
            Questions are drawn at random from the bank. Full mocks follow the official CEE blueprint (Zoology 40,
            Botany 40, Physics 50, Chemistry 50, MAT 20), and repeats from the previous paper are capped.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="CEE Mock Test 01" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="desc">Description</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full-length practice paper"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                const next = v as "full" | "subject";
                setType(next);
                setDuration(next === "full" ? CEE_FULL_DURATION_MINUTES : 45);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full mock (200 questions)</SelectItem>
                <SelectItem value="subject">Subject-wise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
          {type === "subject" && (
            <>
              <div>
                <Label>Subject</Label>
                <Select value={subject} onValueChange={(v) => setSubject(v as CeeSubject)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CEE_SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="count">Number of questions</Label>
                <Input
                  id="count"
                  type="number"
                  min={5}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <Label>Maximum repeats from the previous paper — {maxRepeatPct}%</Label>
            <Slider
              className="mt-3"
              value={[maxRepeatPct]}
              min={0}
              max={25}
              step={1}
              onValueChange={(v) => setMaxRepeatPct(v[0] ?? 10)}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              At most {maxRepeatPct}% of this paper can reuse questions from the last test of the same kind.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Button disabled={!title.trim() || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? "Creating…" : "Create test"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>All tests</CardTitle>
          <CardDescription>Only published tests are visible to students.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(tests ?? []).length === 0 && <p className="text-muted-foreground">No tests created yet.</p>}
          {tests?.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t.test_type === "full" ? "Full mock" : t.subject} · {t.duration_minutes} min
                </p>
              </div>
              <Badge variant={t.is_published ? "default" : "secondary"}>
                {t.is_published ? "Published" : "Draft"}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => togglePublish.mutate({ id: t.id, next: !t.is_published })}
              >
                {t.is_published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {t.is_published ? "Unpublish" : "Publish"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => removeTest.mutate(t.id)} aria-label="Delete test">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
