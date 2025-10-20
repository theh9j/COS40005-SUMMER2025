export type Role = "Student" | "Instructor" | "Admin";


export interface Version {
  id: string;
  caseId: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  data: {
    boxes?: any[];
    polygons?: any[];
    masks?: any;
    notes?: string;
  };
}

export interface Presence {
  caseId: string;
  users: { id: string; name: string; role: Role }[];
  updatedAt: string;
}
