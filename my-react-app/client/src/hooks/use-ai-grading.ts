import { useCallback, useMemo, useRef, useState } from "react";
import { aiService } from "@/lib/ai-service";
import type {
  AIGradingResult,
  BatchGradingJob,
  GradingSubmissionInput,
  RubricCriterionDef,
} from "@/types/ai-grading";
import type { Annotation } from "@shared/schema";

export type AiSuggestionCompat = {
  picks: { id: string; levelKey: "excellent" | "good" | "fair" | "poor" }[];
  total: number;
  confidence?: number;
  note?: string;
};

export function useAIGrading() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<AIGradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchJob, setBatchJob] = useState<BatchGradingJob | null>(null);

  const cancelRef = useRef(false);

  // ── Single submission analysis ──
  const analyzeSubmission = useCallback(
    async (
      submissionId: string,
      annotations: Annotation[],
      studentAnswer: string | undefined,
      rubricDef: RubricCriterionDef[],
      caseTitle?: string,
      caseDescription?: string,
      homeworkInstructions?: string
    ) => {
      setIsAnalyzing(true);
      setError(null);
      try {
        const input: GradingSubmissionInput = {
          id: submissionId,
          annotations,
          studentAnswer,
          caseTitle,
          caseDescription,
          homeworkInstructions,
        };
        const result = await aiService.gradeSubmission(input, rubricDef);
        setCurrentResult(result);
        return result;
      } catch (err: any) {
        const msg = err?.message || "AI grading failed";
        setError(msg);
        return null;
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  // ── Convert result to RubricPanel-compatible format (memoized for stable reference) ──
  const rubricSuggestion = useMemo((): AiSuggestionCompat | null => {
    if (!currentResult) return null;
    return {
      picks: currentResult.rubricSuggestions.map((s) => ({
        id: s.criterionId,
        levelKey: s.levelKey,
      })),
      total: currentResult.totalScore,
      confidence: currentResult.overallConfidence,
      note: `AI suggested. Review and adjust.`,
    };
  }, [currentResult]);

  // ── Extract feedback text ──
  const applyFeedback = useCallback((): string => {
    if (!currentResult) return "";
    return currentResult.feedbackSuggestion;
  }, [currentResult]);

  const clearResult = useCallback(() => {
    setCurrentResult(null);
    setError(null);
  }, []);

  // ── Batch grading ──
  const startBatchGrading = useCallback(
    async (
      submissions: Array<{
        id: string;
        annotations: Annotation[];
        studentAnswer?: string;
        caseTitle?: string;
      }>,
      rubricDef: RubricCriterionDef[]
    ) => {
      cancelRef.current = false;

      const job: BatchGradingJob = {
        submissionIds: submissions.map((s) => s.id),
        status: "running",
        results: {},
        progress: 0,
        currentIndex: 0,
        errors: {},
      };
      setBatchJob({ ...job });

      for (let i = 0; i < submissions.length; i++) {
        if (cancelRef.current) {
          setBatchJob((prev) => (prev ? { ...prev, status: "idle" } : null));
          return;
        }

        const sub = submissions[i];
        job.currentIndex = i;
        job.progress = i / submissions.length;
        setBatchJob({ ...job });

        try {
          const input: GradingSubmissionInput = {
            id: sub.id,
            annotations: sub.annotations,
            studentAnswer: sub.studentAnswer,
            caseTitle: sub.caseTitle,
          };
          const result = await aiService.gradeSubmission(input, rubricDef);
          job.results[sub.id] = result;
        } catch (err: any) {
          job.errors[sub.id] = err?.message || "Failed";
        }

        // Small delay to avoid rate limits
        if (i < submissions.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      job.status = Object.keys(job.errors).length > 0 ? "error" : "complete";
      job.progress = 1;
      setBatchJob({ ...job });
    },
    []
  );

  const cancelBatchGrading = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const getBatchResult = useCallback(
    (submissionId: string): AIGradingResult | null => {
      return batchJob?.results[submissionId] ?? null;
    },
    [batchJob]
  );

  const clearBatch = useCallback(() => {
    setBatchJob(null);
  }, []);

  return {
    // Single
    isAnalyzing,
    currentResult,
    error,
    analyzeSubmission,
    rubricSuggestion,
    applyFeedback,
    clearResult,
    // Batch
    batchJob,
    startBatchGrading,
    cancelBatchGrading,
    getBatchResult,
    clearBatch,
  };
}
