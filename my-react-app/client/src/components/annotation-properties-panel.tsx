import { Annotation } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, Unlock, Copy, Trash2, X, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

interface AnnotationPropertiesPanelProps {
  selectedAnnotations: Annotation[];
  allAnnotations?: Annotation[];
  className?: string;
  onClose: () => void;
  onSelectAnnotation?: (id: string) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotations: (ids: string[]) => void;
  onLockAnnotations: (ids: string[], locked: boolean) => void;
  onDuplicateAnnotations: (ids: string[]) => void;
  onToggleVisibility: (ids: string[], visible: boolean) => void;
}

export default function AnnotationPropertiesPanel({
  selectedAnnotations,
  allAnnotations = [],
  className,
  onClose,
  onSelectAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotations,
  onLockAnnotations,
  onDuplicateAnnotations,
  onToggleVisibility,
}: AnnotationPropertiesPanelProps) {
  const isMultiSelect = selectedAnnotations.length > 1;
  const firstSelected = selectedAnnotations[0];

  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(firstSelected?.id || null);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#ef4444");
  const [creatorName, setCreatorName] = useState<string>("");

  const allAnnotationsSafe = allAnnotations.length > 0 ? allAnnotations : selectedAnnotations;

  useEffect(() => {
    if (selectedAnnotations.length === 0) {
      setActiveAnnotationId(null);
      return;
    }

    const selectedIds = new Set(selectedAnnotations.map((ann) => ann.id));
    if (!activeAnnotationId || !selectedIds.has(activeAnnotationId)) {
      setActiveAnnotationId(selectedAnnotations[0].id);
    }
  }, [selectedAnnotations, activeAnnotationId]);

  const activeAnnotation = useMemo(() => {
    if (isMultiSelect) return null;
    if (!activeAnnotationId) return firstSelected || null;
    return (
      allAnnotationsSafe.find((ann) => ann.id === activeAnnotationId) ||
      selectedAnnotations.find((ann) => ann.id === activeAnnotationId) ||
      firstSelected ||
      null
    );
  }, [isMultiSelect, activeAnnotationId, allAnnotationsSafe, selectedAnnotations, firstSelected]);

  const selectedIds = useMemo(() => {
    if (isMultiSelect) return selectedAnnotations.map((a) => a.id);
    return activeAnnotation ? [activeAnnotation.id] : [];
  }, [isMultiSelect, selectedAnnotations, activeAnnotation]);

  const selectedForActions = useMemo(() => {
    if (isMultiSelect) return selectedAnnotations;
    return activeAnnotation ? [activeAnnotation] : [];
  }, [isMultiSelect, selectedAnnotations, activeAnnotation]);

  useEffect(() => {
    if (isMultiSelect) {
      setLabel("");
      setColor("#ef4444");
      setCreatorName("");
      return;
    }

    if (!activeAnnotation) {
      setLabel("");
      setColor("#ef4444");
      setCreatorName("");
      return;
    }

    const coords: any = activeAnnotation.coordinates;
    setLabel(activeAnnotation.type === "text" ? coords?.text || "" : activeAnnotation.label || "");
    setColor(activeAnnotation.color || "#ef4444");

    if (activeAnnotation.userId) {
      fetchCreatorName(activeAnnotation.userId);
    } else {
      setCreatorName("Unknown");
    }
  }, [isMultiSelect, activeAnnotation?.id, activeAnnotation?.updatedAt]);

  const fetchCreatorName = async (userId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        const firstName = data.firstName || data.first_name || "";
        const lastName = data.lastName || data.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim();
        setCreatorName(fullName || userId);
      } else {
        setCreatorName(userId);
      }
    } catch (e) {
      console.error("Failed to fetch creator name:", e);
      setCreatorName(userId);
    }
  };

  const currentIndex = useMemo(() => {
    if (!activeAnnotation || allAnnotationsSafe.length === 0) return -1;
    return allAnnotationsSafe.findIndex((ann) => ann.id === activeAnnotation.id);
  }, [activeAnnotation, allAnnotationsSafe]);

  const canNavigate = !isMultiSelect && allAnnotationsSafe.length > 1 && currentIndex >= 0;

  const navigateBy = (direction: -1 | 1) => {
    if (!canNavigate) return;
    const nextIndex = (currentIndex + direction + allAnnotationsSafe.length) % allAnnotationsSafe.length;
    const next = allAnnotationsSafe[nextIndex];
    if (!next) return;
    setActiveAnnotationId(next.id);
    onSelectAnnotation?.(next.id);
  };

  const isLocked = selectedForActions.some((ann: any) => ann.locked);
  const areHidden = selectedForActions.length > 0 && selectedForActions.every((ann: any) => ann.visible === false);
  const canEditAppearance = selectedIds.length > 0 && !isLocked;

  const handleApplyChanges = () => {
    if (!canEditAppearance) return;

    selectedIds.forEach((id) => {
      const ann = selectedForActions.find((a) => a.id === id);
      if (!ann) return;

      const updates: Partial<Annotation> = { color };
      if (ann.type === "text") {
        updates.coordinates = { ...(ann.coordinates as any), text: label } as any;
      } else {
        updates.label = label;
      }

      onUpdateAnnotation(id, updates);
    });
  };

  const handleColorChange = (nextColor: string) => {
    if (!canEditAppearance) return;

    setColor(nextColor);
    if (!isMultiSelect && activeAnnotation) {
      onUpdateAnnotation(activeAnnotation.id, { color: nextColor });
    }
  };

  const handleToggleVisibility = () => {
    if (selectedIds.length === 0) return;
    onToggleVisibility(selectedIds, areHidden);
  };

  return (
    <aside className={`w-80 bg-card flex flex-col h-full transition-all duration-200 ease-out ${className ?? ""}`}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">
          {isMultiSelect ? `${selectedAnnotations.length} Items Selected` : "Annotation Properties"}
        </h3>
        <div className="flex items-center gap-1">
          {canNavigate && (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigateBy(-1)} title="Previous annotation">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-1 select-none">
                {currentIndex + 1}/{allAnnotationsSafe.length}
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigateBy(1)} title="Next annotation">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {!isMultiSelect && activeAnnotation && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <p className="text-sm capitalize">{activeAnnotation.type}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Creator</Label>
                <p className="text-sm">{creatorName || "Unknown"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Created</Label>
                <p className="text-sm">
                  {activeAnnotation.createdAt ? new Date(activeAnnotation.createdAt).toLocaleString() : "Unknown"}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="label">
              {isMultiSelect ? "Label" : activeAnnotation?.type === "text" ? "Text Content" : "Label (Text Inside Shape)"}
            </Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={isMultiSelect ? "Apply to all selected" : "Enter text"}
              disabled={!canEditAppearance}
            />
            {isLocked && (
              <p className="text-xs text-muted-foreground">
                Locked annotations cannot change label or color.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-12 h-10 p-1"
                disabled={!canEditAppearance}
              />
              <Input
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                placeholder="#ff0000"
                className="bg-background text-foreground"
                disabled={!canEditAppearance}
              />
            </div>
          </div>

          <Button className="w-full" onClick={handleApplyChanges} disabled={!canEditAppearance}>
            Apply Changes
          </Button>

          <div className="space-y-2 pt-4 border-t">
            <Label className="text-sm font-semibold">Actions</Label>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleToggleVisibility}
              disabled={selectedIds.length === 0}
            >
              {areHidden ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              {areHidden ? "Show" : "Hide"}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onLockAnnotations(selectedIds, !isLocked)}
              disabled={selectedIds.length === 0}
            >
              {isLocked ? (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Lock
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onDuplicateAnnotations(selectedIds)}
              disabled={selectedIds.length === 0}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>

            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => onDeleteAnnotations(selectedIds)}
              disabled={selectedIds.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
