import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Weekly Leaderboard — CEE Prep Nepal" },
      {
        name: "description",
        content:
          "See this week's top CEE aspirants ranked by average mock test score. Minimum 3 tests to qualify.",
      },
      { property: "og:title", content: "Weekly Leaderboard — CEE Prep Nepal" },
      {
        property: "og:description",
        content: "Top CEE Nepal mock test performers of the week, ranked by average score.",
      },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["weekly-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_weekly_leaderboard");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = data ?? [];
  const podium = rows.slice(0, 3);

  return (
    <div className="page-shell">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 md:py-14">
        <div className="rise flex items-start gap-4">
          <span className="mt-1 grid size-12 place-items-center rounded-2xl bg-gold/20 text-gold">
            <Trophy className="size-6" />
          </span>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
              This week
            </p>
            <h1 className="mt-1 text-3xl font-semibold md:text-4xl">Leaderboard</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Ranked by average score · minimum 3 tests to qualify.
            </p>
          </div>
        </div>

        {isLoading && <p className="mt-10 text-muted-foreground">Loading rankings…</p>}

        {!isLoading && rows.length === 0 && (
          <div className="surface-panel mt-10 p-10 text-center">
            <h2 className="text-xl font-semibold">No one has qualified yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete 3 tests this week and you could be the first name here.
            </p>
          </div>
        )}

        {podium.length > 0 && (
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {podium.map((p, i) => (
              <div
                key={p.user_id}
                className={cn(
                  "surface-panel text-center",
                  i === 0 && "sm:-translate-y-3 ring-2 ring-gold/70",
                  i === 1 && "sm:order-first",
                )}
              >
                <div className="p-6">
                  {i === 0 ? (
                    <Crown className="mx-auto size-6 text-gold" />
                  ) : (
                    <Medal
                      className={cn(
                        "mx-auto size-6",
                        i === 1 ? "text-muted-foreground" : "text-warning",
                      )}
                    />
                  )}
                  <Avatar className="mx-auto mt-3 size-16 ring-2 ring-border">
                    <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name ?? "Student"} />
                    <AvatarFallback>{(p.full_name ?? "S").slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <p className="mt-3 truncate font-semibold">{p.full_name ?? "Student"}</p>
                  <p className="font-display text-3xl font-bold text-primary">
                    {Number(p.average_percentage).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">{p.tests_taken} tests</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 space-y-2">
          {rows.map((p, i) => (
            <div
              key={p.user_id}
              className={cn(
                "flex items-center gap-4 rounded-xl border border-border bg-card/80 p-3 backdrop-blur",
                p.user_id === user?.id && "border-primary/50 bg-primary/5",
              )}
            >
              <span className="w-8 text-center font-display text-lg font-bold text-muted-foreground">
                {i + 1}
              </span>
              <Avatar className="size-9">
                <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name ?? "Student"} />
                <AvatarFallback>{(p.full_name ?? "S").slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {p.full_name ?? "Student"}
                  {p.user_id === user?.id && (
                    <Badge variant="secondary" className="ml-2">
                      You
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{p.tests_taken} tests this week</p>
              </div>
              <span className="font-display text-lg font-bold text-primary">
                {Number(p.average_percentage).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
