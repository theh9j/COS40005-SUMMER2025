import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, CheckCircle2, Play, Search } from "lucide-react";

type SubmissionStatus = "submitted" | "graded" | "grading";

export type SubmissionLite = {
  id: string;
  caseId: string;
  caseTitle: string;
  studentId: string;
  status: SubmissionStatus;
  score?: number;
  published?: boolean;
  updatedAt: string;
  classId?: string;
  classroom?: string;
  className?: string;
  year?: string;
  homeworkType?: string;
  late?: boolean;
};

type ClassroomOption = {
  id: string;
  name: string;
  year: string;
  display: string;
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

function normalizeClassLabel(s?: string) {
  return (s || "").trim().toLowerCase();
}

export default function GradingHub({
  submissions,
  onOpenCase,
  onOpenCaseAtSubmission,
  classrooms = [],
}: {
  submissions: SubmissionLite[];
  onOpenCase: (caseId: string) => void;
  onOpenCaseAtSubmission?: (caseId: string, submissionId: string) => void;
  classrooms?: ClassroomOption[];
}) {
  const [q, setQ] = React.useState("");
  const [classFilter, setClassFilter] = React.useState("");

  const groups = useMemo(() => {
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
        classId?: string;
        classroom?: string;
      }
    >();

    for (const s of submissions) {
      const key = s.caseId;
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
          classId: s.classId,
          classroom:
            s.classroom ||
            (s.className ? `${s.className}${s.year ? ` (${s.year})` : ""}` : undefined),
        });
      }
      const g = map.get(key)!;
      g.total += 1;
      if (!g.classId && s.classId) {
        g.classId = s.classId;
      }
      if (!g.classroom) {
        g.classroom =
          s.classroom ||
          (s.className ? `${s.className}${s.year ? ` (${s.year})` : ""}` : undefined);
      }

      const isGraded = s.status === "graded";
      if (isGraded) g.graded += 1;
      else g.ungraded += 1;

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
          const cur = submissions.find((x) => x.id === g.nextUngradedId);
          if (cur && Date.parse(s.updatedAt) > Date.parse(cur.updatedAt)) {
            g.nextUngradedId = s.id;
          }
        }
      }
    }

    for (const g of map.values()) {
      delete (g as any).__avgCount;
      delete (g as any).__avgSum;
    }

    let list = Array.from(map.values());
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((g) => g.caseTitle.toLowerCase().includes(query) || g.caseId.toLowerCase().includes(query));
    }

    if (classFilter) {
      const selected = normalizeClassLabel(classrooms.find((c) => c.id === classFilter)?.display || classFilter);
      list = list.filter((g) => {
        if (g.classId) {
          return g.classId === classFilter;
        }
        return normalizeClassLabel(g.classroom) === selected;
      });
    }

    list.sort((a, b) => (Date.parse(b.lastUpdated ?? "0") || 0) - (Date.parse(a.lastUpdated ?? "0") || 0));
    return list;
  }, [submissions, q, classFilter, classrooms]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Grading Hub</h2>
          <div className="text-sm text-muted-foreground">
            Smaller assignment cards with a clear status color so instructors can spot completed work fast.
          </div>
        </div>

        <div className="relative w-[320px] max-w-full">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search case title..."
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[240px_1fr]">
        <div>
          <label className="mb-1 block text-sm font-medium">Class (Year)</label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="h-11 w-full rounded-md border bg-background px-3 text-sm"
            title="Filter grading cards by class"
          >
            <option value="">All classes</option>
            {classrooms.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.display}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end justify-between gap-3 text-xs text-muted-foreground">
          <div>
            {classFilter
              ? `Showing ${groups.length} assignment card${groups.length === 1 ? "" : "s"} in selected class`
              : `Showing ${groups.length} assignment card${groups.length === 1 ? "" : "s"}`}
          </div>
          {classFilter && (
            <button className="underline underline-offset-2" onClick={() => setClassFilter("")}>
              Reset class filter
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => {
          const pct = g.total > 0 ? Math.round((g.graded / g.total) * 100) : 0;
          const isDone = g.total > 0 && g.graded === g.total;

          return (
            <Card
              key={g.caseId}
              className={isDone ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/20" : "border"}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{g.caseTitle}</div>
                    <div className="text-xs text-muted-foreground">
                      {g.caseId} • {timeAgo(g.lastUpdated)}
                    </div>
                    {g.classroom && <div className="mt-1 text-xs text-muted-foreground">{g.classroom}</div>}
                  </div>
                  {isDone ? (
                    <Badge className="shrink-0 gap-1 bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-700 dark:text-emerald-50 dark:hover:bg-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Done
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">
                      {g.graded}/{g.total}
                    </Badge>
                  )}
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{pct}%</span>
                  </div>
                  <Progress value={pct} className={isDone ? "[&>div]:bg-emerald-600 dark:[&>div]:bg-emerald-500" : ""} />
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md border bg-muted/20 px-2 py-1">
                    Ungraded: <span className="font-medium">{g.ungraded}</span>
                  </span>
                  <span className="rounded-md border bg-muted/20 px-2 py-1">
                    Avg: <span className="font-medium">{g.avg ?? "—"}</span>
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" onClick={() => onOpenCase(g.caseId)}>
                    <ArrowRight className="h-4 w-4" />
                    Open
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

        {groups.length === 0 && <div className="text-sm text-muted-foreground">No cases found.</div>}
      </div>
    </div>
  );
}

