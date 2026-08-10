import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { streamText, Output } from "ai";
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
- explanation: a single short sentence when you can justify the answer, otherwise null.
- Never invent questions that are not present in the text.`;

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

    const result = streamText({
      model: gateway("google/gemini-3.6-flash"),
      system: SYSTEM,
      output: Output.object({ schema: AiResult }),
      prompt: [
        data.hintSubject ? `If a question's subject is truly ambiguous, fall back to: ${data.hintSubject}.` : "",
        "Extract every complete multiple-choice question from the text below.",
        "----",
        data.text,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    const output = await result.output;
    return { questions: output.questions };
  });
