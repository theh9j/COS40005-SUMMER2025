export type Role = "Student" | "Instructor" | "Admin";

export interface CaseItem {
  id: string;
  title: string;
  modality: "XRay" | "CT" | "MRI";
  ownerId: string;
  ownerName: string;
  sharedTo: string[];
  createdAt: string;
  updatedAt: string;
  imageUrl: string;
}

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
