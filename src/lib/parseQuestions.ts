import { normalizeSubject, type CeeSubject } from "./cee";

export type ParsedQuestion = {
  number: number | null;
  subject: CeeSubject | "Unassigned";
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D" | null;
  explanation: string | null;
};

export type ParseResult = {
  questions: ParsedQuestion[];
  warnings: string[];
};

const QUESTION_START = /^\s*(?:Q\.?\s*)?(\d{1,3})\s*[.)\]:-]\s*(.*)$/i;
const OPTION_LINE = /^\s*[([]?\s*([A-Da-d])\s*[).\]:-]\s*(.*)$/;
const ANSWER_LINE = /^\s*(?:ans|answer|correct answer|correct)\s*(?:key)?\s*[:.\-)]?\s*[([]?\s*([A-Da-d])\s*[)\]]?\s*$/i;
const EXPLANATION_LINE = /^\s*(?:exp|explanation|reason|solution)\s*[:.\-)]\s*(.*)$/i;
const SUBJECT_LINE = /^\s*[[#]?\s*(?:subject\s*[:\-]\s*)?(zoology|botany|physics|chemistry|mat|mental ability(?: test)?)\s*[\]#]?\s*[:.]?\s*$/i;
const ANSWER_KEY_BLOCK = /(\d{1,3})\s*[.)\-:]?\s*([A-Da-d])\b/g;

function cleanup(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Parses a "1. Question / A) .. B) .. C) .. D) .. Ans: B" style paper.
 * Also picks up a trailing "Answer Key" block (e.g. "1. B  2. C") when the
 * individual questions have no inline answer.
 */
export function parseQuestionText(raw: string): ParseResult {
  const warnings: string[] = [];
  const normalized = raw
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/([A-Da-d])\s*[).]\s+/g, (m) => m); // keep as-is, readability guard

  const lines = normalized.split("\n");

  // Split off a trailing answer-key section if present.
  let bodyLines = lines;
  const keyMap = new Map<number, "A" | "B" | "C" | "D">();
  const keyHeaderIndex = lines.findIndex((l) => /^\s*answer\s*key\s*:?\s*$/i.test(l));
  if (keyHeaderIndex >= 0) {
    bodyLines = lines.slice(0, keyHeaderIndex);
    const keyText = lines.slice(keyHeaderIndex + 1).join(" ");
    for (const match of keyText.matchAll(ANSWER_KEY_BLOCK)) {
      keyMap.set(Number(match[1]), match[2]!.toUpperCase() as "A");
    }
  }

  const questions: ParsedQuestion[] = [];
  let current: ParsedQuestion | null = null;
  let currentSubject: CeeSubject | "Unassigned" = "Unassigned";
  let lastField: "question" | "A" | "B" | "C" | "D" | "explanation" | null = null;

  const push = () => {
    if (!current) return;
    const missing =
      !current.question || !current.option_a || !current.option_b || !current.option_c || !current.option_d;
    if (missing) {
      warnings.push(
        `Question ${current.number ?? "?"} was skipped — it is missing the question text or one of the four options.`,
      );
    } else {
      current.question = cleanup(current.question);
      current.option_a = cleanup(current.option_a);
      current.option_b = cleanup(current.option_b);
      current.option_c = cleanup(current.option_c);
      current.option_d = cleanup(current.option_d);
      current.explanation = current.explanation ? cleanup(current.explanation) : null;
      questions.push(current);
    }
    current = null;
    lastField = null;
  };

  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const subjectMatch = trimmed.match(SUBJECT_LINE);
    if (subjectMatch) {
      const subject = normalizeSubject(subjectMatch[1]!);
      if (subject) {
        currentSubject = subject;
        continue;
      }
    }

    const answerMatch = trimmed.match(ANSWER_LINE);
    if (answerMatch && current) {
      current.correct_option = answerMatch[1]!.toUpperCase() as "A";
      lastField = null;
      continue;
    }

    const explanationMatch = trimmed.match(EXPLANATION_LINE);
    if (explanationMatch && current) {
      current.explanation = explanationMatch[1] ?? "";
      lastField = "explanation";
      continue;
    }

    const optionMatch = trimmed.match(OPTION_LINE);
    if (optionMatch && current) {
      const letter = optionMatch[1]!.toUpperCase() as "A" | "B" | "C" | "D";
      const value = optionMatch[2] ?? "";
      if (letter === "A") current.option_a = value;
      if (letter === "B") current.option_b = value;
      if (letter === "C") current.option_c = value;
      if (letter === "D") current.option_d = value;
      lastField = letter;
      continue;
    }

    const questionMatch = trimmed.match(QUESTION_START);
    if (questionMatch) {
      push();
      current = {
        number: Number(questionMatch[1]),
        subject: currentSubject,
        question: questionMatch[2] ?? "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_option: null,
        explanation: null,
      };
      lastField = "question";
      continue;
    }

    // Continuation of the previous field (wrapped lines from a PDF).
    if (current && lastField) {
      if (lastField === "question") current.question += ` ${trimmed}`;
      else if (lastField === "A") current.option_a += ` ${trimmed}`;
      else if (lastField === "B") current.option_b += ` ${trimmed}`;
      else if (lastField === "C") current.option_c += ` ${trimmed}`;
      else if (lastField === "D") current.option_d += ` ${trimmed}`;
      else if (lastField === "explanation") current.explanation = `${current.explanation ?? ""} ${trimmed}`;
    }
  }
  push();

  for (const q of questions) {
    if (!q.correct_option && q.number != null && keyMap.has(q.number)) {
      q.correct_option = keyMap.get(q.number)!;
    }
  }

  const withoutAnswer = questions.filter((q) => !q.correct_option).length;
  if (withoutAnswer > 0) {
    warnings.push(`${withoutAnswer} question(s) have no answer marked — set the answer before importing.`);
  }

  return { questions, warnings };
}
