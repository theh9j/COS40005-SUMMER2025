import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAnnotation } from "@/hooks/use-annotation";
import { mockCases } from "@/lib/mock-data";
import AnnotationToolbar from "@/components/annotation-toolbar";
import AnnotationCanvas from "@/components/annotation-canvas";
import AnnotationHistory from "@/components/annotation-history";
import PeerComparison from "@/components/peer-comparison";
import ChatPanel from "@/components/chat-panel";
import FeedbackPanel from "@/components/feedback-panel";
import InlineTextEditor from "@/components/inline-text-editor";
import AnnotationPropertiesPanel from "@/components/annotation-properties-panel";
import { ArrowLeft, Save } from "lucide-react";
import DiscussionThread from "@/components/discussion/DiscussionThread";

export default function AnnotationView() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/annotation/:caseId");
  const { user } = useAuth();
  const caseId = params?.caseId || "";
  const case_ = mockCases.find(c => c.id === caseId);
  const annotation = useAnnotation(caseId, (user as any)?.user_id || "current-user");
  const [showHistory, setShowHistory] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showProperties, setShowProperties] = useState(false);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key === "Delete" && annotation.selectedAnnotationIds.length > 0) {
        annotation.deleteSelectedAnnotations();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "c" && annotation.selectedAnnotationIds.length > 0) {
        e.preventDefault();
        annotation.copySelectedAnnotations();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        annotation.pasteAnnotations();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "d" && annotation.selectedAnnotationIds.length > 0) {
        e.preventDefault();
        annotation.duplicateAnnotations(annotation.selectedAnnotationIds);
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [annotation]);

  useEffect(() => {
    if (annotation.selectedAnnotationIds.length > 0) {
      setShowProperties(true);
    }
  }, [annotation.selectedAnnotationIds]);

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

  const handleSaveVersion = () => {
    if (annotation.annotations.length > 0) {
      const lastAnnotation = annotation.annotations[annotation.annotations.length - 1];
      annotation.saveVersion(lastAnnotation.id, "Saved progress");
    }
  };

  const mockPeerAnnotations = [
    {
      user: {
        id: "peer1",
        email: "john@example.com",
        password: "",
        firstName: "John",
        lastName: "Doe",
        role: "student" as const,
        createdAt: new Date(),
      },
      annotations: [],
      color: "#3b82f6",
    },
    {
      user: {
        id: "peer2",
        email: "jane@example.com",
        password: "",
        firstName: "Jane",
        lastName: "Smith",
        role: "student" as const,
        createdAt: new Date(),
      },
      annotations: [],
      color: "#10b981",
    },
  ];

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
            <Button 
              className="bg-primary text-primary-foreground hover:opacity-90" 
              onClick={handleSaveVersion}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Version
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Annotation Toolbar */}
        <AnnotationToolbar 
          annotation={annotation}
          onToggleHistory={() => setShowHistory(!showHistory)}
          onToggleComparison={() => setShowComparison(!showComparison)}
          showHistory={showHistory}
          showComparison={showComparison}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex">
          {/* Canvas Area */}
          <div className="flex-1 p-4">
            <AnnotationCanvas
              imageUrl={case_.imageUrl}
              annotation={annotation}
              peerAnnotations={annotation.peerAnnotations}
              versionOverlay={annotation.versionOverlay}
            />
          </div>

          {/* Inline Text Editor is handled within the canvas now */}

          {/* Right Panels - Conditionally rendered */}
          {showHistory && (
            <AnnotationHistory
              versions={annotation.versions}
              currentVersion={annotation.currentVersion}
              onVersionSelect={annotation.previewVersion}
              onRestore={annotation.restoreVersion}
              onDelete={annotation.deleteVersion}
            />
          )}
          
          {showComparison && (
            <PeerComparison
              peerAnnotations={mockPeerAnnotations}
              currentUserId={(user as any)?.user_id || "current-user"}
              onToggleUserAnnotations={annotation.togglePeerAnnotations}
              onSelectForComparison={annotation.togglePeerAnnotations}
            />
          )}

          {showProperties && annotation.selectedAnnotationIds.length > 0 && (
            <AnnotationPropertiesPanel
              selectedAnnotations={annotation.annotations.filter(a => annotation.selectedAnnotationIds.includes(a.id))}
              onClose={() => setShowProperties(false)}
              onUpdateAnnotation={annotation.updateAnnotation}
              onDeleteAnnotations={annotation.deleteSelectedAnnotations}
              onLockAnnotations={annotation.lockAnnotations}
              onDuplicateAnnotations={annotation.duplicateAnnotations}
            />
          )}

          {!showHistory && !showComparison && !showProperties && (
            <aside className="w-80 bg-card border-l border-border flex flex-col">
              <DiscussionThread imageId={caseId} />
              <ChatPanel />
              <FeedbackPanel />
            </aside>
          )}
        </main>
      </div>
    </div>
  );
}
