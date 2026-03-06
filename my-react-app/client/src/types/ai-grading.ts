import type { Annotation } from "@shared/schema";

// ── Per-criterion AI suggestion ──
export interface AIRubricSuggestion {
  criterionId: string; // "correctness" | "completeness" | "presentation"
  levelKey: "excellent" | "good" | "fair" | "poor";
  score: number;
  reasoning: string;
  confidence: number; // 0..1
}

// ── Per-annotation comment ──
export interface AIAnnotationComment {
  annotationId: string;
  annotationLabel: string;
  comment: string;
  quality: "correct" | "partial" | "incorrect" | "missing-label";
}

// ── Full grading result for one submission ──
export interface AIGradingResult {
  submissionId: string;
  rubricSuggestions: AIRubricSuggestion[];
  totalScore: number;
  maxScore: number;
  overallConfidence: number;

  strengths: string[];
  weaknesses: string[];

  feedbackSuggestion: string;
  annotationComments: AIAnnotationComment[];
  improvementSuggestions: string[];
  encouragement: string;

  generatedAt: string; // ISO
  modelUsed: string;
  latencyMs: number;
}

// ── Batch grading ──
export interface BatchGradingJob {
  submissionIds: string[];
  status: "idle" | "running" | "complete" | "error";
  results: Record<string, AIGradingResult>;
  progress: number; // 0..1
  currentIndex: number;
  errors: Record<string, string>;
}

// ── Submission input for grading ──
export interface GradingSubmissionInput {
  id: string;
  studentAnswer?: string;
  annotations?: Annotation[];
  caseTitle?: string;
  caseDescription?: string;
  homeworkInstructions?: string;
}

// ── Rubric definition (mirrors RubricPanel) ──
export interface RubricCriterionDef {
  id: string;
  title: string;
  max: number;
  levels: Array<{
    key: string;
    label: string;
    points: number;
    desc: string;
  }>;
}
