import { User, MedicalCase, Annotation, Feedback } from "@shared/schema";

export const mockUsers: User[] = [
  {
    id: "1",
    email: "sarah.chen@university.edu",
    password: "password",
    firstName: "Sarah",
    lastName: "Chen",
    role: "student",
    createdAt: new Date(),
  },
  {
    id: "2",
    email: "dr.smith@university.edu", 
    password: "password",
    firstName: "John",
    lastName: "Smith",
    role: "instructor",
    createdAt: new Date(),
  },
];

export const mockCases: MedicalCase[] = [
  {
    id: "case-1",
    title: "Brain MRI - Stroke Case",
    description: "Acute stroke presentation with clear imaging findings",
    category: "Neurology",
    imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
    createdBy: "2",
    createdAt: new Date(),
  },
  {
    id: "case-2",
    title: "Chest X-ray - Pneumonia",
    description: "Community-acquired pneumonia case study",
    category: "Pulmonology", 
    imageUrl: "https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
    createdBy: "2",
    createdAt: new Date(),
  },
  {
    id: "case-3",
    title: "Cardiac CT - CAD",
    description: "Coronary artery disease evaluation",
    category: "Cardiology",
    imageUrl: "https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
    createdBy: "2",
    createdAt: new Date(),
  },
];

export const mockAnnotations: Annotation[] = [
  {
    id: "ann-1",
    caseId: "case-1",
    userId: "1",
    type: "circle",
    coordinates: { x: 250, y: 150, radius: 30 },
    color: "#ef4444",
    label: "Lesion Area",
    createdAt: new Date(),
  },
  {
    id: "ann-2", 
    caseId: "case-1",
    userId: "1",
    type: "rectangle",
    coordinates: { x: 350, y: 200, width: 40, height: 25 },
    color: "#3b82f6",
    label: "Ventricle",
    createdAt: new Date(),
  },
];

export const mockFeedback: Feedback[] = [
  {
    id: "fb-1",
    annotationId: "ann-1",
    instructorId: "2",
    studentId: "1",
    message: "Great work identifying the lesion! Consider the surrounding tissue changes.",
    type: "praise",
    createdAt: new Date(),
  },
  {
    id: "fb-2",
    annotationId: "ann-1", 
    instructorId: "2",
    studentId: "1",
    message: "Consider adding annotations for the midline shift caused by the lesion.",
    type: "suggestion",
    createdAt: new Date(),
  },
];

export const mockChatMessages = [
  {
    id: "msg-1",
    userId: "2",
    userName: "Dr. Smith",
    avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=32&h=32",
    message: "Great work identifying the lesion! Consider the surrounding edema as well.",
    timestamp: new Date(Date.now() - 300000),
  },
  {
    id: "msg-2",
    userId: "1", 
    userName: "You",
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=32&h=32",
    message: "Thank you! Should I annotate the edema separately?",
    timestamp: new Date(Date.now() - 180000),
  },
];

export const mockActivityFeed = [
  {
    id: "act-1",
    type: "annotation",
    message: "Added lesion annotation",
    timestamp: new Date(Date.now() - 120000),
    color: "green",
  },
  {
    id: "act-2",
    type: "annotation", 
    message: "Marked ventricle area",
    timestamp: new Date(Date.now() - 300000),
    color: "blue",
  },
  {
    id: "act-3",
    type: "user",
    message: "Dr. Smith joined session",
    timestamp: new Date(Date.now() - 600000),
    color: "yellow",
  },
];
