import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  Info,
  PencilLine,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";

export type RubricItem = { id: string; points: number; comment?: string };

type LevelKey = "excellent" | "good" | "fair" | "poor";

type Level = {
  key: LevelKey;
  label: string;
  points: number;
  desc: string;
};

type Criterion = {
  id: string;
  title: string;
  help?: string;
  max: number;
  levels: Level[];
  selectedKey: LevelKey;
  points: number;
  comment?: string;
};

type AiSuggestion = {
  picks: { id: string; levelKey: LevelKey }[];
  total: number;
  confidence?: number; // 0..1
  note?: string;
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

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
  const day = Math.floor(h / 24);
  return `${day}d ago`;
}

function buildDefaultCriteria(): Criterion[] {
  const correctnessLevels: Level[] = [
    {
      key: "excellent",
      label: "Excellent",
      points: 5,
      desc: "Correct, consistent, and well-justified.",
    },
    {
      key: "good",
      label: "Good",
      points: 4,
      desc: "Mostly correct with minor issues.",
    },
    {
      key: "fair",
      label: "Fair",
      points: 3,
      desc: "Partly correct; noticeable gaps.",
    },
    {
      key: "poor",
      label: "Poor",
      points: 1,
      desc: "Major errors or incorrect reasoning.",
    },
  ];

  const completenessLevels: Level[] = [
    {
      key: "excellent",
      label: "Excellent",
      points: 3,
      desc: "All parts covered with key steps.",
    },
    {
      key: "good",
      label: "Good",
      points: 2,
      desc: "Mostly complete; small parts missing.",
    },
    {
      key: "fair",
      label: "Fair",
      points: 1,
      desc: "Missing major parts or steps.",
    },
    {
      key: "poor",
      label: "Poor",
      points: 0,
      desc: "Very incomplete or off-topic.",
    },
  ];

  const presentationLevels: Level[] = [
    {
      key: "excellent",
      label: "Excellent",
      points: 2,
      desc: "Clear, structured, easy to follow.",
    },
    {
      key: "good",
      label: "Good",
      points: 2,
      desc: "Readable; minor clarity issues.",
    },
    {
      key: "fair",
      label: "Fair",
      points: 1,
      desc: "Some confusion or weak structure.",
    },
    {
      key: "poor",
      label: "Poor",
      points: 0,
      desc: "Hard to follow.",
    },
  ];

  return [
    {
      id: "correctness",
      title: "Correctness",
      max: 5,
      help: "Accuracy of findings & reasoning.",
      levels: correctnessLevels,
      selectedKey: "poor",
      points: 0,
      comment: "",
    },
    {
      id: "completeness",
      title: "Completeness",
      max: 3,
      help: "Coverage of requirements & steps.",
      levels: completenessLevels,
      selectedKey: "poor",
      points: 0,
      comment: "",
    },
    {
      id: "presentation",
      title: "Presentation",
      max: 2,
      help: "Clarity & structure of response.",
      levels: presentationLevels,
      selectedKey: "poor",
      points: 0,
      comment: "",
    },
  ];
}

