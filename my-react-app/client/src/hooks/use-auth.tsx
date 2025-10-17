import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { AuthService } from "@/lib/auth";
import { jwtDecode } from "jwt-decode";

interface AuthUser {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: "student" | "instructor" | "admin";
  token?: string;
  password?: string;
  /** For instructors: "approved" | "pending" | "rejected" (backend-defined) */
  approval_status?: string;
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

const SESSION_KEY = "session_token";
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Load session on mount
  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEY);
    if (token) {
      try {
        const decoded: AuthUser = jwtDecode(token);
        decoded.token = token;
        setUser(decoded);
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const redirectByRole = (decoded: AuthUser) => {
    if (decoded.role === "student") {
      setLocation("/student");
      return;
    }
    if (decoded.role === "instructor") {
      // Only push to instructor dashboard if approved, otherwise send to home
      if (decoded.approval_status === "approved") {
        setLocation("/instructor");
      } else {
        setLocation("/home");
      }
      return;
    }
    if (decoded.role === "admin") {
      setLocation("/admin");
      return;
    }
    // Fallback if role missing/unknown
    setLocation("/home");
  };

  const login = async (email: string, password: string): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const { token } = await AuthService.login(email, password);
      if (!token) throw new Error("Login failed — missing token");

      const decoded: AuthUser = jwtDecode(token);
      decoded.token = token;

      localStorage.setItem(SESSION_KEY, token);
      setUser(decoded);

      redirectByRole(decoded);
      return decoded;
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
      const { token } = await AuthService.signup(userData);
      if (!token) throw new Error("Signup failed — missing token");

      const decoded: AuthUser = jwtDecode(token);
      decoded.token = token;

      localStorage.setItem(SESSION_KEY, token);
      setUser(decoded);

      redirectByRole(decoded);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    try {
      AuthService.logout();
    } finally {
      localStorage.removeItem(SESSION_KEY);
      // small delay so any cleanup/toasts can finish
      setTimeout(() => {
        setUser(null);
        setLocation("/login");
      }, 50);
    }
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

export function useHeartbeat(userId?: string) {
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      fetch(`http://127.0.0.1:8000/activity/ping/${userId}`, { method: "POST" })
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, [userId]);
}
