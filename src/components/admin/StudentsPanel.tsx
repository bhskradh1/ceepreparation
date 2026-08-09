import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

export function StudentsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const { data: attempts, error: aErr } = await supabase.from("attempts").select("user_id, percentage");
      if (aErr) throw aErr;

      const stats = new Map<string, { count: number; sum: number }>();
      for (const a of attempts ?? []) {
        const s = stats.get(a.user_id) ?? { count: 0, sum: 0 };
        s.count += 1;
        s.sum += Number(a.percentage);
        stats.set(a.user_id, s);
      }

      return (profiles ?? []).map((p) => {
        const s = stats.get(p.id);
        return { ...p, tests: s?.count ?? 0, average: s && s.count ? s.sum / s.count : null };
      });
    },
  });

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle>Students</CardTitle>
        <CardDescription>Everyone who has signed in, with their overall performance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {!isLoading && (data ?? []).length === 0 && <p className="text-muted-foreground">No students yet.</p>}
        {data?.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Avatar className="size-9">
              <AvatarImage src={s.avatar_url ?? undefined} alt={s.full_name ?? "Student"} />
              <AvatarFallback>{(s.full_name ?? "S").slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.full_name ?? "Student"}</p>
              <p className="truncate text-xs text-muted-foreground">{s.email}</p>
            </div>
            <div className="text-right">
              <p className="font-display font-bold">{s.average === null ? "—" : `${s.average.toFixed(1)}%`}</p>
              <p className="text-xs text-muted-foreground">{s.tests} tests</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
