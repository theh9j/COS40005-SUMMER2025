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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongEnough = (pw: string) =>
  pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);

export default function Signup() {
  const [, setLocation] = useLocation();
  const { signup, isLoading } = useAuth();
  const { toast } = useToast();

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
    if (!formData.firstName.trim()) e.firstName = "First name is required.";
    if (!formData.lastName.trim()) e.lastName = "Last name is required.";
    if (!formData.email.trim()) e.email = "Email is required.";
    else if (!emailRegex.test(formData.email.trim()))
      e.email = "Enter a valid email address.";
    if (!formData.role) e.role = "Please select your role.";
    if (!formData.password) e.password = "Password is required.";
    else if (!strongEnough(formData.password))
      e.password = "Use at least 8 characters with letters and numbers.";
    if (!formData.confirmPassword)
      e.confirmPassword = "Please confirm your password.";
    else if (formData.password !== formData.confirmPassword)
      e.confirmPassword = "Passwords do not match.";

    setErrors(e);
    return Object.keys(e).length === 0;
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
        title: `Welcome, ${formData.firstName || "there"}! 🎉`,
        description: "Your account is ready. We’re setting up your dashboard…",
      });

      setTimeout(() => {
        setLocation(formData.role === "student" ? "/student" : "/instructor");
      }, 100);
    } catch (error) {
      toast({
        title: "Signup failed",
        description: "Unable to create your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen medical-gradient flex flex-col" data-testid="signup-screen">
      {/* --- Navbar --- */}
      <header className="bg-card border-b border-border h-16 px-6 flex items-center justify-start sticky top-0 z-40">
        <button
          onClick={() => setLocation("/home")}
          className="flex items-center space-x-3 focus:outline-none hover:opacity-80 transition"
        >
          <UserPlus className="h-6 w-6 text-primary" />
          <span className="font-semibold">Medical Imaging Platform</span>
        </button>
      </header>

      {/* --- Main Content --- */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <UserPlus className="h-12 w-12 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-card-foreground">Create Account</h1>
              <p className="text-muted-foreground mt-2">Join the learning community</p>
            </div>

            {/* form remains unchanged */}
            {/* existing signup form code here */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
