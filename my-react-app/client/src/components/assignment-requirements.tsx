import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { MedicalCase } from "@shared/schema";

interface AssignmentRequirementsProps {
  case: MedicalCase;
  homework?: {
    dueAt: string;
    closed: boolean;
    description: string;
    points: number;
    homeworkType?: "Q&A" | "Annotate";
  };
  onReturn: () => void;
  onAccept: () => void;
}

export default function AssignmentRequirements({
  case: medicalCase,
  homework,
  onReturn,
  onAccept,
}: AssignmentRequirementsProps) {
  const homeworkType = homework?.homeworkType ?? "Annotate";
  const isQnAHomework = homeworkType === "Q&A";

  const requirements = isQnAHomework
    ? [
        "Read each question carefully and answer all required items before submitting",
        "Use evidence from the case description and image findings to support your answers",
        "Structure answers clearly with concise medical terminology and complete reasoning",
        "Review your responses for accuracy, completeness, and spelling before final submission",
      ]
    : [
        "Carefully examine the medical image and identify key anatomical structures",
        "Create detailed annotations labeling pathological findings and normal anatomy",
        "Use appropriate shape tools (rectangles, circles, text labels) for clarity",
        "Compare your annotations with peer submissions to learn different approaches",
      ];

  const tips = isQnAHomework
    ? [
        "Outline key findings first, then map them to each question to avoid missing points",
        "Reference image regions explicitly when explaining diagnostic reasoning",
        "Answer in complete, direct sentences and avoid one-word responses",
        "Leave time for a final proofread and consistency check across all answers",
      ]
    : [
        "Take your time to thoroughly analyze the image before annotating",
        "Use the peer comparison feature to see how others approached the same case",
        "Add descriptive text labels for all significant findings",
        "Save your work frequently by creating versions",
      ];

  const daysLeft = homework
    ? Math.ceil((new Date(homework.dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isDueSoon = daysLeft !== null && daysLeft <= 2 && daysLeft > 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{medicalCase.title}</h1>
            <p className="text-muted-foreground mt-2">{medicalCase.description}</p>
          </div>
        </div>

        {/* Main assignment card */}
        <Card className="border-2 mb-8">
          <CardContent className="p-8 space-y-6">
            {/* Case category and info */}
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="outline" className="mb-2">
                  {medicalCase.category}
                </Badge>
                <p className="text-sm text-muted-foreground max-w-lg">
                  This case requires careful analysis and annotation of medical imaging. Follow the guidelines below to complete your submission.
                </p>
              </div>
              {homework && (
                <div className="text-right">
                  <p className="text-sm font-medium mb-2">Due Date</p>
                  <p className="text-lg font-semibold">
                    {new Date(homework.dueAt).toLocaleDateString()}
                  </p>
                  {daysLeft !== null && (
                    <div className={`text-sm mt-2 flex items-center justify-end gap-1 ${
                      isOverdue ? "text-red-600" : isDueSoon ? "text-orange-600" : "text-green-600"
                    }`}>
                      <Clock className="h-4 w-4" />
                      {isOverdue ? (
                        <span>Overdue</span>
                      ) : isDueSoon ? (
                        <span>Due in {daysLeft} day{daysLeft !== 1 ? "s" : ""}</span>
                      ) : (
                        <span>{daysLeft} days left</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Assignment Description and Points */}
            {homework && (
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground mb-2">Assignment Description</p>
                    <p className="text-sm text-muted-foreground">{homework.description}</p>
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground mb-1">Total Points</p>
                    <p className="text-3xl font-bold text-primary">{homework.points}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Requirements section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Requirements</h3>
              <ul className="space-y-3">
                {requirements.map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips section */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Tips for Success</p>
                  <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-xs">
                    {tips.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-4 justify-between">
          <Button
            variant="outline"
            onClick={onReturn}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Cases
          </Button>
          <Button
            onClick={onAccept}
            className="bg-primary text-primary-foreground hover:opacity-90"
          >
            Accept & Begin Annotation
          </Button>
        </div>
      </div>
    </div>
  );
}
