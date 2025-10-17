import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth, useHeartbeat } from "@/hooks/use-auth";
import { useAnnotation } from "@/hooks/use-annotation";
import { mockCases } from "@/lib/mock-data";
import AnnotationToolbar from "@/components/annotation-toolbar";
import AnnotationCanvas from "@/components/annotation-canvas";
import ChatPanel from "@/components/chat-panel";
import FeedbackPanel from "@/components/feedback-panel";
import { ArrowLeft, Save } from "lucide-react";
import DiscussionThread from "@/components/discussion/DiscussionThread";

export default function AnnotationView() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/annotation/:caseId");
  const { user } = useAuth();
  const caseId = params?.caseId || "";
  const case_ = mockCases.find(c => c.id === caseId);
  const annotation = useAnnotation(caseId);
  useHeartbeat(user?.user_id);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  if (!user || !case_) {
    return <div>Loading...</div>;
  }

  const handleBack = () => {
    if (user.role === "student") {
      setLocation("/student");
    } else {
      setLocation("/instructor");
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="annotation-view">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">{case_.title} - Annotation</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full pulse-dot"></div>
              <span className="text-sm text-muted-foreground">Dr. Smith online</span>
            </div>
            <Button className="bg-primary text-primary-foreground hover:opacity-90" data-testid="button-save">
              <Save className="h-4 w-4 mr-2" />
              Save Progress
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Annotation Toolbar */}
        <AnnotationToolbar annotation={annotation} />

        {/* Main Content Area */}
        <main className="flex-1 flex">
          {/* Canvas Area */}
          <div className="flex-1 p-4">
            <AnnotationCanvas
              imageUrl={case_.imageUrl}
              annotation={annotation}
            />
          </div>

          {/* Right Sidebar */}
          <aside className="w-80 bg-card border-l border-border flex flex-col">
            <DiscussionThread imageId={caseId} />
            <ChatPanel />
            <FeedbackPanel />
          </aside>
        </main>
      </div>
    </div>
  );
}
