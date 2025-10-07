// src/lib/auth.ts
export interface User {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: "student" | "instructor";
  token?: string;
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "student" | "instructor";
}

const API_URL = "http://127.0.0.1:8000/auth";

// Helper: Save / Load / Remove user from localStorage
function saveUser(user: User) {
  localStorage.setItem("user", JSON.stringify(user));
}

function getCurrentUser(): User | null {
  const data = localStorage.getItem("user");
  return data ? JSON.parse(data) : null;
}

function removeUser() {
  localStorage.removeItem("user");
}

export const AuthService = {
  /**
   * Signup new user
   */
  async signup(userData: SignupData): Promise<User> {
    const res = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.detail || "Signup failed");
    }

    // Construct user object expected by use-auth
    const user: User = {
      email: data.email || userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      token: data.token,
    };

    saveUser(user);
    return user;
  },

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<User> {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.detail || "Invalid credentials");
    }

    const user: User = {
      email,
      role: data.role,
      token: data.token,
    };

    saveUser(user);
    return user;
  },

  /**
   * Logout user
   */
  logout() {
    removeUser();
  },

  /**
   * Get current user (from localStorage)
   */
  getCurrentUser,
};
