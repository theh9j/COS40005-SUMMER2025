import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileUp, X, Send, Loader2, CheckCircle } from "lucide-react";
import { SubmissionFile } from "@/hooks/use-submission";

interface SubmissionPanelProps {
  status: "none" | "submitted" | "grading" | "graded";
  dueDate?: string;
  score?: number;
  notes?: string;
  files?: SubmissionFile[];
  onSubmit: (notes: string, files: SubmissionFile[]) => Promise<void>;
  onUploadFile: (file: File) => Promise<SubmissionFile | null>;
  loading?: boolean;
  error?: string | null;
  closed?: boolean;
}

export default function SubmissionPanel({
  status,
  dueDate,
  score,
  notes: initialNotes = "",
  files: initialFiles = [],
  onSubmit,
  onUploadFile,
  loading = false,
  error = null,
  closed = false,
}: SubmissionPanelProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [files, setFiles] = useState<SubmissionFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(status !== "none");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const daysLeft = dueDate
    ? Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isDueSoon = daysLeft !== null && daysLeft <= 2 && daysLeft > 0;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const uploaded = await onUploadFile(file);
        if (uploaded) {
          setFiles((prev) => [...prev, uploaded]);
        }
      }
    } finally {
      setUploading(false);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      await onSubmit(notes, files);
      setSubmitted(true);
    } catch (err) {
      console.error("Submission failed:", err);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "graded":
        return "bg-green-100 border-green-300";
      case "grading":
        return "bg-yellow-100 border-yellow-300";
      case "submitted":
        return "bg-blue-100 border-blue-300";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "graded":
        return "Graded";
      case "grading":
        return "Grading in Progress";
      case "submitted":
        return "Submitted";
      default:
        return "Not Submitted";
    }
  };

  if (closed && status === "graded") {
    return (
      <Card className={`border-2 ${getStatusColor()}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Assignment Complete
            </CardTitle>
            <Badge variant="default">Score: {score}/10</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-white rounded border">
            <p className="text-sm font-medium mb-2">Your Submission:</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
            {files.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium mb-2">Attached Files:</p>
                <div className="space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="text-xs text-muted-foreground">
                      • {f.name} ({(f.size / 1024).toFixed(1)} KB)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${getStatusColor()}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Homework Submission</CardTitle>
          <Badge variant={status === "grading" ? "secondary" : status === "graded" ? "default" : "outline"}>
            {getStatusLabel()}
          </Badge>
        </div>

        {/* Due date info */}
        {dueDate && (
          <div className="flex items-center gap-2 mt-2 text-sm">
            {isOverdue && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>Past due date</span>
              </div>
            )}
            {isDueSoon && !isOverdue && (
              <div className="flex items-center gap-1 text-orange-600">
                <AlertCircle className="h-4 w-4" />
                <span>Due in {daysLeft} day{daysLeft !== 1 ? "s" : ""}</span>
              </div>
            )}
            {!isOverdue && !isDueSoon && daysLeft !== null && daysLeft > 0 && (
              <span className="text-muted-foreground">Due in {daysLeft} day{daysLeft !== 1 ? "s" : ""}</span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Notes/Answer textarea */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Answer / Notes</label>
          <Textarea
            placeholder="Type your submission notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={closed || status === "graded" || loading}
            className="min-h-[120px]"
          />
        </div>

        {/* File upload section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
              <label htmlFor="file-input" className="text-sm font-medium">Attached Files</label>
              <input
                id="file-input"
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                disabled={closed || status === "graded" || uploading}
                className="hidden"
                aria-label="Select files to upload"
              />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-secondary rounded text-sm"
                >
                  <span className="truncate">{file.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    {!closed && status !== "graded" && (
                      <button
                        onClick={() => removeFile(idx)}
                        disabled={loading}
                        className="text-muted-foreground hover:text-destructive"
                        title="Remove file"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!closed && status !== "graded" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4 mr-2" />
                  Add Files
                </>
              )}
            </Button>
          )}
        </div>

        {/* Submit button */}
        {!closed && status !== "graded" && (
          <Button
            onClick={handleSubmit}
            disabled={loading || uploading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : submitted ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Update Submission
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Homework
              </>
            )}
          </Button>
        )}

        {/* Submitted state info */}
        {submitted && status !== "graded" && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            ✓ Your submission has been saved. {status === "grading" && "It's currently being graded."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
