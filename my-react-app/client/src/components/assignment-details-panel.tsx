import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type AssignmentDetailsPanelProps = {
  title: string;
  description: string;
  dueDate?: string;
  points: number;
  closed: boolean;
  hasHomework?: boolean;
  autoChecklist?: string[];
  onClose: () => void;
};

export default function AssignmentDetailsPanel({
  title,
  description,
  dueDate,
  points,
  closed,
  hasHomework = true,
  autoChecklist,
  onClose,
}: AssignmentDetailsPanelProps) {
  const dueDateTime = dueDate ? new Date(dueDate) : null;
  const now = new Date();
  const isOverdue = Boolean(dueDateTime && dueDateTime < now && !closed);
  const daysUntilDue = dueDateTime
    ? Math.ceil((dueDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-semibold text-sm">{title}</h3>
          <div className="text-xs text-muted-foreground mt-1">Assignment Details</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status Section */}
        <Card className="bg-muted/50">
          <CardContent className="p-3 space-y-2">
            {!hasHomework ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">No Homework Assigned</span>
              </div>
            ) : closed ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Assignment Closed</span>
              </div>
            ) : isOverdue ? (
              <div className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Overdue</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Open</span>
              </div>
            )}

            {dueDateTime ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {daysUntilDue && daysUntilDue > 0
                    ? `${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""} left`
                    : "Due today"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>No due date</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Points */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">Total Points</span>
          <Badge variant="outline" className="text-base font-bold">
            {hasHomework ? points : "N/A"}
          </Badge>
        </div>

        {/* Due Date */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Due Date</span>
          <div className="text-sm">
            {dueDateTime
              ? `${dueDateTime.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })} at ${dueDateTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "No due date"}
          </div>
        </div>

        {/* Description - Shortened */}
        {description && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Requirements</span>
            <div className="text-sm text-muted-foreground leading-relaxed max-h-32 overflow-y-auto">
              {description.length > 200 ? (
                <>
                  {description.substring(0, 200)}
                  <span className="font-medium"> ...</span>
                </>
              ) : (
                description
              )}
            </div>
          </div>
        )}

        {/* Auto Checklist - Suggested focus areas */}
        {autoChecklist && autoChecklist.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Key Focus Areas</span>
            <div className="space-y-1">
              {autoChecklist.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
              {autoChecklist.length > 4 && (
                <div className="text-xs text-muted-foreground font-medium">
                  +{autoChecklist.length - 4} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
