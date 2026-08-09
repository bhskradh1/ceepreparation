import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CEE_SUBJECTS } from "@/lib/cee";
import { parseQuestionText, type ParsedQuestion } from "@/lib/parseQuestions";
import { extractPdfText } from "@/lib/pdfText";

export function QuestionImport() {
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [parsed, setParsed] = useState<ParsedQuestion[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fallbackSubject, setFallbackSubject] = useState<string>("Zoology");

  const onFile = async (file: File) => {
    setExtracting(true);
    try {
      const text = file.type === "application/pdf" ? await extractPdfText(file) : await file.text();
      setRawText(text);
      toast.success(`Extracted text from ${file.name}`);
    } catch {
      toast.error("Could not read that file. Make sure it is a text-based PDF (not a scan).");
    } finally {
      setExtracting(false);
    }
  };

  const runParse = () => {
    const result = parseQuestionText(rawText);
    setParsed(result.questions);
    setWarnings(result.warnings);
    if (result.questions.length === 0) toast.error("No questions could be detected in this text.");
    else toast.success(`${result.questions.length} question(s) detected.`);
  };

  const importable = parsed.filter((q) => q.correct_option);

  const importMutation = useMutation({
    mutationFn: async () => {
      const rows = importable.map((q) => ({
        subject: q.subject === "Unassigned" ? fallbackSubject : q.subject,
        question: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option!,
        explanation: q.explanation,
      }));
      const { error } = await supabase.from("questions").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} question(s) added to the bank.`);
      setParsed([]);
      setRawText("");
      setWarnings([]);
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("Import failed. Please try again."),
  });

  return (
    <div className="space-y-6">
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Bulk import from PDF</CardTitle>
          <CardDescription>
            Upload a question paper PDF (or paste text). Expected format: numbered question, options A–D, and an
            answer line like <code>Ans: B</code> — or an "Answer Key" block at the end. Add a line with just the
            subject name (e.g. <code>Physics</code>) to tag the questions that follow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
              {extracting ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
              {extracting ? "Reading…" : "Choose PDF or .txt"}
              <input
                type="file"
                accept="application/pdf,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onFile(file);
                  e.target.value = "";
                }}
              />
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Untagged subject:</span>
              <Select value={fallbackSubject} onValueChange={setFallbackSubject}>
                <SelectTrigger className="w-40">
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
          </div>

          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={10}
            placeholder={"Physics\n1. Unit of force is\nA) Joule\nB) Newton\nC) Watt\nD) Pascal\nAns: B"}
            className="font-mono text-xs"
          />

          <div className="flex flex-wrap gap-2">
            <Button onClick={runParse} disabled={!rawText.trim()}>
              <Wand2 className="size-4" /> Parse questions
            </Button>
            {parsed.length > 0 && (
              <Button
                variant="secondary"
                disabled={importable.length === 0 || importMutation.isPending}
                onClick={() => importMutation.mutate()}
              >
                {importMutation.isPending ? "Importing…" : `Import ${importable.length} question(s)`}
              </Button>
            )}
          </div>

          {warnings.length > 0 && (
            <ul className="space-y-1 rounded-md bg-warning/10 p-3 text-sm text-foreground">
              {warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {parsed.length > 0 && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Preview ({parsed.length})</CardTitle>
            <CardDescription>Only questions with a detected answer will be imported.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[32rem] space-y-3 overflow-y-auto">
            {parsed.map((q, i) => (
              <div key={i} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">#{q.number ?? i + 1}</Badge>
                  <Badge variant="outline">{q.subject === "Unassigned" ? fallbackSubject : q.subject}</Badge>
                  {q.correct_option ? (
                    <Badge className="bg-success text-success-foreground">Ans {q.correct_option}</Badge>
                  ) : (
                    <Badge variant="destructive">No answer</Badge>
                  )}
                </div>
                <p className="mt-2 font-medium">{q.question}</p>
                <p className="mt-1 text-muted-foreground">
                  A) {q.option_a} · B) {q.option_b} · C) {q.option_c} · D) {q.option_d}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
