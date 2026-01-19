import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, Lightbulb, Target, Loader2, Sparkles } from "lucide-react";
import { aiService, MedicalContext } from "@/lib/ai-service";

interface AnnotationSuggestion {
  region: string;
  confidence: number;
  reasoning: string;
  priority: "high" | "medium" | "low";
}

interface AISuggestionsProps {
  imageUrl: string;
  context: MedicalContext;
  onSuggestionClick?: (suggestion: AnnotationSuggestion) => void;
  className?: string;
}

export default function AIAnnotationSuggestions({
  imageUrl,
  context,
  onSuggestionClick,
  className = ""
}: AISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<AnnotationSuggestion[]>([]);
  const [teachingPoints, setTeachingPoints] = useState<string[]>([]);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const analyzeImage = async () => {
    if (!imageUrl || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const analysis = await aiService.analyzeImage(imageUrl, context, "teaching");
      setSuggestions(analysis.suggestedAreas);
      setTeachingPoints(analysis.teachingPoints);
      setNextSteps(analysis.nextSteps);
      setHasAnalyzed(true);
    } catch (error) {
      console.error("Image analysis failed:", error);
      // Fallback suggestions
      setSuggestions([
        {
          region: "Central area",
          confidence: 0.7,
          reasoning: "This region often contains key findings",
          priority: "medium"
        }
      ]);
      setTeachingPoints(["Consider systematic approach to review"]);
      setNextSteps(["Start with overall impression"]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            AI Vision Assistant
          </CardTitle>
          {!hasAnalyzed && (
            <Button
              onClick={analyzeImage}
              disabled={isAnalyzing}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {isAnalyzing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
              {isAnalyzing ? "Analyzing..." : "Analyze Image"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasAnalyzed && !isAnalyzing && (
          <div className="text-center py-6 text-muted-foreground">
            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Click "Analyze Image" to get AI suggestions</p>
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-6">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-purple-500" />
            <p className="text-sm text-muted-foreground">AI is analyzing the medical image...</p>
          </div>
        )}

        {hasAnalyzed && (
          <>
            {/* Suggested Areas */}
            {suggestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-500" />
                  <h3 className="font-medium text-sm">Suggested Focus Areas</h3>
                </div>
                
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => onSuggestionClick?.(suggestion)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm">{suggestion.region}</span>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPriorityColor(suggestion.priority)}`}
                          >
                            {suggestion.priority}
                          </Badge>
                          <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{suggestion.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Teaching Points */}
            {teachingPoints.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <h3 className="font-medium text-sm">Learning Tips</h3>
                </div>
                <ul className="space-y-1">
                  {teachingPoints.map((point, index) => (
                    <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="w-1 h-1 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            {nextSteps.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Suggested Next Steps</h3>
                <ol className="space-y-1">
                  {nextSteps.map((step, index) => (
                    <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full text-[10px] font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Re-analyze button */}
            <Button
              onClick={() => {
                setHasAnalyzed(false);
                setSuggestions([]);
                setTeachingPoints([]);
                setNextSteps([]);
              }}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              <Sparkles className="h-3 w-3" />
              Get New Analysis
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}