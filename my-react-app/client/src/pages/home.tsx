import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth, useHeartbeat } from "@/hooks/use-auth";
import { FolderOpen, Sparkles, GraduationCap, ClipboardCheck, Gauge } from "lucide-react";
import { useI18n } from "@/i18n";
import GlobalHeader from "@/components/global-header";

export default function Home() {
  const { user, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useI18n();

  useHeartbeat(user?.user_id);

  useEffect(() => {
    console.log("Current user in dashboard:", user);
  }, [user]);

  const goDashboard = () => {
    if (!user) return setLocation("/login");
    if (user.role === "student") return setLocation("/student");
    if (user.role === "instructor") return setLocation("/instructor");
  };

  return (
    <div className="min-h-screen silver-ambient">
      <GlobalHeader />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="overflow-hidden border-0 bg-card shadow-sm">
            <CardContent className="p-8 md:p-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Smarter homework, grading, and annotation workflows
              </div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
                Build, grade, and review medical imaging homework in one place
              </h1>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                Create Q&amp;A and annotation assignments, manage grading, and give students a cleaner workflow from case library to feedback.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={goDashboard} size="lg">
                  <Gauge className="mr-2 h-4 w-4" />
                  {user ? "Open dashboard" : t("getStarted")}
                </Button>
                <Button variant="outline" size="lg" onClick={() => setLocation(user ? "/student" : "/login")}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  {t("caseLibrary")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-2"><ClipboardCheck className="h-5 w-5 text-primary" /></div>
                  <div>
                    <h2 className="font-semibold">For instructors</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Create homework, manage submissions, and improve grading pages with less friction.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-2"><GraduationCap className="h-5 w-5 text-primary" /></div>
                  <div>
                    <h2 className="font-semibold">For students</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Review cases, answer homework, annotate images, and keep everything in one submission flow.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold">Quick links</h2>
                <div className="mt-4 grid gap-3">
                  <Button variant="secondary" className="justify-start" onClick={goDashboard}>
                    <Gauge className="mr-2 h-4 w-4" />
                    {user?.role === "instructor" ? t("instructorDashboard") : t("studentDashboard")}
                  </Button>
                  <Button variant="secondary" className="justify-start" onClick={() => setLocation(user ? "/student" : "/login")}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    {t("caseLibrary")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
