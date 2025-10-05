import { ScrollArea } from "@/components/ui/scroll-area";
import { mockFeedback, mockActivityFeed } from "@/lib/mock-data";
import { Lightbulb, History, CheckCircle, MessageCircle } from "lucide-react";

export default function FeedbackPanel() {
  return (
    <div className="flex-1 flex flex-col" data-testid="feedback-panel">
      {/* Feedback Section */}
      <div className="flex-1 p-4 border-b border-border">
        <h3 className="font-semibold mb-4 flex items-center">
          <Lightbulb className="h-4 w-4 mr-2" />
          Teacher Feedback
        </h3>
        <ScrollArea className="h-32">
          <div className="space-y-3">
            {mockFeedback.map((feedback) => (
              <div 
                key={feedback.id}
                className={`p-3 rounded border-l-4 ${
                  feedback.type === "praise" 
                    ? "bg-green-50 border-green-500" 
                    : feedback.type === "suggestion"
                    ? "bg-yellow-50 border-yellow-500"
                    : "bg-red-50 border-red-500"
                }`}
                data-testid={`feedback-${feedback.id}`}
              >
                <p className={`text-sm font-medium ${
                  feedback.type === "praise" 
                    ? "text-green-800" 
                    : feedback.type === "suggestion"
                    ? "text-yellow-800"
                    : "text-red-800"
                }`}>
                  {feedback.type === "praise" 
                    ? "Excellent!" 
                    : feedback.type === "suggestion" 
                    ? "Suggestion" 
                    : "Correction"}
                </p>
                <p className={`text-sm ${
                  feedback.type === "praise" 
                    ? "text-green-700" 
                    : feedback.type === "suggestion"
                    ? "text-yellow-700"
                    : "text-red-700"
                }`}>
                  {feedback.message}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* History Timeline */}
      <div className="flex-1 p-4">
        <h3 className="font-semibold mb-4 flex items-center">
          <History className="h-4 w-4 mr-2" />
          Annotation History
        </h3>
        <ScrollArea className="h-32">
          <div className="space-y-3">
            {mockActivityFeed.map((activity) => (
              <div 
                key={activity.id}
                className="flex items-center space-x-3 text-sm"
                data-testid={`activity-${activity.id}`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  activity.color === "green" ? "bg-green-500" :
                  activity.color === "blue" ? "bg-blue-500" :
                  activity.color === "yellow" ? "bg-yellow-500" : "bg-gray-500"
                }`}></div>
                <div className="flex-1">
                  <p className="font-medium">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.timestamp.toLocaleTimeString()} ago
                  </p>
                </div>
                {activity.type === "annotation" && <CheckCircle className="h-3 w-3 text-green-500" />}
                {activity.type === "user" && <MessageCircle className="h-3 w-3 text-blue-500" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
