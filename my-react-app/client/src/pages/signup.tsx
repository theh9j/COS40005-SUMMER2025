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

const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const strongEnough = (pw: string) =>
  pw.length >= 8 &&
  /[A-Za-z]/.test(pw) &&
  /\d/.test(pw);

export default function Signup() {
  const [, setLocation] = useLocation();
  const { signup, isLoading } = useAuth();
  const { toast } = useToast();

  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    role: Role | "";
    password: string;
    confirmPassword: string;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    password: "",
    confirmPassword: "",
  });

  const validate = () => {
    const e: FieldErrors = {};
    if (!formData.firstName.trim()) e.firstName = "First name is required.";
    if (!formData.lastName.trim()) e.lastName = "Last name is required.";

    if (!formData.email.trim()) e.email = "Email is required.";
    else if (!emailRegex.test(formData.email.trim()))
      e.email = "Enter a valid email address.";

    if (!formData.role) e.role = "Please select your role.";

    if (!formData.password) e.password = "Password is required.";
    else if (!strongEnough(formData.password))
      e.password = "Use at least 8 characters with letters and numbers.";

    if (!formData.confirmPassword) e.confirmPassword = "Please confirm your password.";
    else if (formData.password !== formData.confirmPassword)
      e.confirmPassword = "Passwords do not match.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const normalizeError = (err: unknown): string => {
    const fallback = "Unable to create your account. Please try again.";
    if (!navigator.onLine) return "You appear to be offline. Check your connection.";
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      if (msg.includes("409") || msg.includes("exists") || msg.includes("duplicate"))
        return "This email is already registered.";
      if (msg.includes("400") || msg.includes("validation"))
        return "Some details look invalid. Please review and try again.";
      if (msg.includes("429"))
        return "Too many attempts. Please wait a moment and try again.";
      if (msg.includes("network"))
        return "Network error. Please try again.";
      return err.message || fallback;
    }
    return fallback;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, form: undefined }));

    try {
      await signup({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role as Role,
      });

      toast({
        title: "Account created",
        description: "Welcome to the medical imaging platform!",
      });

      // useAuth.signup already redirects by role; this is a safety nudge
      setTimeout(() => {
        setLocation(formData.role === "student" ? "/student" : "/instructor");
      }, 100);
    } catch (error) {
      const message = normalizeError(error);
      setErrors({ form: message });
      toast({
        title: "Signup failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen medical-gradient flex items-center justify-center p-4"
      data-testid="signup-screen"
    >
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <UserPlus className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-card-foreground">Create Account</h1>
            <p className="text-muted-foreground mt-2">Join the learning community</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {errors.form && (
              <p className="text-sm text-red-600 -mt-2">{errors.form}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, firstName: e.target.value }))
                  }
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? "firstName-error" : undefined}
                  required
                  data-testid="input-firstname"
                />
                {errors.firstName && (
                  <p id="firstName-error" className="mt-1 text-xs text-red-600">
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, lastName: e.target.value }))
                  }
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? "lastName-error" : undefined}
                  required
                  data-testid="input-lastname"
                />
                {errors.lastName && (
                  <p id="lastName-error" className="mt-1 text-xs text-red-600">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@university.edu"
                value={formData.email}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, email: e.target.value }))
                }
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                required
                data-testid="input-email"
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-xs text-red-600">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: Role) =>
                  setFormData((p) => ({ ...p, role: value }))
                }
              >
                <SelectTrigger
                  className="mt-2"
                  aria-invalid={!!errors.role}
                  aria-describedby={errors.role ? "role-error" : undefined}
                  data-testid="select-role"
                >
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Medical Student</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p id="role-error" className="mt-1 text-xs text-red-600">
                  {errors.role}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, password: e.target.value }))
                }
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                required
                data-testid="input-password"
              />
              {errors.password && (
                <p id="password-error" className="mt-1 text-xs text-red-600">
                  {errors.password}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, confirmPassword: e.target.value }))
                }
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={
                  errors.confirmPassword ? "confirmPassword-error" : undefined
                }
                required
                data-testid="input-confirm-password"
              />
              {errors.confirmPassword && (
                <p id="confirmPassword-error" className="mt-1 text-xs text-red-600">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || isSubmitting}
              className="w-full bg-primary text-primary-foreground hover:opacity-90"
              data-testid="button-create-account"
            >
              {isLoading || isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>

            <div className="text-center">
              <span className="text-sm text-muted-foreground">
                Already have an account?{" "}
              </span>
              <Button
                variant="link"
                onClick={() => setLocation("/login")}
                className="text-sm text-primary p-0 h-auto"
                data-testid="link-login"
              >
                Sign in
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
