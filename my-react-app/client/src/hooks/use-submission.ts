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
      setSubmission(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load submission";
      setError(message);
      console.error("Error fetching submission:", err);
    } finally {
      setLoading(false);
    }
  }, [homeworkId, userId, caseId]);

  // Upload submission file
  const uploadFile = useCallback(
    async (file: File): Promise<SubmissionFile | null> => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        // Build URL with query parameters for caseId, userId, type
        const url = new URL(`${API_BASE}/upload`);
        url.searchParams.append("caseId", caseId);
        url.searchParams.append("userId", userId);
        url.searchParams.append("type", "submission");

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
    [caseId, userId]
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
        setSubmission(result);
        return result;
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
