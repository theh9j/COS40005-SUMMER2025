import { Annotation } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, Unlock, Copy, Trash2, X, Eye, EyeOff } from "lucide-react"; // Import Eye and EyeOff
import { useState, useEffect } from "react"; // Import useEffect

interface AnnotationPropertiesPanelProps {
  selectedAnnotations: Annotation[];
  onClose: () => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotations: (ids: string[]) => void;
  onLockAnnotations: (ids: string[], locked: boolean) => void;
  onDuplicateAnnotations: (ids: string[]) => void;
  onToggleVisibility: (ids: string[], visible: boolean) => void; // Add prop for visibility
}

// const colors = [
//   "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#f97316",
// ]; // No longer needed

export default function AnnotationPropertiesPanel({
  selectedAnnotations,
  onClose,
  onUpdateAnnotation,
  onDeleteAnnotations,
  onLockAnnotations,
  onDuplicateAnnotations,
  onToggleVisibility, // Destructure new prop
}: AnnotationPropertiesPanelProps) {
  
  const isMultiSelect = selectedAnnotations.length > 1;
  const firstAnn = selectedAnnotations[0];

  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#ef4444");

  // Update state when selection changes
  useEffect(() => {
    if (selectedAnnotations.length === 1) {
      setLabel(firstAnn.type === 'text' ? firstAnn.coordinates?.text || "" : firstAnn.label || "");
      setColor(firstAnn.color || "#ef4444");
    } else {
      setLabel(""); // Clear label for multi-select
      setColor("#ef4444"); // Reset color
    }
  }, [selectedAnnotations, firstAnn]);


  const isLocked = selectedAnnotations.some((ann: any) => ann.locked);
  // Fix 2: Logic for hide button
  const areHidden = selectedAnnotations.length > 0 && firstAnn.visible === false;
  const selectedIds = selectedAnnotations.map(a => a.id);

  const handleApplyChanges = () => {
    selectedIds.forEach(id => {
      const ann = selectedAnnotations.find(a => a.id === id);
      if (!ann) return;

      const updates: Partial<Annotation> = { color };

      // Apply label to shapes, text to text annotations
      if (ann.type === 'text') {
          updates.coordinates = { ...ann.coordinates, text: label };
      } else {
          updates.label = label;
      }
      
      onUpdateAnnotation(id, updates);
    });
  };

  // Fix 2: Handle visibility toggle
  const handleToggleVisibility = () => {
    if (selectedIds.length === 0) return;
    // If they are hidden (areHidden is true), we want to show them (pass true)
    // If they are visible (areHidden is false), we want to hide them (pass false)
    const newVisibility = areHidden ? true : false;
    onToggleVisibility(selectedIds, newVisibility);
  };

  return (
    <aside className="w-80 bg-card border-l border-border flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">
          {isMultiSelect
            ? `${selectedAnnotations.length} Items Selected`
            : "Annotation Properties"}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Annotation Details */}
          {!isMultiSelect && firstAnn && ( // Added firstAnn check
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <p className="text-sm capitalize">{firstAnn.type}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">ID</Label>
                <p className="text-sm font-mono text-xs">{firstAnn.id}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Creator</Label>
                <p className="text-sm">{firstAnn.userId}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Created</Label>
                <p className="text-sm">
                  {firstAnn.createdAt
                    ? new Date(firstAnn.createdAt).toLocaleString()
                    : "Unknown"}
                </p>
              </div>
            </div>
          )}

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label">
              {isMultiSelect ? "Label" : (firstAnn?.type === 'text' ? 'Text Content' : 'Label (Text Inside Shape)')}
            </Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={isMultiSelect ? "Apply to all selected" : "Enter text"}
              disabled={selectedAnnotations.length === 0}
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            {/* Using a flexible color picker now */}
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-10 p-1"
                disabled={selectedAnnotations.length === 0}
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#ff0000"
                className="bg-background text-foreground" // Theme compatible
                disabled={selectedAnnotations.length === 0}
              />
            </div>
          </div>

          {/* Apply Button */}
          <Button className="w-full" onClick={handleApplyChanges} disabled={selectedAnnotations.length === 0}>
            Apply Changes
          </Button>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t">
            <Label className="text-sm font-semibold">Actions</Label>
            
            {/* Fix 2: Added Hide/Show Button */}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleToggleVisibility}
              disabled={selectedAnnotations.length === 0}
            >
              {areHidden ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              {areHidden ? "Show" : "Hide"}
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onLockAnnotations(selectedIds, !isLocked)}
              disabled={selectedAnnotations.length === 0}
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
              disabled={selectedAnnotations.length === 0}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>

            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => onDeleteAnnotations(selectedIds)}
              disabled={selectedAnnotations.length === 0}
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

