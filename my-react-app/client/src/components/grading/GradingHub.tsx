import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Play, Search } from "lucide-react";

type SubmissionStatus = "submitted" | "graded" | "grading";

export type SubmissionLite = {
  id: string;
  caseId: string;
  caseTitle: string;
  studentId: string;
  studentName?: string;
  status: SubmissionStatus;
  score?: number;
  published?: boolean;
  updatedAt: string;
  submittedAt?: string;
  dueAt?: string;
  classDisplay?: string;
  className?: string;
  year?: string;
  homeworkType?: "Q&A" | "Annotate" | string;
  authorId?: string;
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
  const day = Math.floor(h / 24);
  return `${day}d ago`;
}

function isLate(sub: SubmissionLite) {
  if (!sub.dueAt) return false;
  const due = Date.parse(sub.dueAt);
  const submitted = Date.parse(sub.submittedAt || sub.updatedAt || "");
  if (!Number.isFinite(due) || !Number.isFinite(submitted)) return false;
  return submitted > due;
}

export default function GradingHub({
  submissions,
  classOptions,
  onOpenCase,
  onOpenCaseAtSubmission,
}: {
  submissions: SubmissionLite[];
  classOptions?: string[];
  onOpenCase: (caseId: string) => void;
  onOpenCaseAtSubmission?: (caseId: string, submissionId: string) => void;
}) {
  const [q, setQ] = React.useState("");
  const [selectedClass, setSelectedClass] = React.useState<string>("all");
  const [selectedHomeworkType, setSelectedHomeworkType] = React.useState<string>("all");
  const [lateOnly, setLateOnly] = React.useState(false);
  const [onlyPublished, setOnlyPublished] = React.useState(true);

  const classList = useMemo(() => {
    const set = new Set((classOptions ?? []).filter(Boolean));
    submissions.forEach((s) => {
      if (s.classDisplay) set.add(s.classDisplay);
      else if (s.className && s.year) set.add(`${s.className} (${s.year})`);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [classOptions, submissions]);

  const groups = useMemo(() => {
    let list = [...submissions];
    const query = q.trim().toLowerCase();

    if (onlyPublished) {
      list = list.filter((s) => s.published);
    }
    if (selectedClass !== "all") {
      list = list.filter((s) => (s.classDisplay || (s.className && s.year ? `${s.className} (${s.year})` : "")) === selectedClass);
    }
    if (selectedHomeworkType !== "all") {
      list = list.filter((s) => (s.homeworkType || "Annotate") === selectedHomeworkType);
    }
    if (lateOnly) {
      list = list.filter(isLate);
    }
    if (query) {
      list = list.filter((s) => {
        const hay = `${s.caseTitle} ${s.caseId} ${s.studentId} ${s.studentName || ""}`.toLowerCase();
        return hay.includes(query);
      });
    }

    const map = new Map<
      string,
      {
        caseId: string;
        caseTitle: string;
        total: number;
        graded: number;
        ungraded: number;
        avg?: number;
        lastUpdated?: string;
        nextUngradedId?: string;
        classDisplay?: string;
        homeworkType?: string;
        lateCount: number;
      }
    >();

    for (const s of list) {
      const key = `${s.caseId}__${s.classDisplay || s.className || "no-class"}`;
      if (!map.has(key)) {
        map.set(key, {
          caseId: s.caseId,
          caseTitle: s.caseTitle,
          total: 0,
          graded: 0,
          ungraded: 0,
          avg: undefined,
          lastUpdated: undefined,
          nextUngradedId: undefined,
          classDisplay: s.classDisplay || (s.className && s.year ? `${s.className} (${s.year})` : undefined),
          homeworkType: s.homeworkType || "Annotate",
          lateCount: 0,
        });
      }
      const g = map.get(key)!;
      g.total += 1;

      if (s.status === "graded") g.graded += 1;
      else g.ungraded += 1;

      if (isLate(s)) g.lateCount += 1;

      if (s.score != null) {
        const prevCount = (g as any).__avgCount ?? 0;
        const prevSum = (g as any).__avgSum ?? 0;
        (g as any).__avgCount = prevCount + 1;
        (g as any).__avgSum = prevSum + s.score;
        g.avg = Math.round((((g as any).__avgSum / (g as any).__avgCount) as number) * 10) / 10;
      }

      if (!g.lastUpdated || Date.parse(s.updatedAt) > Date.parse(g.lastUpdated)) {
        g.lastUpdated = s.updatedAt;
      }

      if (s.status !== "graded") {
        if (!g.nextUngradedId) g.nextUngradedId = s.id;
        else {
          const cur = list.find((x) => x.id === g.nextUngradedId);
          if (cur && Date.parse(s.updatedAt) > Date.parse(cur.updatedAt)) {
            g.nextUngradedId = s.id;
          }
        }
      }
    }

    Array.from(map.values()).forEach((g) => {
      delete (g as any).__avgCount;
      delete (g as any).__avgSum;
    });

    return Array.from(map.values()).sort((a, b) => (Date.parse(b.lastUpdated ?? "0") || 0) - (Date.parse(a.lastUpdated ?? "0") || 0));
  }, [submissions, q, selectedClass, selectedHomeworkType, lateOnly, onlyPublished]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Grading Hub</h2>
          <div className="text-sm text-muted-foreground">
            Choose a published homework to grade. Filters help you narrow by class, student name, late submissions, and homework type.
          </div>
        </div>

        <div className="relative w-full lg:w-[320px] max-w-full">
          <Search className="h-4 w-4 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
          <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search case or student…" />
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Class (Year)</label>
            <select className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="all">All classes</option>
              {classList.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Homework type</label>
            <select className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm" value={selectedHomeworkType} onChange={(e) => setSelectedHomeworkType(e.target.value)}>
              <option value="all">All types</option>
              <option value="Annotate">Annotate</option>
              <option value="Q&A">Q&A</option>
            </select>
          </div>

          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input type="checkbox" checked={lateOnly} onChange={(e) => setLateOnly(e.target.checked)} />
            Late submissions only
          </label>

          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input type="checkbox" checked={onlyPublished} onChange={(e) => setOnlyPublished(e.target.checked)} />
            Published works only
          </label>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {groups.map((g) => {
          const pct = g.total > 0 ? Math.round((g.graded / g.total) * 100) : 0;

          return (
            <Card key={`${g.caseId}-${g.classDisplay || "no-class"}`} className="border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{g.caseTitle}</div>
                    <div className="text-xs text-muted-foreground">
                      Case ID: {g.caseId} • Last activity: {timeAgo(g.lastUpdated)}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{g.graded}/{g.total} graded</Badge>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {g.classDisplay && <span className="px-2 py-1 rounded-md border bg-muted/20">{g.classDisplay}</span>}
                  <span className="px-2 py-1 rounded-md border bg-muted/20">Type: <span className="font-medium">{g.homeworkType || "Annotate"}</span></span>
                  <span className="px-2 py-1 rounded-md border bg-muted/20">Late: <span className="font-medium">{g.lateCount}</span></span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{pct}%</span>
                  </div>
                  <Progress value={pct} />
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-md border bg-muted/20">Ungraded: <span className="font-medium">{g.ungraded}</span></span>
                  <span className="px-2 py-1 rounded-md border bg-muted/20">Avg score: <span className="font-medium">{g.avg ?? "—"}</span></span>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" onClick={() => onOpenCase(g.caseId)}>
                    <ArrowRight className="h-4 w-4" />
                    Open workspace
                  </Button>

                  <Button
                    variant="secondary"
                    className="gap-2"
                    disabled={!g.nextUngradedId}
                    onClick={() => {
                      if (!g.nextUngradedId) return;
                      if (onOpenCaseAtSubmission) onOpenCaseAtSubmission(g.caseId, g.nextUngradedId);
                      else onOpenCase(g.caseId);
                    }}
                    title={g.nextUngradedId ? "Continue from next ungraded" : "No ungraded left"}
                  >
                    <Play className="h-4 w-4" />
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {groups.length === 0 && <div className="text-sm text-muted-foreground">No published works match these filters.</div>}
      </div>
    </div>
  );
}
