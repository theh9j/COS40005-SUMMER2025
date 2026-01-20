import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth, useHeartbeat } from "@/hooks/use-auth";
import { useAnnotation } from "@/hooks/use-annotation";
import { useSubmission, SubmissionFile } from "@/hooks/use-submission";
import { mockCases } from "@/lib/mock-data";
import AnnotationToolbar from "@/components/annotation-toolbar";
import AnnotationCanvas from "@/components/annotation-canvas";
import AnnotationHistory from "@/components/annotation-history";
import PeerComparison from "@/components/peer-comparison";
import ChatPanel from "@/components/chat-panel";
import FeedbackPanel from "@/components/feedback-panel";
import InlineTextEditor from "@/components/inline-text-editor";
import AnnotationPropertiesPanel from "@/components/annotation-properties-panel";
import AIChatAssistant from "@/components/ai-chat-assistant";
import AIAnnotationSuggestions from "@/components/ai-annotation-suggestions";
import SubmissionPanel from "@/components/submission-panel";
import { ArrowLeft, Save, Bot, Eye } from "lucide-react";

// Collaborative imports
import { useVersions } from "@/hooks/use-versions";
import { usePresence } from "@/hooks/use-presence";
import VersionList from "@/components/versions/VersionList";
import CompareToggle from "@/components/compare/CompareToggle";
import PresenceBar from "@/components/presence/PresenceBar";

