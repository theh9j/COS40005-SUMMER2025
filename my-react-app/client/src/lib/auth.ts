import { User } from "@shared/schema";
import { mockUsers } from "./mock-data";

export class AuthService {
  private static readonly STORAGE_KEY = "medical_platform_user";

  static getCurrentUser(): User | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static setCurrentUser(user: User): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  }

  static clearCurrentUser(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static async login(email: string, password: string): Promise<User> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error("Invalid credentials");
    }
    
    this.setCurrentUser(user);
    return user;
  }

  static async signup(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: "student" | "instructor";
  }): Promise<User> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if user already exists
    if (mockUsers.find(u => u.email === userData.email)) {
      throw new Error("User already exists");
    }
    
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      ...userData,
      createdAt: new Date(),
    };
    
    mockUsers.push(newUser);
    this.setCurrentUser(newUser);
    return newUser;
  }

  static logout(): void {
    this.clearCurrentUser();
  }
}
