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
      // Server-side bulk delete: one statement, no URL-length limits, admin-checked in the database.
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: number | null; error: { message: string } | null }>
      )("admin_delete_questions", { p_subject: subject === "all" ? null : subject });
      if (error) throw new Error(error.message);
      return data ?? 0;
    },
    onSuccess: (n) => {
      toast.success(n === 0 ? "Nothing to delete." : `${n} question(s) deleted.`);
      void queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete the questions."),
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
