export const CEE_SUBJECTS = ["Zoology", "Botany", "Physics", "Chemistry", "MAT"] as const;

export type CeeSubject = (typeof CEE_SUBJECTS)[number];

/** Official CEE (Nepal) full-paper blueprint: 200 questions in 180 minutes. */
export const CEE_BLUEPRINT: Record<CeeSubject, number> = {
  Zoology: 40,
  Botany: 40,
  Physics: 50,
  Chemistry: 50,
  MAT: 20,
};

export const CEE_FULL_DURATION_MINUTES = 180;

export function normalizeSubject(input: string): CeeSubject | null {
  const value = input.trim().toLowerCase();
  const map: Record<string, CeeSubject> = {
    zoology: "Zoology",
    zoo: "Zoology",
    botany: "Botany",
    bot: "Botany",
    physics: "Physics",
    phy: "Physics",
    chemistry: "Chemistry",
    chem: "Chemistry",
    mat: "MAT",
    "mental ability": "MAT",
    "mental ability test": "MAT",
  };
  return map[value] ?? null;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
