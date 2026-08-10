import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileUp, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CEE_SUBJECTS, normalizeSubject } from "@/lib/cee";
import { parseQuestionText, type ParsedQuestion } from "@/lib/parseQuestions";
import { extractPdfText } from "@/lib/pdfText";
import { aiExtractQuestions } from "@/lib/questions.functions";

const CHUNK_CHARS = 9000;

/** Splits raw paper text into model-sized chunks on line boundaries. */
function chunkText(raw: string): string[] {
  const lines = raw.split("\n");
  const chunks: string[] = [];
  let buffer = "";
  for (const line of lines) {
    if (buffer.length + line.length + 1 > CHUNK_CHARS && buffer.trim()) {
      chunks.push(buffer);
      buffer = "";
    }
    buffer += `${line}\n`;
  }
  if (buffer.trim()) chunks.push(buffer);
  return chunks;
}

/** A trailing answer key must travel with every chunk or answers get lost. */
function answerKeyTail(raw: string): string {
  const match = raw.match(/answer\s*key/i);
  if (!match || match.index == null) return "";
  return raw.slice(match.index).slice(0, 4000);
}

export function QuestionImport() {
  const queryClient = useQueryClient();
  const runAiExtract = useServerFn(aiExtractQuestions);
  const [rawText, setRawText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [parsed, setParsed] = useState<ParsedQuestion[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fallbackSubject, setFallbackSubject] = useState<string>("Zoology");
  const [aiProgress, setAiProgress] = useState<{ done: number; total: number } | null>(null);

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

  const aiMutation = useMutation({
    mutationFn: async () => {
      const chunks = chunkText(rawText);
      const tail = answerKeyTail(rawText);
      const collected: ParsedQuestion[] = [];
      setAiProgress({ done: 0, total: chunks.length });

      for (let i = 0; i < chunks.length; i++) {
        const body = tail && !chunks[i]!.includes(tail.slice(0, 40)) ? `${chunks[i]}\n\n${tail}` : chunks[i]!;
        const res = await runAiExtract({ data: { text: body, hintSubject: fallbackSubject } });
        for (const q of res.questions) {
          const letter = (q.correct_option ?? "").trim().toUpperCase();
          if (!["A", "B", "C", "D"].includes(letter)) continue;
          if (!q.question?.trim() || !q.option_a || !q.option_b || !q.option_c || !q.option_d) continue;
          collected.push({
            number: collected.length + 1,
            subject: normalizeSubject(q.subject ?? "") ?? "Unassigned",
            question: q.question.trim(),
            option_a: q.option_a.trim(),
            option_b: q.option_b.trim(),
            option_c: q.option_c.trim(),
            option_d: q.option_d.trim(),
            correct_option: letter as "A",
            explanation: q.explanation?.trim() || null,
          });
        }
        setAiProgress({ done: i + 1, total: chunks.length });
      }

      // Drop duplicates the chunk overlap may have produced.
      const seen = new Set<string>();
      return collected.filter((q) => {
        const key = q.question.toLowerCase().replace(/\s+/g, " ").slice(0, 120);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    onSuccess: (questions) => {
      setParsed(questions);
      setWarnings([]);
      setAiProgress(null);
      if (questions.length === 0) toast.error("The AI could not find any complete questions in this text.");
      else toast.success(`AI detected ${questions.length} question(s) with subjects and answers.`);
    },
    onError: () => {
      setAiProgress(null);
      toast.error("AI detection failed. Try a smaller batch or use the plain parser.");
    },
  });

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
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> Bulk import from PDF
          </CardTitle>
          <CardDescription>
            Upload a question paper PDF (or paste text) and let AI detection read it. The questions do not need to be
            in a perfect order — AI works out the question, the four options, the correct answer and the subject on its
            own. The plain parser stays available for clean, well-formatted papers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
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
              <span className="text-sm text-muted-foreground">Fallback subject:</span>
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
            placeholder={"Paste anything — jumbled questions, a separate answer key, mixed subjects.\n\nUnit of force is\nJoule\nNewton\nWatt\nPascal"}
            className="font-mono text-xs"
          />

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => aiMutation.mutate()} disabled={!rawText.trim() || aiMutation.isPending}>
              {aiMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {aiMutation.isPending ? "AI reading…" : "Detect with AI"}
            </Button>
            <Button variant="outline" onClick={runParse} disabled={!rawText.trim() || aiMutation.isPending}>
              <Wand2 className="size-4" /> Plain parser
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

          {aiProgress && (
            <div className="space-y-1.5">
              <Progress value={(aiProgress.done / aiProgress.total) * 100} />
              <p className="text-xs text-muted-foreground">
                Reading batch {aiProgress.done} of {aiProgress.total}…
              </p>
            </div>
          )}

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
              <div key={i} className="rounded-lg border border-border p-3 text-sm transition-colors hover:bg-muted/40">
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
