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

// Collaborative imports
import { useVersions } from "@/hooks/use-versions";
import { usePresence } from "@/hooks/use-presence";
import VersionList from "@/components/versions/VersionList";
import CompareToggle from "@/components/compare/CompareToggle";
import PresenceBar from "@/components/presence/PresenceBar";

export default function AnnotationView() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ caseId: string }>("/annotation/:caseId");
  const { user } = useAuth();
  const caseId = params?.caseId || "";
  const case_ = mockCases.find((c) => c.id === caseId);
  const annotation = useAnnotation(caseId);

  useHeartbeat(user?.user_id);
  const presence = usePresence(caseId, user?.user_id ?? "unknown");
  const { mine, peers, create } = useVersions(caseId);
  const [compare, setCompare] = useState<{ peer?: any; alpha?: number }>({});

  useEffect(() => {
    if (!user) setLocation("/login");
  }, [user, setLocation]);

  if (!user || !case_) {
    return <div>Loading...</div>;
  }

  const handleBack = () => {
    if (user.role === "student") setLocation("/student");
    else setLocation("/instructor");
  };

  // Save version (mock vì hook hiện tại chưa có getData)
  const handleSaveVersion = async () => {
    try {
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

  // Compare (chưa có overlay thực nên log ra console)
  const handleCompareChange = (peer?: any, alpha = 0.4) => {
    setCompare({ peer, alpha });
    console.log("Compare with peer:", peer, "opacity:", alpha);
  };

  return (
    <div className="min-h-screen bg-background" data-testid="annotation-view">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">
              {case_.title} - Annotation
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full pulse-dot" />
              <span className="text-sm text-muted-foreground">
                {presence?.users?.length
                  ? `Online: ${presence.users.map((u) => u.name).join(", ")}`
                  : "Online: You"}
              </span>
            </div>
            <Button
              className="bg-primary text-primary-foreground hover:opacity-90"
              onClick={handleSaveVersion}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Version
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        <AnnotationToolbar annotation={annotation} />

        <main className="flex-1 flex">
          <div className="flex-1 p-4">
            <AnnotationCanvas
              imageUrl={case_.imageUrl}
              annotation={annotation}
            />
          </div>

          {/* Collaborative Sidebar */}
          <aside className="w-80 bg-card border-l border-border flex flex-col">
            <div className="p-3 border-b">
              <h4 className="font-semibold">Collaboration</h4>
              <PresenceBar presence={presence} />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={handleSaveVersion}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Version
              </Button>

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

              <CompareToggle
                peers={peers}
                onChange={(peer, alpha) => handleCompareChange(peer, alpha)}
              />

              <DiscussionThread imageId={caseId} />
              <ChatPanel />
              <FeedbackPanel />
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