export default function RubricPanel({
  onSubmit,
  disabled,
  initialRubric,
  lastSavedAt,
  studentAnswer,
  instructorNotes,
}: {
  onSubmit: (total: number, rubric: RubricItem[]) => void;
  disabled?: boolean;
  initialRubric?: any[];
  lastSavedAt?: string;
  studentAnswer?: string;
  instructorNotes?: string;
}) {
  const [criteria, setCriteria] = useState<Criterion[]>(() => buildDefaultCriteria());
  const [openComment, setOpenComment] = useState<Record<string, boolean>>({});
  const [ai, setAi] = useState<AiSuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const lastSavedSnapshot = useRef<string>("");

  const maxTotal = useMemo(() => criteria.reduce((a, c) => a + c.max, 0), [criteria]);
  const total = useMemo(
    () => criteria.reduce((a, c) => a + (Number.isFinite(c.points) ? c.points : 0), 0),
    [criteria]
  );
  const pct = useMemo(
    () => (maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0),
    [total, maxTotal]
  );

  const rubricPayload = useMemo<RubricItem[]>(
    () =>
      criteria.map((c) => ({
        id: c.id,
        points: c.points,
        comment: (c.comment ?? "").trim() || undefined,
      })),
    [criteria]
  );

  useEffect(() => {
    const base = buildDefaultCriteria();
    if (!initialRubric || !Array.isArray(initialRubric) || initialRubric.length === 0) {
      setCriteria(base);
      lastSavedSnapshot.current = JSON.stringify(
        base.map((c) => ({ id: c.id, points: c.points, comment: c.comment ?? "", key: c.selectedKey }))
      );
      return;
    }

    const hydrated = base.map((c) => {
      const hit = initialRubric.find((x: any) => x?.id === c.id);
      const pts = clamp(Number(hit?.points ?? 0), 0, c.max);
      const comment = String(hit?.comment ?? "");

      const exact = c.levels.find((l) => l.points === pts);
      const nearest = c.levels.reduce((best, l) => {
        const db = Math.abs(l.points - pts);
        const da = Math.abs(best.points - pts);
        return db < da ? l : best;
      }, c.levels[0]);

      const chosen = exact ?? nearest;
      return { ...c, points: chosen.points, selectedKey: chosen.key, comment };
    });

    setCriteria(hydrated);
    lastSavedSnapshot.current = JSON.stringify(
      hydrated.map((c) => ({ id: c.id, points: c.points, comment: c.comment ?? "", key: c.selectedKey }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialRubric ?? [])]);

  const isDirty = useMemo(() => {
    const snapNow = JSON.stringify(
      criteria.map((c) => ({ id: c.id, points: c.points, comment: c.comment ?? "", key: c.selectedKey }))
    );
    return snapNow !== lastSavedSnapshot.current;
  }, [criteria]);

  const columns: LevelKey[] = ["excellent", "good", "fair", "poor"];
  const columnLabels: Record<LevelKey, string> = {
    excellent: "Excellent",
    good: "Good",
    fair: "Fair",
    poor: "Poor",
  };

  const pickLevel = (criterionId: string, levelKey: LevelKey) => {
    setCriteria((prev) =>
      prev.map((c) => {
        if (c.id !== criterionId) return c;
        const lvl = c.levels.find((l) => l.key === levelKey) ?? c.levels[0];
        return { ...c, selectedKey: lvl.key, points: lvl.points };
      })
    );
  };

  const setComment = (criterionId: string, value: string) => {
    setCriteria((prev) => prev.map((c) => (c.id === criterionId ? { ...c, comment: value } : c)));
  };

  const resetAll = () => {
    setCriteria((prev) =>
      prev.map((c) => {
        const poor = c.levels.find((l) => l.key === "poor") ?? c.levels[c.levels.length - 1];
        return { ...c, selectedKey: poor.key, points: poor.points, comment: "" };
      })
    );
  };

  const applyPreset = (preset: LevelKey) => {
    setCriteria((prev) =>
      prev.map((c) => {
        const lvl = c.levels.find((l) => l.key === preset) ?? c.levels[0];
        return { ...c, selectedKey: lvl.key, points: lvl.points };
      })
    );
  };

  const runAiSuggest = async () => {
    setAiLoading(true);
    try {
      const text = `${studentAnswer ?? ""}\n${instructorNotes ?? ""}`.trim();
      const len = text.length;
      const lowered = text.toLowerCase();

      const hasSteps = lowered.includes("step") || lowered.includes("first") || lowered.includes("second");
      const hasReason = lowered.includes("because") || lowered.includes("therefore");
      const isLong = len > 900;

      const picks: AiSuggestion["picks"] = [
        { id: "presentation", levelKey: hasSteps ? "excellent" : "fair" },
        { id: "correctness", levelKey: hasReason ? "good" : "fair" },
        { id: "completeness", levelKey: isLong ? "good" : "fair" },
      ];

      const totalSuggested = picks.reduce((sum, p) => {
        const c = criteria.find((x) => x.id === p.id);
        const lvl = c?.levels.find((l) => l.key === p.levelKey);
        return sum + (lvl?.points ?? 0);
      }, 0);

      setAi({
        picks,
        total: totalSuggested,
        confidence: clamp(0.55 + Math.min(len / 2200, 0.35), 0, 0.9),
        note: "Starting point only. Apply then adjust.",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const applyAi = () => {
    if (!ai) return;
    setCriteria((prev) =>
      prev.map((c) => {
        const pick = ai.picks.find((p) => p.id === c.id);
        if (!pick) return c;
        const lvl = c.levels.find((l) => l.key === pick.levelKey) ?? c.levels[0];
        return { ...c, selectedKey: lvl.key, points: lvl.points };
      })
    );
  };

  const save = () => {
    onSubmit(total, rubricPayload);
    lastSavedSnapshot.current = JSON.stringify(
      criteria.map((c) => ({ id: c.id, points: c.points, comment: c.comment ?? "", key: c.selectedKey }))
    );
  };

  return (
    <TooltipProvider>
      <Card className="overflow-hidden">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Rubric</h3>
                  <Badge variant="secondary">
                    {total} / {maxTotal}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {isDirty ? "Unsaved changes" : "Saved"}
                  </Badge>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[280px] text-xs">
                      Canvas-style matrix: pick 1 level per criterion. Levels map to points.
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Overall</span>
                    <span>{pct}%</span>
                  </div>
                  <Progress value={pct} />
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Last saved: {timeAgo(lastSavedAt)}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-1 flex-wrap justify-end">
                  <Button size="sm" variant="secondary" disabled={disabled} onClick={() => applyPreset("excellent")}>
                    Excellent
                  </Button>
                  <Button size="sm" variant="secondary" disabled={disabled} onClick={() => applyPreset("good")}>
                    Good
                  </Button>
                  <Button size="sm" variant="secondary" disabled={disabled} onClick={() => applyPreset("fair")}>
                    Fair
                  </Button>
                  <Button size="sm" variant="secondary" disabled={disabled} onClick={() => applyPreset("poor")}>
                    Poor
                  </Button>
                </div>

                <Button size="sm" variant="ghost" className="gap-2" disabled={disabled} onClick={resetAll}>
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-md bg-background border flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">AI suggestion</div>
                    <div className="text-xs text-muted-foreground truncate">
                      Generate a starting rubric (apply → tweak).
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-2"
                    disabled={disabled || aiLoading}
                    onClick={runAiSuggest}
                  >
                    <Wand2 className="h-4 w-4" />
                    {aiLoading ? "..." : "Generate"}
                  </Button>
                  <Button size="sm" className="gap-2" disabled={disabled || !ai} onClick={applyAi}>
                    <CheckCircle2 className="h-4 w-4" />
                    Apply
                  </Button>
                </div>
              </div>

              {ai ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  Suggested total: <span className="font-medium text-foreground">{ai.total}/{maxTotal}</span>
                  {ai.confidence != null ? (
                    <span className="ml-2">• Confidence: {Math.round(ai.confidence * 100)}%</span>
                  ) : null}
                  {ai.note ? <span className="ml-2">• {ai.note}</span> : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[minmax(260px,1.4fr)_repeat(4,minmax(150px,1fr))] bg-muted/20 border-b">
                  <div className="p-3 text-[12px] font-medium text-muted-foreground">Criteria</div>
                  {columns.map((k) => (
                    <div key={k} className="p-3 text-[12px] font-medium text-muted-foreground text-center">
                      {columnLabels[k]}
                    </div>
                  ))}
                </div>

                <div className="divide-y">
                  {criteria.map((c) => (
                    <div key={c.id} className="p-3">
                      <div className="grid grid-cols-[minmax(260px,1.4fr)_repeat(4,minmax(150px,1fr))] gap-3 items-stretch">
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold leading-snug">
                                {c.title}{" "}
                                <span className="text-muted-foreground font-normal">(max {c.max})</span>
                              </div>
                              {c.help ? (
                                <div className="text-[12px] leading-snug text-muted-foreground mt-0.5">
                                  {c.help}
                                </div>
                              ) : null}
                            </div>
                            <Badge variant="outline" className="shrink-0">
                              {c.points}/{c.max}
                            </Badge>
                          </div>
                        </div>

                        {columns.map((key) => {
                          const lvl = c.levels.find((l) => l.key === key);
                          if (!lvl) return <div key={key} />;
                          const active = c.selectedKey === key;
                          return (
                            <Tooltip key={key}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => pickLevel(c.id, key)}
                                  className={cn(
                                    "rounded-xl border p-3 text-left transition h-full",
                                    "bg-background hover:bg-muted/30",
                                    active && "border-foreground ring-1 ring-foreground/20",
                                    disabled && "opacity-60 cursor-not-allowed"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "text-[12px] font-semibold leading-snug",
                                      active ? "text-foreground" : "text-muted-foreground"
                                    )}
                                  >
                                    {lvl.points} pts
                                  </div>
                                  <div className="text-[11px] leading-snug text-muted-foreground mt-1 line-clamp-3">
                                    {lvl.desc}
                                  </div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[260px] text-xs">
                                <div className="font-medium">
                                  {c.title} — {columnLabels[key]} ({lvl.points} pts)
                                </div>
                                <div className="text-muted-foreground mt-1">{lvl.desc}</div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>

                      <div className="mt-3">
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                          onClick={() => setOpenComment((p) => ({ ...p, [c.id]: !p[c.id] }))}
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                          {openComment[c.id]
                            ? "Hide comment"
                            : (c.comment ?? "").trim()
                              ? "Edit comment"
                              : "Add comment"}
                        </button>

                        {openComment[c.id] ? (
                          <div className="mt-2">
                            <Textarea
                              value={c.comment ?? ""}
                              onChange={(e) => setComment(c.id, e.target.value)}
                              placeholder={`Comment for ${c.title}…`}
                              className="min-h-[72px]"
                              disabled={disabled}
                            />
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              Saved with rubric (per-criterion).
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" disabled={disabled} onClick={resetAll}>
              Reset
            </Button>
            <Button className="flex-1 gap-2" disabled={disabled} onClick={save}>
              <CheckCircle2 className="h-4 w-4" />
              Save grade
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Canvas-like flow: pick level per criterion → add comments → Save → then Publish.
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
