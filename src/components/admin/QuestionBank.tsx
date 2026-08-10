import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { CEE_SUBJECTS } from "@/lib/cee";

export function QuestionBank() {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-questions", subject],
    queryFn: async () => {
      let query = supabase
        .from("questions")
        .select("id, subject, question, option_a, option_b, option_c, option_d, correct_option")
        .order("created_at", { ascending: false })
        .limit(300);
      if (subject !== "all") query = query.eq("subject", subject);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Question deleted.");
      void queryClient.invalidateQueries({ queryKey: ["admin-questions"] });
    },
    onError: () => toast.error("Could not delete that question."),
  });

  const wipe = useMutation({
    mutationFn: async () => {
      // Links must go first — test_questions references questions.
      let linkQuery = supabase.from("test_questions").delete();
      let questionQuery = supabase.from("questions").delete();
      if (subject === "all") {
        const { data: ids, error: idsError } = await supabase.from("questions").select("id");
        if (idsError) throw idsError;
        const list = (ids ?? []).map((q) => q.id);
        if (list.length === 0) return 0;
        const { error: linkError } = await linkQuery.in("question_id", list);
        if (linkError) throw linkError;
        const { error } = await questionQuery.in("id", list);
        if (error) throw error;
        return list.length;
      }
      const { data: ids, error: idsError } = await supabase.from("questions").select("id").eq("subject", subject);
      if (idsError) throw idsError;
      const list = (ids ?? []).map((q) => q.id);
      if (list.length === 0) return 0;
      const { error: linkError } = await linkQuery.in("question_id", list);
      if (linkError) throw linkError;
      const { error } = await questionQuery.in("id", list);
      if (error) throw error;
      return list.length;
    },
    onSuccess: (n) => {
      toast.success(n === 0 ? "Nothing to delete." : `${n} question(s) deleted.`);
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("Could not delete the questions."),
  });

  const rows = (data ?? []).filter((q) => q.question.toLowerCase().includes(search.toLowerCase()));

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle>Question bank</CardTitle>
        <CardDescription>Showing the 300 most recent questions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={subject === "all" ? "default" : "outline"} onClick={() => setSubject("all")}>
            All
          </Button>
          {CEE_SUBJECTS.map((s) => (
            <Button key={s} size="sm" variant={subject === s ? "default" : "outline"} onClick={() => setSubject(s)}>
              {s}
            </Button>
          ))}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions…"
            className="ml-auto w-56"
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={wipe.isPending}>
                <Trash2 className="size-4" />
                {subject === "all" ? "Delete all" : `Delete all ${subject}`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {subject === "all"
                    ? "Delete every question in the bank?"
                    : `Delete every ${subject} question?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the questions and unlinks them from any existing mock test. Student attempts
                  already submitted are kept. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => wipe.mutate()}>Yes, delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="mt-4 space-y-2">
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {!isLoading && rows.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              No questions found. Import some from a PDF.
            </p>
          )}
          {rows.map((q) => (
            <div
              key={q.id}
              className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{q.subject}</Badge>
                  <Badge className="bg-success text-success-foreground">Ans {q.correct_option}</Badge>
                </div>
                <p className="mt-1.5 text-sm font-medium">{q.question}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A) {q.option_a} · B) {q.option_b} · C) {q.option_c} · D) {q.option_d}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(q.id)} aria-label="Delete question">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
