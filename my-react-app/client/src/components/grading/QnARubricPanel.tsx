import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, PencilLine, RotateCcw } from "lucide-react";

export type QnARubricItem = {
  id: string;         // e.g. "q0", "q1"
  points: number;     // awarded points
  max: number;        // max points for this question
  comment?: string;
};

type QuestionMeta = {
  prompt: string;
  points: number;
  type?: "mcq" | "short";
  options?: string[];
  correctIndex?: number;
  expectedAnswer?: string;
  index?: number;
};

function timeAgo(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export default function QnARubricPanel({
  questions,
  onSubmit,
  disabled,
  initialRubric,
  lastSavedAt,
}: {
  questions: QuestionMeta[];
  onSubmit: (total: number, rubric: QnARubricItem[]) => void;
  disabled?: boolean;
  initialRubric?: any[];
  lastSavedAt?: string;
}) {
  const [items, setItems] = useState<QnARubricItem[]>(() =>
    questions.map((q, i) => ({
      id: `q${i}`,
      points: 0,
      max: Number(q.points) || 0,
      comment: "",
    }))
  );
  const [openComment, setOpenComment] = useState<Record<string, boolean>>({});
  const lastSavedSnapshot = useRef<string>("");

  // Rebuild items when questions change
  useEffect(() => {
    const base = questions.map((q, i) => ({
      id: `q${i}`,
      points: 0,
      max: Number(q.points) || 0,
      comment: "",
    }));

    if (!initialRubric || !Array.isArray(initialRubric) || initialRubric.length === 0) {
      setItems(base);
      lastSavedSnapshot.current = JSON.stringify(base.map((it) => ({ id: it.id, points: it.points, comment: it.comment ?? "" })));
      return;
    }

    // Restore from saved rubric
    const merged = base.map((it) => {
      const saved = initialRubric.find((r: any) => r.id === it.id);
      if (saved) {
        return {
          ...it,
          points: clamp(Number(saved.points) || 0, 0, it.max),
          comment: saved.comment ?? "",
        };
      }
      return it;
    });
    setItems(merged);
    lastSavedSnapshot.current = JSON.stringify(merged.map((it) => ({ id: it.id, points: it.points, comment: it.comment ?? "" })));
  }, [questions, initialRubric]);

  const total = useMemo(() => items.reduce((acc, it) => acc + (Number.isFinite(it.points) ? it.points : 0), 0), [items]);
  const maxTotal = useMemo(() => items.reduce((acc, it) => acc + it.max, 0), [items]);
  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  const currentSnapshot = JSON.stringify(items.map((it) => ({ id: it.id, points: it.points, comment: it.comment ?? "" })));
  const isDirty = currentSnapshot !== lastSavedSnapshot.current;

  const rubricPayload = useMemo<QnARubricItem[]>(
    () =>
      items.map((it) => ({
        id: it.id,
        points: it.points,
        max: it.max,
        comment: (it.comment ?? "").trim() || undefined,
      })),
    [items]
  );

  function handleReset() {
    setItems((prev) => prev.map((it) => ({ ...it, points: 0, comment: "" })));
  }

  function handleSubmit() {
    lastSavedSnapshot.current = currentSnapshot;
    onSubmit(total, rubricPayload);
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          No questions found for this Q&amp;A homework.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
          <div>
            <div className="font-semibold text-sm">Q&amp;A Grading</div>
            <div className="text-xs text-muted-foreground">
              Award points per question (0 – max)
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastSavedAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Saved {timeAgo(lastSavedAt)}
              </span>
            )}
            {isDirty && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-amber-600 border-amber-400">
                Unsaved
              </Badge>
            )}
          </div>
        </div>

        {/* Score summary */}
        <div className="px-4 py-3 border-b space-y-1.5">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Total Score</span>
            <span
              className={cn(
                "text-base font-semibold",
                pct >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                pct >= 50 ? "text-amber-600 dark:text-amber-400" :
                "text-red-600 dark:text-red-400"
              )}
            >
              {total} / {maxTotal}
            </span>
          </div>
          <Progress
            value={pct}
            className={cn(
              pct >= 80 ? "[&>div]:bg-emerald-600 dark:[&>div]:bg-emerald-500" :
              pct >= 50 ? "[&>div]:bg-amber-500" :
              "[&>div]:bg-red-500"
            )}
          />
          <div className="text-xs text-right text-muted-foreground">{pct}%</div>
        </div>

        {/* Per-question scoring */}
        <div className="divide-y max-h-[480px] overflow-auto">
          {items.map((item, idx) => {
            const q = questions[idx];
            const qPct = item.max > 0 ? Math.round((item.points / item.max) * 100) : 0;

            return (
              <div key={item.id} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Q{idx + 1} · {q?.type === "mcq" ? "MCQ" : "Short answer"}
                    </p>
                    <p className="text-sm mt-0.5 line-clamp-2">{q?.prompt || `Question ${idx + 1}`}</p>
                  </div>
                  <Badge
                    variant={qPct >= 80 ? "default" : qPct > 0 ? "secondary" : "outline"}
                    className={cn(
                      "shrink-0 text-xs",
                      qPct >= 80 ? "bg-emerald-600 hover:bg-emerald-600 text-white dark:bg-emerald-700 dark:hover:bg-emerald-700" : ""
                    )}
                  >
                    {item.points}/{item.max}
                  </Badge>
                </div>

                {/* Points input */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">Points:</span>
                  <div className="flex gap-1">
                    {item.max <= 5 ? (
                      // Render quick-select buttons for small max points
                      Array.from({ length: item.max + 1 }, (_, v) => (
                        <button
                          key={v}
                          disabled={disabled}
                          onClick={() => {
                            setItems((prev) =>
                              prev.map((it) => (it.id === item.id ? { ...it, points: v } : it))
                            );
                          }}
                          className={cn(
                            "h-7 w-7 rounded-md border text-xs font-medium transition-colors",
                            item.points === v
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/30 hover:bg-muted text-foreground"
                          )}
                        >
                          {v}
                        </button>
                      ))
                    ) : (
                      // Number input for larger max points
                      <Input
                        type="number"
                        min={0}
                        max={item.max}
                        value={item.points}
                        disabled={disabled}
                        onChange={(e) => {
                          const v = clamp(Number(e.target.value) || 0, 0, item.max);
                          setItems((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, points: v } : it))
                          );
                        }}
                        className="h-8 w-20 text-sm"
                      />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">/ {item.max}</span>

                  <button
                    className="ml-auto flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setOpenComment((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                    disabled={disabled}
                  >
                    <PencilLine className="h-3 w-3" />
                    {openComment[item.id] ? "Hide note" : "Add note"}
                  </button>
                </div>

                {openComment[item.id] && (
                  <Textarea
                    placeholder="Per-question note (optional)…"
                    value={item.comment ?? ""}
                    disabled={disabled}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it) => (it.id === item.id ? { ...it, comment: e.target.value } : it))
                      )
                    }
                    className="text-xs min-h-[60px]"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 border-t flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={disabled}
            className="gap-1.5"
            title="Reset all scores to 0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button
            className="flex-1 gap-1.5"
            size="sm"
            onClick={handleSubmit}
            disabled={disabled}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Save grade ({total}/{maxTotal})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
