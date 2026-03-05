import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Play,
} from "lucide-react";
import type { AIGradingResult, BatchGradingJob } from "@/types/ai-grading";

interface Submission {
  id: string;
  caseTitle: string;
  studentId: string;
  status: string;
  score?: number;
}

interface BatchGradingDialogProps {
  open: boolean;
  onClose: () => void;
  submissions: Submission[];
  batchJob: BatchGradingJob | null;
  onStartBatch: (ids: string[]) => void;
  onCancelBatch: () => void;
  onApplyResult: (submissionId: string, result: AIGradingResult) => void;
  getBatchResult: (id: string) => AIGradingResult | null;
}

export default function BatchGradingDialog({
  open,
  onClose,
  submissions,
  batchJob,
  onStartBatch,
  onCancelBatch,
  onApplyResult,
  getBatchResult,
}: BatchGradingDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const ungraded = submissions.filter((s) => s.status !== "graded");
  const isRunning = batchJob?.status === "running";
  const isComplete = batchJob?.status === "complete" || batchJob?.status === "error";

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllUngraded = () => {
    setSelected(new Set(ungraded.map((s) => s.id)));
  };

  const clearSelection = () => setSelected(new Set());

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Batch AI Grading
          </DialogTitle>
        </DialogHeader>

        {/* Selection phase */}
        {!isRunning && !isComplete && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {ungraded.length} ungraded submissions
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAllUngraded}>
                  Select all
                </Button>
                {selected.size > 0 && (
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {ungraded.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  All submissions are already graded.
                </div>
              ) : (
                ungraded.map((s) => (
                  <label
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition",
                      selected.has(s.id) && "border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/30"
                    )}
                  >
                    <Checkbox
                      checked={selected.has(s.id)}
                      onCheckedChange={() => toggleSelect(s.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.studentId}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{s.caseTitle}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {/* Running phase */}
        {isRunning && batchJob && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
              <div className="text-sm font-medium">
                Processing {batchJob.currentIndex + 1} of {batchJob.submissionIds.length}
              </div>
            </div>
            <Progress value={batchJob.progress * 100} className="h-2" />
            <div className="text-xs text-center text-muted-foreground">
              {Math.round(batchJob.progress * 100)}% complete
            </div>
          </div>
        )}

        {/* Complete phase */}
        {isComplete && batchJob && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="text-sm font-medium">
                Batch complete — {Object.keys(batchJob.results).length} graded
                {Object.keys(batchJob.errors).length > 0 && (
                  <span className="text-red-500 ml-1">
                    ({Object.keys(batchJob.errors).length} errors)
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {batchJob.submissionIds.map((id) => {
                const res = batchJob.results[id];
                const err = batchJob.errors[id];
                const sub = submissions.find((s) => s.id === id);

                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {sub?.studentId || id.slice(0, 8)}
                      </div>
                      {res && (
                        <div className="text-[11px] text-muted-foreground">
                          Score: {res.totalScore}/{res.maxScore} •{" "}
                          Confidence: {Math.round(res.overallConfidence * 100)}%
                        </div>
                      )}
                      {err && (
                        <div className="text-[11px] text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {err}
                        </div>
                      )}
                    </div>

                    {res && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs shrink-0"
                        onClick={() => onApplyResult(id, res)}
                      >
                        Apply
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Separator />

        <DialogFooter className="gap-2">
          {!isRunning && !isComplete && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="gap-2"
                disabled={selected.size === 0}
                onClick={() => onStartBatch(Array.from(selected))}
              >
                <Play className="h-4 w-4" />
                Grade {selected.size} submissions
              </Button>
            </>
          )}

          {isRunning && (
            <Button variant="destructive" className="gap-2" onClick={onCancelBatch}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
          )}

          {isComplete && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
