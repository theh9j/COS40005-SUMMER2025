import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import { useI18n } from "@/i18n";

type Role = "student" | "instructor";
type Field =
  | "firstName"
  | "lastName"
  | "email"
  | "role"
  | "password"
  | "confirmPassword"
  | "form";
type FieldErrors = Partial<Record<Field, string>>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongEnough = (pw: string) =>
  pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);

export default function Signup() {
  const [, setLocation] = useLocation();
  const { signup, isLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    password: "",
    confirmPassword: "",
  });

  const validate = () => {
    const e: FieldErrors = {};

    if (!formData.firstName.trim()) e.firstName = t("firstNameRequired");
    if (!formData.lastName.trim()) e.lastName = t("lastNameRequired");
    if (!formData.email.trim()) e.email = t("emailRequired");
    else if (!emailRegex.test(formData.email.trim()))
      e.email = t("invalidEmail");
    if (!formData.role) e.role = t("selectRole");
    if (!formData.password) e.password = t("passwordRequired");
    else if (!strongEnough(formData.password))
      e.password = t("passwordWeak");
    if (!formData.confirmPassword)
      e.confirmPassword = t("confirmPasswordRequired");
    else if (formData.password !== formData.confirmPassword)
      e.confirmPassword = t("passwordsDoNotMatch");

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      await signup({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role as Role,
      });

      toast({
        title: `${t("signupSuccessTitle")}, ${formData.firstName || ""}! 🎉`,
        description: t("signupSuccessDesc"),
      });

      setTimeout(() => {
        setLocation(formData.role === "student" ? "/student" : "/instructor");
      }, 100);
    } catch {
      toast({
        title: t("signupFailed"),
        description: t("signupFailedDesc"),
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
          <UserPlus className="h-6 w-6 text-primary" />
          <span className="font-semibold">{t("appName")}</span>
        </button>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <UserPlus className="h-12 w-12 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold">{t("createAccount")}</h1>
              <p className="text-muted-foreground mt-2">
                {t("joinCommunity")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("firstName")}</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <Label>{t("lastName")}</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label>{t("email")}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div>
                <Label>{t("role")}</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectRole")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">{t("student")}</SelectItem>
                    <SelectItem value="instructor">{t("instructor")}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-destructive">{errors.role}</p>
                )}
              </div>

              <div>
                <Label>{t("password")}</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  disabled={isSubmitting}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password}
                  </p>
                )}
              </div>

              <div>
                <Label>{t("confirmPassword")}</Label>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  disabled={isSubmitting}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting || isLoading
                  ? t("creatingAccount")
                  : t("signUp")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
