export type Tag = 'TestTag1' | 'TestTag2';

export interface Reply {
  id: string;
  author: Author;
  role?: "student" | "instructor" | "admin";  
  content: string;
  timestamp: string;
}

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
  replies: Reply[];
}