import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { UserRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";

type FieldErrors = Partial<Record<"email" | "password", string>>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const { t } = useI18n();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setFormData((prev) => ({
        ...prev,
        email: rememberedEmail,
        rememberMe: true,
      }));
    }
  }, []);

  const validate = () => {
    const next: FieldErrors = {};
    if (!formData.email.trim()) next.email = t("email") + " is required.";
    else if (!emailRegex.test(formData.email.trim()))
      next.email = "Enter a valid email address.";
    if (!formData.password) next.password = t("password") + " is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const normalizeError = (err: unknown): string => {
    if (!navigator.onLine)
      return "You appear to be offline. Check your connection.";
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      if (msg.includes("401") || msg.includes("invalid") || msg.includes("credentials"))
        return "Email or password is incorrect.";
      if (msg.includes("429"))
        return "Too many attempts. Please wait and try again.";
      if (msg.includes("network"))
        return "Network error. Please try again.";
      return err.message;
    }
    return "Unable to sign in. Please try again.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await login(formData.email.trim(), formData.password);

      if (formData.rememberMe) {
        localStorage.setItem("rememberedEmail", formData.email.trim());
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      toast({
        title: t("signIn"),
        description: "Welcome back! Redirecting to your dashboard...",
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: normalizeError(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen medical-gradient flex flex-col">
      {/* Navbar */}
      <header className="bg-card border-b border-border h-16 px-6 flex items-center">
        <button
          onClick={() => setLocation("/home")}
          className="flex items-center space-x-3 hover:opacity-80 transition"
        >
          <UserRound className="h-6 w-6 text-primary" />
          <span className="font-semibold">{t("appName")}</span>
        </button>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <UserRound className="h-12 w-12 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold">
                {t("signIn")}
              </h1>
              <p className="text-muted-foreground mt-2">
                Collaborative Learning Environment
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              <div>
                <Label>{t("email")}</Label>
                <Input
                  type="email"
                  placeholder={t("email")}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <Label>{t("password")}</Label>
                <Input
                  type="password"
                  placeholder={t("password")}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, rememberMe: !!checked }))
                    }
                  />
                  <Label>{t("rememberMe")}</Label>
                </div>
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  type="button"
                  onClick={() => setLocation("/signup")}
                >
                  {t("createAccount")}
                </Button>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? t("saving") : t("signIn")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
