import { useState, useCallback } from "react";

export interface SubmissionFile {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface AnswerItem {
  index: number;
  value: any;
}

export interface SubmissionData {
  notes?: string;
  files?: SubmissionFile[];
  answers?: AnswerItem[];
}

export interface SubmissionResponse {
  submission_id: string;
  status: "none" | "submitted" | "grading" | "graded";
  score?: number;
  notes?: string;
  files?: SubmissionFile[];
  answers?: AnswerItem[];
  updated_at?: string;
}

const API_BASE = "http://localhost:8000/api";

export function useSubmission(homeworkId: string, caseId: string, userId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const submissionCacheKey =
    typeof window !== "undefined" && homeworkId && caseId && userId
      ? `submission_cache_${caseId}_${userId}_${homeworkId}`
      : "";

  const readSubmissionCache = (): SubmissionResponse | null => {
    if (!submissionCacheKey || typeof window === "undefined") return null;
    const raw = localStorage.getItem(submissionCacheKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SubmissionResponse;
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const writeSubmissionCache = (data: SubmissionResponse) => {
    if (!submissionCacheKey || typeof window === "undefined") return;
    localStorage.setItem(submissionCacheKey, JSON.stringify(data));
  };

  const getLatestSubmissionFromIndex = async (): Promise<SubmissionResponse | null> => {
    if (!homeworkId || !userId) return null;
    try {
      const res = await fetch(`${API_BASE}/instructor/submissions`, {
        credentials: "include",
      });
      if (!res.ok) return null;

      const rows = await res.json();
      if (!Array.isArray(rows)) return null;

      const matched = rows
        .filter((row: any) => {
          const sameStudent = String(row?.student_id || "") === userId;
          const sameHomework = String(row?.homework_id || "") === homeworkId;
          const sameCase = !caseId || String(row?.case_id || "") === caseId;
          return sameStudent && sameHomework && sameCase;
        })
        .sort((a: any, b: any) => {
          const at = new Date(a?.updated_at ?? a?.created_at ?? 0).getTime();
          const bt = new Date(b?.updated_at ?? b?.created_at ?? 0).getTime();
          return bt - at;
        });

      if (matched.length === 0) return null;

      const top = matched[0];
      return {
        submission_id: String(top?.id || ""),
        status: top?.score != null ? "graded" : (top?.status || "none"),
        score: top?.score ?? undefined,
        notes: top?.notes ?? undefined,
        files: Array.isArray(top?.files) ? top.files : undefined,
        answers: Array.isArray(top?.answers) ? top.answers : undefined,
        updated_at: top?.updated_at ?? top?.created_at,
      };
    } catch {
      return null;
    }
  };

  // Fetch current submission
  const fetchSubmission = useCallback(async () => {
    if (!homeworkId || !userId || !caseId) {
      console.warn("fetchSubmission: Missing parameters", { homeworkId, userId, caseId });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${API_BASE}/submissions/mine`);
      url.searchParams.append("homeworkId", homeworkId);
      url.searchParams.append("userId", userId);

      console.log("Fetching submission from:", url.toString());

      const res = await fetch(url.toString(), {
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`HTTP ${res.status}:`, errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      console.log("Submission loaded:", data);

      const normalizedMine: SubmissionResponse = {
        ...data,
        status: data?.score != null ? "graded" : (data?.status || "none"),
      };

      // If the dedicated endpoint is stale, reconcile using the aggregated submissions index.
      const shouldReconcile = normalizedMine.status === "none" || normalizedMine.status === "submitted";
      if (shouldReconcile) {
        const indexed = await getLatestSubmissionFromIndex();
        if (indexed) {
          const finalData = indexed;
          setSubmission(finalData);
          writeSubmissionCache(finalData);
          return;
        }
      }

      const hasServerSubmission = Boolean(normalizedMine.status && normalizedMine.status !== "none");
      if (hasServerSubmission) {
        setSubmission(normalizedMine);
        writeSubmissionCache(normalizedMine);
        return;
      }

      const cached = readSubmissionCache();
      setSubmission(cached ?? data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load submission";
      setError(message);
      console.error("Error fetching submission:", err);
      const cached = readSubmissionCache();
      if (cached) {
        setSubmission(cached);
      }
    } finally {
      setLoading(false);
    }
  }, [homeworkId, userId, caseId]);

  // Upload submission file
  const uploadFile = useCallback(
    async (file: File): Promise<SubmissionFile | null> => {
      if (!homeworkId || !userId) {
        return null;
      }
      try {
        const formData = new FormData();
        formData.append("file", file);

        // Build URL with query parameters for caseId, userId, type
        const url = new URL(`${API_BASE}/submissions/upload`);
        url.searchParams.append("homeworkId", homeworkId);
        url.searchParams.append("userId", userId);

        // Assuming there's an upload endpoint
        const res = await fetch(url.toString(), {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        return {
          name: file.name,
          url: data.url || URL.createObjectURL(file),
          type: file.type || "application/octet-stream",
          size: file.size,
        };
      } catch (err) {
        console.error("Error uploading file:", err);
        // Return a client-side object if server upload fails
        return {
          name: file.name,
          url: URL.createObjectURL(file),
          type: file.type || "application/octet-stream",
          size: file.size,
        };
      }
    },
    [homeworkId, userId]
  );

  // Create or update submission
  const submitHomework = useCallback(
    async (data: SubmissionData): Promise<SubmissionResponse | null> => {
      if (!homeworkId || !userId || !caseId) {
        const msg = "Missing required parameters";
        console.error(msg, { homeworkId, userId, caseId });
        setError(msg);
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const url = new URL(`${API_BASE}/submissions`);
        url.searchParams.append("homeworkId", homeworkId);
        url.searchParams.append("caseId", caseId);
        url.searchParams.append("userId", userId);

        console.log("Submitting homework to:", url.toString());
        console.log("Submission data:", data);

        const res = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include",
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`HTTP ${res.status}:`, errorText);
          throw new Error(errorText || `HTTP ${res.status}`);
        }

        const result = await res.json();
        console.log("Submission result:", result);
        const normalized: SubmissionResponse = result?.score != null
          ? { ...result, status: "graded" }
          : result;

        setSubmission(normalized);
        writeSubmissionCache(normalized);
        return normalized;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to submit homework";
        setError(message);
        console.error("Error submitting homework:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [homeworkId, caseId, userId]
  );

  return {
    submission,
    loading,
    error,
    fetchSubmission,
    uploadFile,
    submitHomework,
  };
}

