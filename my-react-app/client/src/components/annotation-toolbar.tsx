import { Button } from "@/components/ui/button";
import { useAnnotation, AnnotationTool } from "@/hooks/use-annotation";
import {
  MousePointer,
  Square,
  Circle,
  Triangle,
  Pen,
  Undo,
  Redo,
} from "lucide-react";

interface AnnotationToolbarProps {
  annotation: ReturnType<typeof useAnnotation>;
}

const tools: { id: AnnotationTool; icon: any; label: string }[] = [
  { id: "select", icon: MousePointer, label: "Select" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "polygon", icon: Triangle, label: "Polygon" },
  { id: "freehand", icon: Pen, label: "Freehand" },
];

const colors = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // yellow
  "#8b5cf6", // purple
  "#f97316", // orange
];

export default function AnnotationToolbar({ annotation }: AnnotationToolbarProps) {
  const { tool, color, setTool, setColor, undo, redo, canUndo, canRedo } = annotation;

  return (
    <aside className="w-20 bg-card border-r border-border flex flex-col items-center py-4 space-y-4" data-testid="annotation-toolbar">
      {/* Tools */}
      {tools.map((toolItem) => {
        const Icon = toolItem.icon;
        const isActive = tool === toolItem.id;
        
        return (
          <Button
            key={toolItem.id}
            variant={isActive ? "default" : "secondary"}
            size="sm"
            className={`annotation-tool w-12 h-12 ${
              isActive 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
            onClick={() => setTool(toolItem.id)}
            title={toolItem.label}
            data-testid={`tool-${toolItem.id}`}
          >
            <Icon className="h-5 w-5" />
          </Button>
        );
      })}
      
      {/* Color Palette */}
      <div className="border-t border-border pt-4 space-y-2">
        {colors.map((colorOption) => (
          <button
            key={colorOption}
            className={`w-8 h-8 rounded border-2 cursor-pointer ${
              color === colorOption ? "border-foreground" : "border-gray-300"
            }`}
            style={{ backgroundColor: colorOption }}
            onClick={() => setColor(colorOption)}
            title={colorOption}
            data-testid={`color-${colorOption.replace("#", "")}`}
          />
        ))}
      </div>
      
      {/* Undo/Redo */}
      <div className="border-t border-border pt-4 space-y-2">
        <Button
          variant="secondary"
          size="sm"
          className="annotation-tool w-12 h-12 bg-secondary text-secondary-foreground hover:bg-muted"
          onClick={undo}
          disabled={!canUndo}
          title="Undo"
          data-testid="button-undo"
        >
          <Undo className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="annotation-tool w-12 h-12 bg-secondary text-secondary-foreground hover:bg-muted"
          onClick={redo}
          disabled={!canRedo}
          title="Redo"
          data-testid="button-redo"
        >
          <Redo className="h-5 w-5" />
        </Button>
      </div>
    </aside>
  );
}