// + add
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AnnotationView() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ caseId: string }>("/annotation/:caseId");
  const { user } = useAuth();
  const caseId = params?.caseId || "";
  const case_ = mockCases.find((c) => c.id === caseId);

  const annotation = useAnnotation(caseId, user?.user_id || "current-user");

  // === Homework metadata (mock) theo case ===
  type HomeworkMeta = { id: string; dueAt: string; closed: boolean };
  const homeworkByCase: Record<string, HomeworkMeta> = {
    "case-1": { id: "hw-1", dueAt: new Date(Date.now() + 2 * 86400000).toISOString(), closed: false },
    "case-2": { id: "hw-2", dueAt: new Date(Date.now() + 5 * 86400000).toISOString(), closed: false },
    "case-3": { id: "hw-3", dueAt: new Date(Date.now() + 7 * 86400000).toISOString(), closed: true },
  };

  const hw = homeworkByCase[caseId];
  const { submission, loading: subLoading, error: subError, submitHomework, uploadFile, fetchSubmission } = useSubmission(
    hw?.id || "",
    caseId,
    user?.user_id || "current-user"
  );

  // Load submission on mount
  useEffect(() => {
    if (hw?.id && caseId && user?.user_id) {
      fetchSubmission();
    }
  }, [hw?.id, caseId, user?.user_id, fetchSubmission]);

  // Heartbeat and presence
  useHeartbeat(user?.user_id);
  const presence = usePresence(caseId, user?.user_id ?? "unknown");

  // Versions
  const { mine, peers, create } = useVersions(caseId);

  // UI state toggles
  const [showHistory, setShowHistory] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showAIVision, setShowAIVision] = useState(false);
  const [aiChatMinimized, setAIChatMinimized] = useState(false);
  const [compare, setCompare] = useState<{ peer?: any; alpha?: number }>({});
  
  // Sidebar tab state: "annotate" | "collaborate" | "ai-assistant" | "homework"
  const [activeSidebarTab, setActiveSidebarTab] = useState<"annotate" | "collaborate" | "ai-assistant" | "homework">("collaborate");

  // Redirect if not logged in
  useEffect(() => {
    if (!user) setLocation("/login");
  }, [user, setLocation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key === "Delete" && annotation.selectedAnnotationIds.length > 0) {
        annotation.deleteSelectedAnnotations();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "c" &&
        annotation.selectedAnnotationIds.length > 0
      ) {
        e.preventDefault();
        // annotation.copySelectedAnnotations(); // Assuming this exists on your hook
      } else if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        // annotation.pasteAnnotations(); // Assuming this exists on your hook
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "d" &&
        annotation.selectedAnnotationIds.length > 0
      ) {
        e.preventDefault();
        annotation.duplicateAnnotations(annotation.selectedAnnotationIds);
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [annotation]);

  // Fix 3: Auto-show/hide properties when selecting/deselecting
  useEffect(() => {
    if (annotation.selectedAnnotationIds.length > 0) {
      setShowProperties(true);
    } else {
      setShowProperties(false); // This hides the panel when deselecting
    }
  }, [annotation.selectedAnnotationIds]);

  if (!user || !case_) {
    return <div>Loading...</div>;
  }

  const handleBack = () => {
    if (user.role === "student") setLocation("/student");
    else setLocation("/instructor");
  };

  // Save a version (both local + collaborative)
  const handleSaveVersion = async () => {
    try {
      annotation.saveAllAnnotationsSnapshot();
      const mockData = {
        annotations: annotation.annotations,
        tool: annotation.tool,
        color: annotation.color,
        createdAt: new Date(),
      };
      await create(mockData);
      console.log("Saved version:", mockData);
    } catch (e) {
      console.error("Save version failed", e);
    }
  };

  // Compare toggle
  const handleCompareChange = (peer?: any, alpha = 0.4) => {
    setCompare({ peer, alpha });
    console.log("Compare with peer:", peer, "opacity:", alpha);
  };

  // Mock peer annotations (for offline/demo mode)
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
            <h1 className="text-lg font-semibold">
              {case_.title} - Annotation
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIVision(!showAIVision)}
              className={showAIVision ? "bg-purple-50 border-purple-200" : ""}
            >
              <Eye className="h-4 w-4 mr-2" />
              AI Vision
            </Button>
            <div className="flex items-center space-x-2 pl-3 border-l border-border">
              <div className="w-2 h-2 bg-green-500/80 dark:bg-green-400/80 rounded-full pulse-dot" />
              <span className="text-sm text-muted-foreground">
                {presence?.users?.length
                  ? `${presence.users.map((u) => u.name).join(", ")}`
                  : "You"}
              </span>
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

      {/* Annotation Toolbar (Horizontal at top) */}
      <AnnotationToolbar
        annotation={annotation}
        onToggleHistory={() => setShowHistory(!showHistory)}
        onToggleComparison={() => setShowComparison(!showComparison)}
        showHistory={showHistory}
        showComparison={showComparison}
      />

      {/* Main layout */}
      <div className="flex h-[calc(100vh-8rem)]">
        {/* Canvas area */}
        <main className="flex-1 flex overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 p-4 overflow-auto">
            <AnnotationCanvas
              imageUrl={case_.imageUrl}
              annotation={annotation}
              peerAnnotations={annotation.peerAnnotations}
              versionOverlay={annotation.versionOverlay}
            />
          </div>

          {/* Conditional right panels */}
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
              currentUserId={user?.user_id || "current-user"}
              onToggleUserAnnotations={annotation.togglePeerAnnotations}
              onSelectForComparison={annotation.togglePeerAnnotations}
            />
          )}

          {showProperties && annotation.selectedAnnotationIds.length > 0 && (
            <AnnotationPropertiesPanel
              selectedAnnotations={annotation.annotations.filter((a) =>
                annotation.selectedAnnotationIds.includes(a.id)
              )}
              onClose={() => setShowProperties(false)}
              onUpdateAnnotation={annotation.updateAnnotation}
              onDeleteAnnotations={annotation.deleteSelectedAnnotations}
              onLockAnnotations={annotation.lockAnnotations}
              onDuplicateAnnotations={annotation.duplicateAnnotations}
              onToggleVisibility={annotation.toggleAnnotationsVisibility}
            />
          )}

          {/* AI Vision Assistant Panel */}
          {showAIVision && (
            <aside className="w-80 bg-card border-l border-border overflow-y-auto">
              <AIAnnotationSuggestions
                imageUrl={case_.imageUrl}
                context={{
                  caseId: caseId,
                  caseTitle: case_.title,
                  caseDescription: case_.description,
                  imageUrl: case_.imageUrl,
                  annotations: annotation.annotations,
                  homeworkInstructions: hw ? "Complete annotations and submit homework" : undefined,
                  userRole: user.role as "student" | "instructor",
                  userId: user.user_id || ""
                }}
                onSuggestionClick={(suggestion) => {
                  console.log("Suggestion clicked:", suggestion);
                }}
                className="h-full"
              />
            </aside>
          )}

          {/* AI Chat Assistant Panel */}
          {showAIChat && (
            <aside className="w-96 bg-card border-l border-border overflow-y-auto">
              <AIChatAssistant
                context={{
                  caseId: caseId,
                  caseTitle: case_.title,
                  caseDescription: case_.description,
                  imageUrl: case_.imageUrl,
                  annotations: annotation.annotations,
                  homeworkInstructions: hw ? "Complete annotations and submit homework" : undefined,
                  userRole: user.role as "student" | "instructor",
                  userId: user.user_id || ""
                }}
                isMinimized={aiChatMinimized}
                onMinimize={() => setAIChatMinimized(!aiChatMinimized)}
                onClose={() => setShowAIChat(false)}
                className="h-full"
              />
            </aside>
          )}

          {/* Default collaborative sidebar with 2x2 tab grid */}
          {!showHistory && !showComparison && !showProperties && !showAIChat && !showAIVision && (
            <aside className="w-96 bg-card border-l border-border flex flex-col overflow-hidden">
              {/* 2x2 Tab Grid */}
              <div className="border-b border-border p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={activeSidebarTab === "annotate" ? "default" : "secondary"}
                    className="text-sm h-9"
                    onClick={() => setActiveSidebarTab("annotate")}
                  >
                    <span className="w-4 h-4 mr-1">📝</span>
                    Annotate
                  </Button>
                  <Button
                    variant={activeSidebarTab === "collaborate" ? "default" : "secondary"}
                    className="text-sm h-9"
                    onClick={() => setActiveSidebarTab("collaborate")}
                  >
                    <span className="w-4 h-4 mr-1">👥</span>
                    Collaborate
                  </Button>
                  <Button
                    variant={activeSidebarTab === "ai-assistant" ? "default" : "secondary"}
                    className="text-sm h-9"
                    onClick={() => setActiveSidebarTab("ai-assistant")}
                  >
                    <span className="w-4 h-4 mr-1">🤖</span>
                    AI Assistant
                  </Button>
                  <Button
                    variant={activeSidebarTab === "homework" ? "default" : "secondary"}
                    className="text-sm h-9"
                    onClick={() => setActiveSidebarTab("homework")}
                  >
                    <span className="w-4 h-4 mr-1">📋</span>
                    Homework
                  </Button>
                </div>
              </div>

              {/* Tab Content - Annotate */}
              {activeSidebarTab === "annotate" && (
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  <div className="border rounded-lg p-3 bg-muted/50">
                    <h4 className="font-semibold text-sm mb-2">Current Annotations</h4>
                    <p className="text-xs text-muted-foreground">
                      {annotation.annotations.length} annotation{annotation.annotations.length !== 1 ? 's' : ''} created
                    </p>
                  </div>
                  {annotation.selectedAnnotationIds.length > 0 && (
                    <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950">
                      <h4 className="font-semibold text-sm mb-2">Properties</h4>
                      <div className="text-xs text-muted-foreground">
                        {annotation.selectedAnnotationIds.length} selected
                      </div>
                    </div>
                  )}
                  <CompareToggle
                    peers={peers}
                    onChange={(peer, alpha) =>
                      handleCompareChange(peer, alpha)
                    }
                  />
                </div>
              )}

              {/* Tab Content - Collaborate */}
              {activeSidebarTab === "collaborate" && (
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  <VersionList
                    title="My versions"
                    items={mine}
                    onSelect={(v) =>
                      console.log("Load my version:", v.data || v)
                    }
                  />
                  <VersionList
                    title="Peers' versions"
                    items={peers}
                    onSelect={(v) =>
                      console.log("Load peer version:", v.data || v)
                    }
                  />

                  <ChatPanel />
                </div>
              )}

              {/* Tab Content - AI Assistant */}
              {activeSidebarTab === "ai-assistant" && (
                <div className="flex-1 overflow-y-auto flex flex-col">
                  <AIChatAssistant
                    context={{
                      caseId: caseId,
                      caseTitle: case_.title,
                      caseDescription: case_.description,
                      imageUrl: case_.imageUrl,
                      annotations: annotation.annotations,
                      homeworkInstructions: hw ? "Complete annotations and submit homework" : undefined,
                      userRole: user.role as "student" | "instructor",
                      userId: user.user_id || ""
                    }}
                    isMinimized={false}
                    onMinimize={() => {}}
                    onClose={() => setActiveSidebarTab("collaborate")}
                    className="h-full"
                  />
                </div>
              )}

              {/* Tab Content - Homework */}
              {activeSidebarTab === "homework" && (
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  {hw ? (
                    <>
                      <SubmissionPanel
                        status={submission?.status || "none"}
                        dueDate={hw.dueAt}
                        score={submission?.score}
                        notes={submission?.notes}
                        files={submission?.files}
                        closed={hw.closed}
                        loading={subLoading}
                        error={subError}
                        onSubmit={async (notes, files) => {
                          await submitHomework({
                            notes,
                            files,
                            answers: [],
                          });
                        }}
                        onUploadFile={uploadFile}
                      />
                      {submission?.status === "graded" && (
                        <FeedbackPanel />
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        No homework assignment for this case.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </aside>
          )}

          {/* Floating AI Chat (when minimized) */}
          {showAIChat && aiChatMinimized && (
            <AIChatAssistant
              context={{
                caseId: caseId,
                caseTitle: case_.title,
                caseDescription: case_.description,
                imageUrl: case_.imageUrl,
                annotations: annotation.annotations,
                homeworkInstructions: hw ? "Complete annotations and submit homework" : undefined,
                userRole: user.role as "student" | "instructor",
                userId: user.user_id || ""
              }}
              isMinimized={true}
              onMinimize={() => setAIChatMinimized(false)}
              onClose={() => setShowAIChat(false)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

