import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { AuthService } from "@/lib/auth";

interface AuthUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: "student" | "instructor";
  token?: string;
  createdAt?: Date;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: "student" | "instructor";
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("user");
      }
    } else {
      const token = localStorage.getItem("session_token");
      const role = localStorage.getItem("user_role") as "student" | "instructor" | null;
      if (token && role) setUser({ token, role });
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const loggedInUser = await AuthService.login(email, password);

      if (!loggedInUser?.token) {
        console.error("Login failed — missing token");
        setUser(null);
        throw new Error("Login failed — missing token");
      }

      // Save to storage
      localStorage.setItem("session_token", loggedInUser.token);
      if (loggedInUser.role) localStorage.setItem("user_role", loggedInUser.role);
      localStorage.setItem("user", JSON.stringify(loggedInUser));

      // Update context state
      setUser(loggedInUser);
      console.log("Logged in user:", loggedInUser);

      // Navigate after successful login
      if (loggedInUser.role === "student") {
        setLocation("/student");
      } else if (loggedInUser.role === "instructor") {
        setLocation("/instructor");
      }

      return loggedInUser;
    } catch (error) {
      console.error("Login error:", error);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };



  const signup = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: "student" | "instructor";
  }) => {
    setIsLoading(true);
    try {
      const newUser = await AuthService.signup(userData);
      localStorage.setItem("session_token", newUser.token || "");
      if (newUser.role) localStorage.setItem("user_role", newUser.role);
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser(newUser);

      // Auto-redirect after signup
      if (newUser.role === "student") {
        setLocation("/student");
      } else if (newUser.role === "instructor") {
        setLocation("/instructor");
      }

    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log("Logging out...");
    AuthService.logout();
    localStorage.clear();
    setTimeout(() => {
      setUser(null);
      setLocation("/login");
    }, 50);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
