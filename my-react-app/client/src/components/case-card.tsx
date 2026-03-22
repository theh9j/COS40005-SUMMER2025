import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { MedicalCase } from "@shared/schema";

interface CaseCardProps {
  case: MedicalCase;
  onClick: () => void;
  homework?: { dueAt: string; closed: boolean };
  daysLeft?: number;
  homeworkType?: "Q&A" | "Annotate";
  qnaStats?: {
    attempts?: number;
    bestScorePct?: number | null;
    questions?: number;
  };
}

export default function CaseCard({ case: medicalCase, onClick, homework, daysLeft: daysLeftProp, homeworkType, qnaStats }: CaseCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = React.useState(false);
  const [location, setLocation] = useLocation();

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "neurology":
        return "text-blue-700 dark:text-blue-300";
      case "pulmonology":
        return "text-green-700 dark:text-green-300";
      case "cardiology":
        return "text-red-700 dark:text-red-300";
      default:
        return "text-muted-foreground";
    }
  };

  const getHomeworkTypeColor = (type: "Q&A" | "Annotate") => {
    switch (type) {
      case "Annotate":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200";
      case "Q&A":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const fallbackImage = "/images/default-annotation-homework.svg";
  const isQnA = homeworkType === "Q&A";
  const showCardImage = homeworkType !== "Q&A";
  const displayImage = medicalCase.imageUrl || fallbackImage;
  const attemptedCount = qnaStats?.attempts ?? 0;
  const bestScorePct = qnaStats?.bestScorePct;
  const hasGradedScore = bestScorePct != null;
  const dueDate = homework?.dueAt ? new Date(homework.dueAt) : null;
  const dueDateLabel = dueDate && !Number.isNaN(dueDate.getTime())
    ? dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  const dueDaysLabel = homework?.closed
    ? "Closed"
    : daysLeftProp != null
      ? `${Math.max(0, daysLeftProp)} day${Math.max(0, daysLeftProp) === 1 ? "" : "s"}`
      : null;

  return (
    <Card 
      className="border border-border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer min-h-[360px]"
      onClick={onClick}
      data-testid={`case-card-${medicalCase.id}`}
    >
      {showCardImage && (
        <img
          src={displayImage}
          alt={medicalCase.title}
          className="w-full h-40 object-cover"
        />
      )}
      <CardContent className={`p-3 h-full flex flex-col ${isQnA ? "justify-between gap-2.5" : "justify-between gap-2"}`}>
        {isQnA ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight">{medicalCase.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${getHomeworkTypeColor("Q&A")}`}>Q&A</span>
            </div>
            <p className="text-sm text-muted-foreground italic line-clamp-1">{medicalCase.description || "No description"}</p>
            <div className="border-t border-border/70" />

            <div className="space-y-1">
              <div className="flex items-end gap-3">
                <div className="text-3xl leading-none font-semibold tracking-tight">
                  {hasGradedScore ? `${Math.round(bestScorePct)}%` : "--"}
                </div>
                <div className="text-xl leading-none text-muted-foreground">{hasGradedScore ? "best score" : "pending"}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                {attemptedCount > 0
                  ? `Attempted ${attemptedCount} time${attemptedCount === 1 ? "" : "s"}`
                  : "Not attempted yet"}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/10 px-3 py-2 flex items-center justify-between">
              <span className="text-xl text-muted-foreground">Questions</span>
              <span className="text-xl font-semibold">{qnaStats?.questions ?? 0} questions</span>
            </div>

            {dueDaysLabel && dueDateLabel && (
              <div className="rounded-lg border border-red-200 bg-red-50/60 px-3 py-2.5 flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs tracking-wider uppercase text-red-600">Due in</div>
                  <div className="text-2xl font-semibold text-red-700 mt-1">{dueDaysLabel}</div>
                </div>
                <div className="text-lg text-red-500">{dueDateLabel}</div>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium ${getCategoryColor(medicalCase.category)}`}>
                {medicalCase.category}
              </span>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-semibold mb-2">{medicalCase.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{medicalCase.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${getCategoryColor(medicalCase.category)}`}>
                  {medicalCase.category}
                </span>
                <span className="text-xs text-muted-foreground">12 annotations</span>
              </div>
              {homeworkType && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${getHomeworkTypeColor(homeworkType)}`}>
                  {homeworkType}
                </span>
              )}
            </div>

            {dueDaysLabel && dueDateLabel && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2.5 flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs tracking-wider uppercase text-red-600">Due in</div>
                  <div className="text-xl font-semibold text-red-700 mt-1">{dueDaysLabel}</div>
                </div>
                <div className="text-base text-red-500">{dueDateLabel}</div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
