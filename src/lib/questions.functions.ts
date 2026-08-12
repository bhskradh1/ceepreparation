import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { streamText, NoObjectGeneratedError } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  text: z.string(),
  hintSubject: z.string().optional(),
});

const AiQuestion = z.object({
  subject: z.string(),
  question: z.string(),
  option_a: z.string(),
  option_b: z.string(),
  option_c: z.string(),
  option_d: z.string(),
  correct_option: z.string(),
  explanation: z.string().nullable(),
});

const AiResult = z.object({ questions: z.array(AiQuestion) });

export type AiExtractedQuestion = z.infer<typeof AiQuestion>;

const SYSTEM = `You extract multiple-choice questions from messy exam papers for the Nepali CEE (medical entrance) exam.

Rules:
- The input may be unordered, badly OCR'd, missing numbering, or have the answer key far away from the questions. Reconstruct anyway.
- Each output item MUST have the question text and exactly four options (A, B, C, D). If a question has fewer or more, skip it.
- correct_option must be exactly one of "A", "B", "C", "D". Use the answer key, the "Ans:" markers, bold/marked options, or — if there is genuinely no answer anywhere — your own subject knowledge to pick the correct one.
- subject must be exactly one of: Zoology, Botany, Physics, Chemistry, MAT. Infer it from the question content itself; do not rely on headings. MAT means mental ability / reasoning.
- Strip question numbers, option letters, page headers, footers and watermarks from the text.
- explanation: keep it null unless one short sentence is genuinely useful.
- Never invent questions that are not present in the text.
- Return ONLY the JSON object {"questions": [...]}.`;

/** Best-effort recovery of question objects from a truncated / non-conforming model reply. */
function salvageQuestions(text: string | undefined): AiExtractedQuestion[] {
  if (!text) return [];
  const out: AiExtractedQuestion[] = [];
  // Match each balanced-ish object that looks like a question record.
  const matches = text.match(/\{[^{}]*"question"\s*:[^{}]*\}/g) ?? [];
  for (const raw of matches) {
    try {
      const parsed = AiQuestion.partial().parse(JSON.parse(raw));
      if (
        parsed.question &&
        parsed.option_a &&
        parsed.option_b &&
        parsed.option_c &&
        parsed.option_d &&
        parsed.correct_option
      ) {
        out.push({
          subject: parsed.subject ?? "",
          question: parsed.question,
          option_a: parsed.option_a,
          option_b: parsed.option_b,
          option_c: parsed.option_c,
          option_d: parsed.option_d,
          correct_option: parsed.correct_option,
          explanation: parsed.explanation ?? null,
        });
      }
    } catch {
      // skip malformed fragment
    }
  }
  return out;
}

export const aiExtractQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured.");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const prompt = [
      data.hintSubject ? `If a question's subject is truly ambiguous, fall back to: ${data.hintSubject}.` : "",
      "Extract every complete multiple-choice question from the text below.",
      "----",
      data.text,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const result = streamText({
        model: gateway("google/gemini-3.6-flash"),
        system: SYSTEM,
        maxOutputTokens: 32000,
        maxRetries: 1,
        prompt,
      });

      // Stream plain text and parse ourselves: schema-constrained output throws
      // "No output generated" whenever the model truncates or wraps the JSON.
      const text = await result.text;
      const cleaned = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();

      try {
        const parsed = AiResult.parse(JSON.parse(cleaned));
        return { questions: parsed.questions, partial: false };
      } catch {
        const salvaged = salvageQuestions(cleaned);
        if (salvaged.length === 0) throw new Error("The AI reply could not be read as questions.");
        return { questions: salvaged, partial: true };
      }
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        const salvaged = salvageQuestions(error.text);
        return { questions: salvaged, partial: true };
      }
      const message = error instanceof Error ? error.message : "AI request failed.";
      throw new Error(message);
    }
  });

