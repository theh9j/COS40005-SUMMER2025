import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth, useHeartbeat } from "@/hooks/use-auth";
import { Stethoscope, FolderOpen, Gauge, LogIn, LogOut } from "lucide-react";
import { useI18n } from "@/i18n";

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
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="bg-card border-b border-border h-16 px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <Stethoscope className="h-6 w-6 text-primary" />
          <span className="font-semibold">{t("appName")}</span>
        </div>

        <nav className="flex items-center space-x-2">
          <Button
            variant="ghost"
            onClick={goDashboard}
            className="hidden sm:inline-flex"
          >
            <Gauge className="h-4 w-4 mr-2" />
            {t("dashboard")}
          </Button>

          <Button
            variant="ghost"
            onClick={() =>
              user ? setLocation("/student") : setLocation("/login")
            }
            className="hidden sm:inline-flex"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            {t("cases")}
          </Button>

          {!user ? (
            <Button onClick={() => setLocation("/login")}>
              <LogIn className="h-4 w-4 mr-2" />
              {t("signIn")}
            </Button>
          ) : (
            <Button variant="secondary" onClick={logout} disabled={isLoading}>
              <LogOut className="h-4 w-4 mr-2" />
              {t("logout")}
            </Button>
          )}
        </nav>
      </header>

      {/* Hero */}
      <main className="px-6 py-10 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="border">
            <CardContent className="p-8">
              <h1 className="text-3xl font-bold mb-3">
                {t("heroTitle")}
              </h1>
              <p className="text-muted-foreground mb-6">
                {t("heroDescription")}
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={goDashboard}
                  className="bg-primary text-primary-foreground"
                >
                  {t("getStarted")}
                </Button>
                {!user && (
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/signup")}
                  >
                    {t("createAccount")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-8 space-y-4">
              <h2 className="text-xl font-semibold">
                {t("quickLinks")}
              </h2>

              <div className="grid sm:grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  className="justify-start"
                  onClick={goDashboard}
                >
                  <Gauge className="h-4 w-4 mr-2" />
                  {user?.role === "instructor"
                    ? t("instructorDashboard")
                    : t("studentDashboard")}
                </Button>

                <Button
                  variant="secondary"
                  className="justify-start"
                  onClick={() =>
                    user ? setLocation("/student") : setLocation("/login")
                  }
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  {t("caseLibrary")}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {t("tipNavbar")}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
