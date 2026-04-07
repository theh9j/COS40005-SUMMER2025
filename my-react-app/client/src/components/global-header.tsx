import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Stethoscope, Gauge, LogIn, LogOut } from "lucide-react";
import { useI18n } from "@/i18n";

export default function GlobalHeader() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useI18n();

  const goDashboard = () => {
    if (!user) return setLocation("/login");
    if (user.role === "student") return setLocation("/student");
    if (user.role === "instructor") return setLocation("/instructor");
    if (user.role === "admin") return setLocation("/admin");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold">{t("appName")}</div>
            <div className="text-xs text-muted-foreground">Medical imaging learning workspace</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Button variant="outline" onClick={goDashboard}>
                <Gauge className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="ghost" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t("logout")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setLocation("/login")}>
                <LogIn className="mr-2 h-4 w-4" />
                {t("signIn")}
              </Button>
              <Button onClick={() => setLocation("/signup")}>{t("createAccount")}</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}