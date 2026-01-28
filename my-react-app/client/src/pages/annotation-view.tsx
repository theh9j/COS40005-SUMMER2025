import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth, useHeartbeat } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
import AssignmentRequirements from "@/components/assignment-requirements";
import { ArrowLeft, Save, Bot, Eye, Clock, AlertCircle, ChevronDown } from "lucide-react";

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
  const { toast } = useToast();
  const caseId = params?.caseId || "";
  const case_ = mockCases.find((c) => c.id === caseId);

  const annotation = useAnnotation(caseId, user?.user_id || "current-user");

  // === Homework metadata (mock) theo case ===
  type HomeworkMeta = { id: string; dueAt: string; closed: boolean; description: string; points: number };
  const homeworkByCase: Record<string, HomeworkMeta> = {
    "case-1": { id: "hw-1", dueAt: new Date(Date.now() + 2 * 86400000).toISOString(), closed: false, description: "Analyze the medical imaging and create comprehensive annotations identifying key anatomical structures and pathological findings.", points: 100 },
    "case-2": { id: "hw-2", dueAt: new Date(Date.now() + 5 * 86400000).toISOString(), closed: false, description: "Detailed case analysis with peer comparison to learn different annotation approaches.", points: 85 },
    "case-3": { id: "hw-3", dueAt: new Date(Date.now() + 7 * 86400000).toISOString(), closed: true, description: "Final comprehensive annotation exercise with quality and accuracy requirements.", points: 90 },
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
  const [isCreating, setIsCreating] = useState(false);
  const [compare, setCompare] = useState<{ peer?: any; alpha?: number }>({});
  const [showClosedCaseNotification, setShowClosedCaseNotification] = useState(false);
  
  // Sidebar tab state: "annotate" | "collaborate" | "ai-assistant" | "homework"
  const [activeSidebarTab, setActiveSidebarTab] = useState<"annotate" | "collaborate" | "ai-assistant" | "homework">("collaborate");
  const [showTabDropdown, setShowTabDropdown] = useState(false);

  // Assignment requirements screen - check if already accepted
  const [showRequirements, setShowRequirements] = useState(() => {
    if (typeof window === "undefined") return true;
    const accepted = localStorage.getItem(`assignment_accepted_${caseId}`);
    return !accepted;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!showRequirements) {
      localStorage.setItem(`assignment_accepted_${caseId}`, "true");
    }
  }, [showRequirements, caseId]);

  const handleAcceptRequirements = () => {
    setShowRequirements(false);
    // Show closed case notification if case is closed
    if (hw?.closed) {
      setShowClosedCaseNotification(true);
    }
  };

  // Timer state - persistent with localStorage
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    if (typeof window === "undefined") return 0;
    const saved = localStorage.getItem(`timer_${caseId}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`timer_${caseId}`, elapsedSeconds.toString());
  }, [elapsedSeconds, caseId]);

  useEffect(() => {
    if (showRequirements) return;
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [showRequirements]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

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

  const handleBack = () => {
    if (user?.role === "student") setLocation("/student");
    else setLocation("/instructor");
  };

  if (!user || !case_) {
    return <div>Loading...</div>;
  }

  // Show assignment requirements first
  if (showRequirements) {
    return (
      <AssignmentRequirements
        case={case_}
        homework={hw}
        onReturn={handleBack}
        onAccept={handleAcceptRequirements}
      />
    );
  }

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
    if (peer) {
      // Get the peer's annotations from the mockPeerAnnotations
      const peerData = mockPeerAnnotations.find((p: any) => p.user.id === peer.id);
      if (peerData) {
        // Update the annotation state with peer annotations
        // This will be rendered on the canvas with the specified alpha (opacity)
      }
    }
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
            {/* Timer Display */}
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-muted rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono font-medium">{formatTime(elapsedSeconds)}</span>
            </div>
            
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
        onShowRequirements={() => setShowRequirements(true)}
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
              peerOpacity={compare.alpha || 0.5}
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

          {/* Default collaborative sidebar with dropdown tab selector */}
          {!showHistory && !showComparison && !showProperties && !showAIChat && !showAIVision && (
            <aside className="w-96 bg-card border-l border-border flex flex-col overflow-hidden">
              {/* Dropdown Tab Selector */}
              <div className="border-b border-border p-3">
                <div className="relative">
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setShowTabDropdown(!showTabDropdown)}
                  >
                    <span className="flex items-center gap-2">
                      {activeSidebarTab === "annotate" && <span className="text-base">📝</span>}
                      {activeSidebarTab === "collaborate" && <span className="text-base">👥</span>}
                      {activeSidebarTab === "ai-assistant" && <span className="text-base">🤖</span>}
                      {activeSidebarTab === "homework" && <span className="text-base">📋</span>}
                      <span className="capitalize">
                        {activeSidebarTab === "ai-assistant" ? "AI Assistant" : activeSidebarTab.charAt(0).toUpperCase() + activeSidebarTab.slice(1)}
                      </span>
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showTabDropdown ? "rotate-180" : ""}`} />
                  </Button>
                  
                  {/* Dropdown Menu with Smooth Animation */}
                  {showTabDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                      <button
                        className={`w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-muted transition-colors ${
                          activeSidebarTab === "annotate" ? "bg-primary/10" : ""
                        }`}
                        onClick={() => {
                          setActiveSidebarTab("annotate");
                          setShowTabDropdown(false);
                        }}
                      >
                        <span className="text-base">📝</span>
                        <span>Annotate</span>
                      </button>
                      <button
                        className={`w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-muted transition-colors ${
                          activeSidebarTab === "collaborate" ? "bg-primary/10" : ""
                        }`}
                        onClick={() => {
                          setActiveSidebarTab("collaborate");
                          setShowTabDropdown(false);
                        }}
                      >
                        <span className="text-base">👥</span>
                        <span>Collaborate</span>
                      </button>
                      <button
                        className={`w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-muted transition-colors ${
                          activeSidebarTab === "ai-assistant" ? "bg-primary/10" : ""
                        }`}
                        onClick={() => {
                          setActiveSidebarTab("ai-assistant");
                          setShowTabDropdown(false);
                        }}
                      >
                        <span className="text-base">🤖</span>
                        <span>AI Assistant</span>
                      </button>
                      <button
                        className={`w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-muted transition-colors ${
                          activeSidebarTab === "homework" ? "bg-primary/10" : ""
                        }`}
                        onClick={() => {
                          setActiveSidebarTab("homework");
                          setShowTabDropdown(false);
                        }}
                      >
                        <span className="text-base">📋</span>
                        <span>Homework</span>
                      </button>
                    </div>
                  )}
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

                  {/* Replace Collaboration Chat with Create Discussion button for this case */}
                  <div className="flex items-center justify-center py-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCreating) return;
                        if (!user || !user.user_id) {
                          toast({ title: "Not signed in", description: "Please sign in to create a discussion.", variant: 'destructive' });
                          return;
                        }

                        const prefill = {
                          title: case_.title,
                          message: case_.description || "",
                          tags: [case_.category].filter(Boolean),
                          caseId: caseId,
                        };
                        try {
                          sessionStorage.setItem("discussionPrefill", JSON.stringify(prefill));
                          try {
                            window.dispatchEvent(new CustomEvent('discussion-prefill', { detail: prefill }));
                          } catch (e) {}
                          setLocation("/student?openDiscussion=1");
                        } catch (err) {
                          console.error("Could not open discussion prefill", err);
                          toast({ title: 'Error', description: 'Unable to open discussion composer', variant: 'destructive' });
                        }
                      }}
                    >
                      Create Discussion
                    </Button>
                  </div>
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

              {/* Tab Content - Assignment Requirements */}
              {activeSidebarTab === "homework" && (
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  {hw && (
                    <div className="border rounded-lg p-4 bg-card space-y-4">
                      <div>
                        <h3 className="font-semibold text-sm mb-2">Assignment Details</h3>
                        <p className="text-xs text-muted-foreground mb-3">{hw.description}</p>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium">Total Points</span>
                          <Badge variant="outline" className="text-lg font-bold">{hw.points}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p><strong>Due:</strong> {new Date(hw.dueAt).toLocaleDateString()}</p>
                          <p><strong>Status:</strong> {hw.closed ? <span className="text-red-600 font-semibold">Closed</span> : <span className="text-green-600 font-semibold">Open</span>}</p>
                        </div>
                      </div>
                    </div>
                  )}
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

          {/* Closed Case Notification Modal */}
          {showClosedCaseNotification && hw?.closed && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-base">Assignment Closed</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      This assignment is closed and no longer accepting new submissions. You can still view and edit your existing annotations, but you will not be able to submit new work.
                    </p>
                  </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded p-3">
                  <p className="text-xs text-orange-900 dark:text-orange-200">
                    <strong>Note:</strong> The deadline for this assignment has passed. Contact your instructor if you have questions.
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => setShowClosedCaseNotification(false)}
                >
                  Understand
                </Button>
              </div>
            </div>
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

