import { useEffect, useState } from "react";
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
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  Target,
  Lightbulb,
  Copy,
  Loader2,
  MessageSquare,
  Stethoscope,
  Activity,
} from "lucide-react";
import type { AIGradingResult, AIAnnotationComment } from "@/types/ai-grading";

interface AIGradingPanelProps {
  isAnalyzing: boolean;
  result: AIGradingResult | null;
  error: string | null;
  onAnalyze: () => void;
  onApplyScores: () => void;
  onApplyFeedback: (feedback: string) => void;
  disabled?: boolean;
}

function confidenceColor(c: number) {
  if (c >= 0.7) return "text-green-600 dark:text-green-400";
  if (c >= 0.5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-500 dark:text-red-400";
}

function confidenceBg(c: number) {
  if (c >= 0.7) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
  if (c >= 0.5) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
}

function qualityBadge(q: AIAnnotationComment["quality"]) {
  switch (q) {
    case "correct":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-[10px]">Correct</Badge>;
    case "partial":
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 text-[10px]">Partial</Badge>;
    case "incorrect":
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-[10px]">Incorrect</Badge>;
    case "missing-label":
      return <Badge variant="outline" className="text-[10px]">No label</Badge>;
    default:
      return null;
  }
}

export default function AIGradingPanel({
  isAnalyzing,
  result,
  error,
  onAnalyze,
  onApplyScores,
  onApplyFeedback,
  disabled,
}: AIGradingPanelProps) {
  const [expandDisease, setExpandDisease] = useState(true);
  const [expandCriteria, setExpandCriteria] = useState(true);
  const [expandFeedback, setExpandFeedback] = useState(false);
  const [expandAnnotations, setExpandAnnotations] = useState(false);
  const [editedFeedback, setEditedFeedback] = useState<string | null>(null);

  // Reset edited feedback when a new result arrives
  useEffect(() => {
    setEditedFeedback(null);
  }, [result]);

  const feedbackText = editedFeedback ?? result?.feedbackSuggestion ?? "";

  return (
    <TooltipProvider>
      <Card className="overflow-hidden border-blue-200 dark:border-blue-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-b px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-blue-100 dark:bg-blue-900 border flex items-center justify-center">
                <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">AI Grading Assistant</div>
                <div className="text-[11px] text-muted-foreground">
                  {result ? "Analyzed" : "Analyze student submissions with AI"}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              className="gap-2"
              disabled={disabled || isAnalyzing}
              onClick={onAnalyze}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {result ? "Re-analyze" : "Analyze"}
                </>
              )}
            </Button>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Loading state */}
          {isAnalyzing && (
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                Analyzing submission...
              </div>
              <Progress value={45} className="h-1.5" />
              <div className="text-[11px] text-center text-muted-foreground">
                Evaluating annotations and text answers
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !isAnalyzing && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-red-800 dark:text-red-300">Analysis failed</div>
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</div>
                  <Button size="sm" variant="outline" className="mt-2" onClick={onAnalyze}>
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!result && !isAnalyzing && !error && (
            <div className="py-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-sm text-muted-foreground">
                Click <strong>Analyze</strong> to get AI-powered grading suggestions
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                AI will evaluate annotations and answers against the rubric
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {result && !isAnalyzing && (
            <>
              {/* Score summary */}
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{result.totalScore}</div>
                      <div className="text-[11px] text-muted-foreground">/ {result.maxScore}</div>
                    </div>
                    <Separator orientation="vertical" className="h-10" />
                    <div>
                      <div className="text-sm font-medium">
                        {result.maxScore > 0 ? Math.round((result.totalScore / result.maxScore) * 100) : 0}%
                      </div>
                      <div className="text-[11px] text-muted-foreground">Overall score</div>
                    </div>
                  </div>

                  <Tooltip>
                    <TooltipTrigger>
                      <Badge className={cn("text-xs", confidenceBg(result.overallConfidence))}>
                        {Math.round(result.overallConfidence * 100)}% confidence
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-[200px]">
                      How confident the AI is in its grading. Higher is better. Always review before applying.
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Progress
                  value={result.maxScore > 0 ? Math.round((result.totalScore / result.maxScore) * 100) : 0}
                  className="mt-2 h-1.5"
                />
              </div>

              {/* Disease Identification */}
              {result.diseaseIdentification && (
                <>
                  <div>
                    <button
                      className="flex items-center gap-1 text-sm font-medium w-full text-left"
                      onClick={() => setExpandDisease(!expandDisease)}
                    >
                      <Stethoscope className="h-4 w-4 text-purple-500" />
                      Disease Identification
                      <Badge className={cn("ml-2 text-[10px]", confidenceBg(result.diseaseIdentification.confidence))}>
                        {Math.round(result.diseaseIdentification.confidence * 100)}% confidence
                      </Badge>
                      {expandDisease ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
                    </button>

                    {expandDisease && (
                      <div className="mt-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 p-3 space-y-3">
                        {/* Primary Diagnosis */}
                        <div>
                          <div className="text-xs font-semibold text-purple-800 dark:text-purple-300">
                            Primary Diagnosis
                          </div>
                          <div className="text-sm font-bold mt-0.5">
                            {result.diseaseIdentification.primaryDiagnosis}
                          </div>
                          {result.diseaseIdentification.severity !== "N/A" && (
                            <Badge variant="outline" className="mt-1 text-[10px]">
                              Severity: {result.diseaseIdentification.severity}
                            </Badge>
                          )}
                        </div>

                        {/* Key Findings */}
                        {result.diseaseIdentification.keyFindings.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">
                              Key Pathological Findings
                            </div>
                            <ul className="space-y-1">
                              {result.diseaseIdentification.keyFindings.map((f, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-[11px]">
                                  <Activity className="h-3 w-3 text-purple-500 mt-0.5 shrink-0" />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Affected Structures */}
                        {result.diseaseIdentification.affectedStructures.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">
                              Affected Structures
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {result.diseaseIdentification.affectedStructures.map((s, i) => (
                                <Badge key={i} variant="outline" className="text-[10px]">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Differential Diagnoses */}
                        {result.diseaseIdentification.differentialDiagnoses.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              Differential Diagnoses
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {result.diseaseIdentification.differentialDiagnoses.map((d, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px]">
                                  {d}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* Criteria breakdown */}
              <div>
                <button
                  className="flex items-center gap-1 text-sm font-medium w-full text-left"
                  onClick={() => setExpandCriteria(!expandCriteria)}
                >
                  <Target className="h-4 w-4 text-blue-500" />
                  Criteria Breakdown
                  {expandCriteria ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
                </button>

                {expandCriteria && (
                  <div className="mt-2 space-y-2">
                    {result.rubricSuggestions.map((s) => (
                      <div
                        key={s.criterionId}
                        className="rounded-lg border p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold capitalize">{s.criterionId}</div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {s.levelKey}
                            </Badge>
                            <span className="text-xs font-medium">{s.score} pts</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-relaxed">
                          {s.reasoning}
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="text-[10px] text-muted-foreground">Confidence:</div>
                          <div className={cn("text-[10px] font-medium", confidenceColor(s.confidence))}>
                            {Math.round(s.confidence * 100)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Strengths & Weaknesses */}
              <div className="space-y-2">
                {result.strengths.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                      Strengths
                    </div>
                    <ul className="space-y-1">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.weaknesses.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">
                      Areas for Improvement
                    </div>
                    <ul className="space-y-1">
                      {result.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px]">
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <Separator />

              {/* Feedback preview */}
              <div>
                <button
                  className="flex items-center gap-1 text-sm font-medium w-full text-left"
                  onClick={() => setExpandFeedback(!expandFeedback)}
                >
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  Feedback Preview
                  {expandFeedback ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
                </button>

                {expandFeedback && (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={feedbackText}
                      onChange={(e) => setEditedFeedback(e.target.value)}
                      className="min-h-[100px] text-xs"
                      placeholder="AI-generated feedback will appear here..."
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(feedbackText);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </Button>
                      {editedFeedback !== null && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => setEditedFeedback(null)}
                        >
                          Reset to AI
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Annotation comments */}
              {result.annotationComments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <button
                      className="flex items-center gap-1 text-sm font-medium w-full text-left"
                      onClick={() => setExpandAnnotations(!expandAnnotations)}
                    >
                      <Lightbulb className="h-4 w-4 text-blue-500" />
                      Annotation Feedback ({result.annotationComments.length})
                      {expandAnnotations ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
                    </button>

                    {expandAnnotations && (
                      <div className="mt-2 space-y-2">
                        {result.annotationComments.map((ac, i) => (
                          <div
                            key={i}
                            className="rounded-lg border p-2 flex items-start gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium truncate">
                                  {ac.annotationLabel}
                                </span>
                                {qualityBadge(ac.quality)}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-1">
                                {ac.comment}
                              </div>
                              {ac.diseaseRelevance && (
                                <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 flex items-start gap-1">
                                  <Stethoscope className="h-3 w-3 mt-0.5 shrink-0" />
                                  <span>{ac.diseaseRelevance}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 gap-1"
                  disabled={disabled}
                  onClick={onApplyScores}
                >
                  <Target className="h-3.5 w-3.5" />
                  Apply Scores
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 gap-1"
                  disabled={disabled}
                  onClick={() => onApplyFeedback(feedbackText)}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Apply Feedback
                </Button>
              </div>
              <Button
                size="sm"
                className="w-full gap-2"
                disabled={disabled}
                onClick={() => {
                  onApplyScores();
                  onApplyFeedback(feedbackText);
                }}
              >
                <Sparkles className="h-4 w-4" />
                Apply All
              </Button>

              {/* Metadata */}
              <div className="text-[10px] text-muted-foreground text-center">
                Generated {new Date(result.generatedAt).toLocaleTimeString()} •{" "}
                {result.modelUsed} • {result.latencyMs}ms
                {result.diseaseIdentification && (
                  <span className="text-purple-500 ml-1">• Disease-aware</span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
