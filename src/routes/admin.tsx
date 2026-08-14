import { noIndexTags } from "@/lib/seo";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, ShieldCheck, Users } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionImport } from "@/components/admin/QuestionImport";
import { QuestionBank } from "@/components/admin/QuestionBank";
import { TestBuilder } from "@/components/admin/TestBuilder";
import { StudentsPanel } from "@/components/admin/StudentsPanel";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console — CEE Prep Nepal" },
      { name: "description", content: "Admin console for importing CEE questions, building tests and tracking students." },
      { property: "og:title", content: "Admin Console — CEE Prep Nepal" },
      { property: "og:description", content: "Manage the CEE question bank, mock tests and students." },
      ...noIndexTags().meta,
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_stats");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-md px-4 py-24 text-center">
          <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This console is restricted to the exam administrator account.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold">Admin console</h1>
        <p className="mt-1 text-muted-foreground">Import questions, build papers and track student performance.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <StatTile icon={BookOpen} label="Questions" value={stats?.total_questions ?? 0} />
          <StatTile icon={FileText} label="Tests" value={stats?.total_tests ?? 0} />
          <StatTile icon={Users} label="Students" value={stats?.total_students ?? 0} />
          <StatTile icon={ShieldCheck} label="Attempts" value={stats?.total_attempts ?? 0} />
        </div>

        <Tabs defaultValue="import" className="mt-8">
          <TabsList>
            <TabsTrigger value="import">Bulk import</TabsTrigger>
            <TabsTrigger value="bank">Question bank</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
          </TabsList>
          <TabsContent value="import" className="mt-6">
            <QuestionImport />
          </TabsContent>
          <TabsContent value="bank" className="mt-6">
            <QuestionBank />
          </TabsContent>
          <TabsContent value="tests" className="mt-6">
            <TestBuilder />
          </TabsContent>
          <TabsContent value="students" className="mt-6">
            <StudentsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <Card className="card-elevated">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
