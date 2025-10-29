export interface Reply {
  id?: number;
  author?: string;
  role: "Student" | "Instructor" | "Admin";
  content: string;
  timestamp: string;
}

export type Tag = 'student' | 'teacher';

export interface Author {
  name: string;
  avatarUrl: string;
}

export interface Thread {
  id: string;
  author: Author;
  title: string;
  content: string;
  timestamp: string; 
  tags: Tag[];
  replyCount: number;
}
