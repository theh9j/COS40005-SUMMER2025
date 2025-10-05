import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { UserRound } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, isLoading } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const handleSubmit = async (e: React.FormEvent, role?: "student" | "instructor") => {
    e.preventDefault();
    
    try {
      // Use demo credentials based on role
      const email = role === "student" 
        ? "sarah.chen@university.edu" 
        : "dr.smith@university.edu";
      
      await login(email, "password");
      
      toast({
        title: "Login successful",
        description: `Welcome back! Redirecting to ${role} dashboard...`,
      });
      
      // Add a small delay to ensure auth state is updated before navigation
      setTimeout(() => {
        setLocation(role === "student" ? "/student" : "/instructor");
      }, 100);
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
    }
  };

  return (
    <div 
      className="min-h-screen medical-gradient flex items-center justify-center p-4"
      data-testid="login-screen"
    >
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <UserRound className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-card-foreground">Medical Imaging Platform</h1>
            <p className="text-muted-foreground mt-2">Collaborative Learning Environment</p>
          </div>
          
          <form className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-card-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-2"
                data-testid="input-email"
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-card-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="mt-2"
                data-testid="input-password"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={formData.rememberMe}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, rememberMe: !!checked }))
                  }
                  data-testid="checkbox-remember"
                />
                <Label htmlFor="remember" className="text-sm text-muted-foreground">
                  Remember me
                </Label>
              </div>
              <Button variant="link" className="text-sm text-primary p-0 h-auto">
                Forgot password?
              </Button>
            </div>
            
            <div className="space-y-3">
              <Button
                type="button"
                onClick={(e) => handleSubmit(e, "student")}
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground hover:opacity-90"
                data-testid="button-student-login"
              >
                {isLoading ? "Signing in..." : "Sign in as Student"}
              </Button>
              <Button
                type="button"
                onClick={(e) => handleSubmit(e, "instructor")}
                disabled={isLoading}
                className="w-full bg-accent text-accent-foreground hover:opacity-90"
                data-testid="button-instructor-login"
              >
                {isLoading ? "Signing in..." : "Sign in as Instructor"}
              </Button>
            </div>
            
            <div className="text-center">
              <span className="text-sm text-muted-foreground">Don't have an account? </span>
              <Button
                variant="link"
                onClick={() => setLocation("/signup")}
                className="text-sm text-primary p-0 h-auto"
                data-testid="link-signup"
              >
                Sign up
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
