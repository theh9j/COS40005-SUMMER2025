import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { AuthService } from "@/lib/auth";
import { jwtDecode } from "jwt-decode";

interface AuthUser {
  user_id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: "student" | "instructor" | "admin";
  token?: string;
  approval_status?: string;
  profile_photo?: string;  // ✅ change to this
  dob?: string;
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
  updateUser: (data: { firstName: string; lastName: string; dob?: string }) => Promise<AuthUser>;
}

const SESSION_KEY = "session_token";
const API_URL = "http://127.0.0.1:8000/api/user";
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Load session on mount and check status if instructor
  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEY);
    if (token) {
      const loadUser = async () => {
        setIsLoading(true);
        try {
          let decoded: AuthUser = jwtDecode(token);
          decoded.token = token;

          // If the user is an instructor, fetch their latest approval status
          if (decoded.role === "instructor") {
            const res = await fetch(`${API_URL}/approval-status?token=${token}`);
            if (res.ok) {
              const data = await res.json();
              decoded.approval_status = data.approval_status;
            } else {
              decoded.approval_status = "pending"; // Default or error state
            }
          }
          setUser(decoded);
        } catch {
          // If token is invalid, clear session
          localStorage.removeItem(SESSION_KEY);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      };
      loadUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const redirectByRole = (decoded: AuthUser) => {
    if (decoded.role === "student") {
      setLocation("/student");
      return;
    }
    if (decoded.role === "instructor") {
      // Only push to instructor dashboard if verified, otherwise send to home
      if (decoded.approval_status === "verified") {
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

      let decoded: AuthUser = jwtDecode(token);
      decoded.token = token;

      if (decoded.role === "instructor") {
        const res = await fetch(`${API_URL}/approval-status?token=${token}`);
        const data = await res.json();
        decoded.approval_status = data.approval_status;
      }

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

      let decoded: AuthUser = jwtDecode(token);
      decoded.token = token;

      if (decoded.role === "instructor") {
        const res = await fetch(`${API_URL}/approval-status?token=${token}`);
        const data = await res.json();
        decoded.approval_status = data.approval_status;
      }

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
  
  const updateUser = async (
    data: { firstName: string; lastName: string; dob?: string },
    avatarFile?: File
  ): Promise<AuthUser> => {

    if (!user?.token) throw new Error("No user token found");

    setIsLoading(true);

    try {
      // 1️⃣ Update text fields
      const response = await fetch(`${API_URL}/update?token=${user.token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update user");
      }

      let { token: currentToken } = await response.json();
      if (!currentToken) throw new Error("Missing token after update");

      // 2️⃣ Upload avatar if provided
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);

        const photoRes = await fetch(
          `${API_URL}/upload-profile-photo?token=${currentToken}`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!photoRes.ok) {
          // don't overwrite the token if upload failed – keep the existing one
          throw new Error("Avatar upload failed");
        }

        const photoData = await photoRes.json().catch(() => ({}));
        if (photoData.token) {
          currentToken = photoData.token; // 🔥 overwrite with newest token
        } else {
          console.warn("[updateUser] upload response did not include token, preserving previous token");
        }
      }

      // 3️⃣ Decode final token (ONLY ONCE) and guard against nonsense
      let finalDecoded: AuthUser;
      try {
        finalDecoded = jwtDecode(currentToken) as AuthUser;
      } catch (err) {
        console.error("[updateUser] failed to decode token", err);
        // if decoding fails, fall back to existing user without changing session
        if (user) {
          localStorage.setItem(SESSION_KEY, user.token || "");
          return user;
        }
        throw new Error("Invalid token returned by server");
      }

      if (!finalDecoded || typeof finalDecoded !== "object") {
        console.error("[updateUser] jwtDecode returned unexpected value", finalDecoded);
        if (user) {
          localStorage.setItem(SESSION_KEY, user.token || "");
          return user;
        }
        throw new Error("Invalid token returned by server");
      }

      // Merge with existing user so we don't drop fields that aren't encoded
      if (user) {
        finalDecoded = { ...user, ...finalDecoded };
      }

      // ensure role stays defined
      if (!finalDecoded.role && user?.role) {
        finalDecoded.role = user.role;
      }
      if (user?.role && finalDecoded.role !== user.role) {
        console.warn(
          `[updateUser] role changed from ${user.role} to ${finalDecoded.role}, preserving old value`
        );
        finalDecoded.role = user.role;
      }

      finalDecoded.token = currentToken;

      localStorage.setItem(SESSION_KEY, currentToken);
      setUser(finalDecoded);

      return finalDecoded;

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateUser }}>
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