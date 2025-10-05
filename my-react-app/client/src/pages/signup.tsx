import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { signup, isLoading } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "" as "student" | "instructor" | "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (!formData.role) {
      toast({
        title: "Role required", 
        description: "Please select your role",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await signup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      
      toast({
        title: "Account created",
        description: "Welcome to the medical imaging platform!",
      });
      
      // Add a small delay to ensure auth state is updated before navigation
      setTimeout(() => {
        setLocation(formData.role === "student" ? "/student" : "/instructor");
      }, 100);
    } catch (error) {
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive",
      });
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
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium text-card-foreground">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="mt-2"
                  required
                  data-testid="input-firstname"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-medium text-card-foreground">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="mt-2"
                  required
                  data-testid="input-lastname"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-card-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@university.edu"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-2"
                required
                data-testid="input-email"
              />
            </div>
            
            <div>
              <Label htmlFor="role" className="text-sm font-medium text-card-foreground">
                Role
              </Label>
              <Select 
                value={formData.role} 
                onValueChange={(value: "student" | "instructor") => 
                  setFormData(prev => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger className="mt-2" data-testid="select-role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Medical Student</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-card-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="mt-2"
                required
                data-testid="input-password"
              />
            </div>
            
            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-card-foreground">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="mt-2"
                required
                data-testid="input-confirm-password"
              />
            </div>
            
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground hover:opacity-90"
              data-testid="button-create-account"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
            
            <div className="text-center">
              <span className="text-sm text-muted-foreground">Already have an account? </span>
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
