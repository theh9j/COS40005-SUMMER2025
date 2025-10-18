import { Annotation } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Copy, Trash2, X } from "lucide-react";
import { useState } from "react";

interface AnnotationPropertiesPanelProps {
  selectedAnnotations: Annotation[];
  onClose: () => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotations: (ids: string[]) => void;
  onLockAnnotations: (ids: string[], locked: boolean) => void;
  onDuplicateAnnotations: (ids: string[]) => void;
}

const colors = [
  "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#f97316",
];

export default function AnnotationPropertiesPanel({
  selectedAnnotations,
  onClose,
  onUpdateAnnotation,
  onDeleteAnnotations,
  onLockAnnotations,
  onDuplicateAnnotations,
}: AnnotationPropertiesPanelProps) {
  const [label, setLabel] = useState(
    selectedAnnotations.length === 1 ? selectedAnnotations[0].label || "" : ""
  );
  const [color, setColor] = useState(
    selectedAnnotations.length === 1 ? selectedAnnotations[0].color : "#ef4444"
  );

  const isMultiSelect = selectedAnnotations.length > 1;
  const isLocked = selectedAnnotations.some((ann: any) => ann.locked);

  const handleApplyChanges = () => {
    if (selectedAnnotations.length === 1) {
      onUpdateAnnotation(selectedAnnotations[0].id, { label, color });
    } else {
      selectedAnnotations.forEach((ann) => {
        onUpdateAnnotation(ann.id, { label, color });
      });
    }
  };

  return (
    <aside className="w-80 bg-card border-l border-border flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">
          {isMultiSelect
            ? `${selectedAnnotations.length} Annotations Selected`
            : "Annotation Properties"}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Annotation Details */}
          {!isMultiSelect && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <p className="text-sm capitalize">{selectedAnnotations[0].type}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">ID</Label>
                <p className="text-sm font-mono text-xs">{selectedAnnotations[0].id}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Creator</Label>
                <p className="text-sm">{selectedAnnotations[0].userId}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Created</Label>
                <p className="text-sm">
                  {selectedAnnotations[0].createdAt
                    ? new Date(selectedAnnotations[0].createdAt).toLocaleString()
                    : "Unknown"}
                </p>
              </div>
            </div>
          )}

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={isMultiSelect ? "Apply to all selected" : "Enter label"}
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((colorOption) => (
                <button
                  key={colorOption}
                  className={`w-8 h-8 rounded border-2 cursor-pointer ${
                    color === colorOption ? "border-foreground scale-110" : "border-gray-300"
                  }`}
                  style={{ backgroundColor: colorOption }}
                  onClick={() => setColor(colorOption)}
                />
              ))}
            </div>
          </div>

          {/* Apply Button */}
          <Button className="w-full" onClick={handleApplyChanges}>
            Apply Changes
          </Button>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t">
            <Label className="text-sm font-semibold">Actions</Label>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() =>
                onLockAnnotations(
                  selectedAnnotations.map((a) => a.id),
                  !isLocked
                )
              }
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
              onClick={() =>
                onDuplicateAnnotations(selectedAnnotations.map((a) => a.id))
              }
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>

            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() =>
                onDeleteAnnotations(selectedAnnotations.map((a) => a.id))
              }
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
