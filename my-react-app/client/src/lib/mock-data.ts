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

export const mockPerformanceData = [
  { week: "Week 1", score: 72 },
  { week: "Week 2", score: 78 },
  { week: "Week 3", score: 75 },
  { week: "Week 4", score: 82 },
  { week: "Week 5", score: 85 },
  { week: "Week 6", score: 88 },
  { week: "Week 7", score: 91 },
];

export const mockUpcomingAssignments = [
  {
    id: "assign-1",
    title: "Chest X-Ray Analysis",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    priority: "high",
    category: "Pulmonology",
    status: "pending",
  },
  {
    id: "assign-2",
    title: "Abdominal CT Review",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    priority: "medium",
    category: "Radiology",
    status: "pending",
  },
  {
    id: "assign-3",
    title: "MRI Brain Tumor Case",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    priority: "medium",
    category: "Neurology",
    status: "pending",
  },
];

export const mockAtRiskStudents = [
  {
    id: "risk-1",
    name: "David Tran",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40",
    issue: "Low completion rate (45%)",
    score: 68,
    trend: "declining",
    lastActive: "3 days ago",
  },
  {
    id: "risk-2",
    name: "Emma Wilson",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40",
    issue: "Missed last 3 assignments",
    score: 72,
    trend: "stable",
    lastActive: "5 days ago",
  },
  {
    id: "risk-3",
    name: "James Lee",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40",
    issue: "Accuracy below 70%",
    score: 65,
    trend: "declining",
    lastActive: "1 day ago",
  },
];
