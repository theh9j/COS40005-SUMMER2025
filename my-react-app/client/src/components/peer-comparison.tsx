import { useState } from "react";
import { Annotation, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Eye, EyeOff, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PeerAnnotation {
  user: User;
  annotations: Annotation[];
  color: string;
}

interface PeerComparisonProps {
  peerAnnotations: PeerAnnotation[];
  currentUserId: string;
  onToggleUserAnnotations: (userId: string, visible: boolean) => void;
  onSelectForComparison: (userId: string) => void;
}

export default function PeerComparison({
  peerAnnotations,
  currentUserId,
  onToggleUserAnnotations,
  onSelectForComparison,
}: PeerComparisonProps) {
  const [visibleUsers, setVisibleUsers] = useState<Set<string>>(new Set([currentUserId]));
  const [comparisonMode, setComparisonMode] = useState<"overlay" | "side-by-side">("overlay");

  const handleToggleUser = (userId: string) => {
    const newVisibleUsers = new Set(visibleUsers);
    if (newVisibleUsers.has(userId)) {
      newVisibleUsers.delete(userId);
    } else {
      newVisibleUsers.add(userId);
    }
    setVisibleUsers(newVisibleUsers);
    onToggleUserAnnotations(userId, !visibleUsers.has(userId));
  };

  const handleSelectAll = () => {
    const allUserIds = peerAnnotations.map((pa) => pa.user.id);
    setVisibleUsers(new Set(allUserIds));
    allUserIds.forEach((userId) => {
      if (!visibleUsers.has(userId)) {
        onToggleUserAnnotations(userId, true);
      }
    });
  };

  const handleDeselectAll = () => {
    visibleUsers.forEach((userId) => {
      if (userId !== currentUserId) {
        onToggleUserAnnotations(userId, false);
      }
    });
    setVisibleUsers(new Set([currentUserId]));
  };

  const visibleCount = visibleUsers.size;
  const totalAnnotations = peerAnnotations.reduce((sum, pa) => sum + pa.annotations.length, 0);

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Peer Comparison
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {visibleCount} user{visibleCount !== 1 ? 's' : ''} visible • {totalAnnotations} annotations
        </p>
      </div>

      <div className="p-4 border-b border-border space-y-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={comparisonMode === "overlay" ? "default" : "outline"}
            className="flex-1 text-xs"
            onClick={() => setComparisonMode("overlay")}
          >
            <Layers className="h-3 w-3 mr-1" />
            Overlay
          </Button>
          <Button
            size="sm"
            variant={comparisonMode === "side-by-side" ? "default" : "outline"}
            className="flex-1 text-xs"
            onClick={() => setComparisonMode("side-by-side")}
          >
            <Layers className="h-3 w-3 mr-1" />
            Side-by-Side
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={handleSelectAll}
          >
            Show All
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={handleDeselectAll}
          >
            Hide All
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {peerAnnotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No peer annotations yet</p>
              <p className="text-xs mt-1">Others' work will appear here</p>
            </div>
          ) : (
            peerAnnotations.map((peerAnnotation) => {
              const isVisible = visibleUsers.has(peerAnnotation.user.id);
              const isCurrentUser = peerAnnotation.user.id === currentUserId;

              return (
                <Card
                  key={peerAnnotation.user.id}
                  className={`p-3 transition-all ${
                    isVisible ? "border-primary" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isVisible}
                      onCheckedChange={() => handleToggleUser(peerAnnotation.user.id)}
                      disabled={isCurrentUser}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-full border-2"
                          style={{
                            backgroundColor: peerAnnotation.color,
                            borderColor: peerAnnotation.color,
                          }}
                        />
                        <span className="font-medium truncate">
                          {peerAnnotation.user.firstName} {peerAnnotation.user.lastName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {peerAnnotation.annotations.length} annotation
                          {peerAnnotation.annotations.length !== 1 ? 's' : ''}
                        </Badge>
                        <Badge
                          variant={peerAnnotation.user.role === "instructor" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {peerAnnotation.user.role}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {peerAnnotation.annotations.slice(0, 3).map((annotation, idx) => (
                          <div
                            key={annotation.id}
                            className="text-xs text-muted-foreground flex items-center gap-1"
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: annotation.color }}
                            />
                            <span className="capitalize">{annotation.type}</span>
                            {annotation.label && <span>• {annotation.label}</span>}
                          </div>
                        ))}
                        {peerAnnotation.annotations.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{peerAnnotation.annotations.length - 3} more
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2 text-xs"
                        onClick={() => onSelectForComparison(peerAnnotation.user.id)}
                      >
                        {isVisible ? (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Show
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
