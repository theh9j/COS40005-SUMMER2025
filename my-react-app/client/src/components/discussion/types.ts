export interface Reply {
  id: number;
  author: string;
  role: "Student" | "Instructor" | "Admin";
  content: string;
  timestamp: string;
}

export interface Thread {
  id: number;
  imageId: string;
  author: string;
  role: "Student" | "Instructor" | "Admin";
  content: string;
  timestamp: string;
  replies: Reply[];
}
