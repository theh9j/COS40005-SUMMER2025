import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { AuthService, User } from "@/lib/auth";
import { jwtDecode } from "jwt-decode";

interface AuthUser {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: "student" | "instructor";
  token?: string;
  password?: string;
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

  // Decode token from localStorage on load
  useEffect(() => {
    const token = localStorage.getItem("session_token");
    if (token) {
      try {
        const decoded: AuthUser = jwtDecode(token);
        decoded.token = token;
        setUser(decoded);
      } catch {
        localStorage.removeItem("session_token");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const { token } = await AuthService.login(email, password);
      if (!token) throw new Error("Login failed — missing token");

      const decoded: AuthUser = jwtDecode(token);
      decoded.token = token;

      localStorage.setItem("session_token", token);
      setUser(decoded);

      // Redirect based on role
      if (decoded.role === "student") setLocation("/student");
      else if (decoded.role === "instructor") setLocation("/instructor");

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

      localStorage.setItem("session_token", token);
      setUser(decoded);

      if (decoded.role === "student") setLocation("/student");
      else if (decoded.role === "instructor") setLocation("/instructor");
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
