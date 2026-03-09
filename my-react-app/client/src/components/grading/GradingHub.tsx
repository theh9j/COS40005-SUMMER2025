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

export default function GradingHub({
  submissions,
  onOpenCase,
  onOpenCaseAtSubmission,
}: {
  submissions: SubmissionLite[];
  onOpenCase: (caseId: string) => void;
  onOpenCaseAtSubmission?: (caseId: string, submissionId: string) => void;
}) {
  const [q, setQ] = React.useState("");

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
      }
    >();

    for (const s of submissions) {
      if (!map.has(s.caseId)) {
        map.set(s.caseId, {
          caseId: s.caseId,
          caseTitle: s.caseTitle,
          total: 0,
          graded: 0,
          ungraded: 0,
          avg: undefined,
          lastUpdated: undefined,
          nextUngradedId: undefined,
        });
      }

      const group = map.get(s.caseId)!;
      group.total += 1;

      if (s.status === "graded") group.graded += 1;
      else group.ungraded += 1;

      if (s.score != null) {
        const prevCount = (group as any).__avgCount ?? 0;
        const prevSum = (group as any).__avgSum ?? 0;
        (group as any).__avgCount = prevCount + 1;
        (group as any).__avgSum = prevSum + s.score;
        group.avg = Math.round((((group as any).__avgSum / (group as any).__avgCount) as number) * 10) / 10;
      }

      if (!group.lastUpdated || Date.parse(s.updatedAt) > Date.parse(group.lastUpdated)) {
        group.lastUpdated = s.updatedAt;
      }

      if (s.status !== "graded") {
        if (!group.nextUngradedId) group.nextUngradedId = s.id;
        else {
          const current = submissions.find((x) => x.id === group.nextUngradedId);
          if (current && Date.parse(s.updatedAt) > Date.parse(current.updatedAt)) {
            group.nextUngradedId = s.id;
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
      list = list.filter(
        (g) => g.caseTitle.toLowerCase().includes(query) || g.caseId.toLowerCase().includes(query)
      );
    }

    list.sort((a, b) => (Date.parse(b.lastUpdated ?? "0") || 0) - (Date.parse(a.lastUpdated ?? "0") || 0));
    return list;
  }, [submissions, q]);

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
          <Search className="h-4 w-4 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
          <Input className="pl-8 h-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search case title…" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {groups.map((g) => {
          const pct = g.total > 0 ? Math.round((g.graded / g.total) * 100) : 0;
          const isCompleted = g.total > 0 && g.graded === g.total;

          return (
            <Card
              key={g.caseId}
              className={[
                "border transition-shadow hover:shadow-sm",
                isCompleted ? "border-green-300 bg-green-50/60 dark:bg-green-950/20" : "border-border",
              ].join(" ")}
            >
              <CardContent className="p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{g.caseTitle}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {g.caseId} • {timeAgo(g.lastUpdated)}
                    </div>
                  </div>

                  {isCompleted ? (
                    <Badge className="shrink-0 bg-green-600 hover:bg-green-600 text-white gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Done
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0 text-[11px]">
                      {g.graded}/{g.total}
                    </Badge>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{pct}%</span>
                  </div>
                  <Progress value={pct} className={isCompleted ? "[&>div]:bg-green-600" : ""} />
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className={["px-2 py-1 rounded-md border", isCompleted ? "border-green-200 bg-white/80 text-green-700" : "bg-muted/20"].join(" ")}>
                    Ungraded: <span className="font-medium">{g.ungraded}</span>
                  </span>
                  <span className={["px-2 py-1 rounded-md border", isCompleted ? "border-green-200 bg-white/80 text-green-700" : "bg-muted/20"].join(" ")}>
                    Avg: <span className="font-medium">{g.avg ?? "—"}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" className="gap-2" onClick={() => onOpenCase(g.caseId)}>
                    <ArrowRight className="h-4 w-4" />
                    Open
                  </Button>

                  <Button
                    size="sm"
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

