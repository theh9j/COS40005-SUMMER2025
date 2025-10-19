import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAnnotation, AnnotationTool } from "@/hooks/use-annotation";
import {
  MousePointer,
  Square,
  Circle,
  Triangle,
  Pen,
  Type,
  Undo,
  Redo,
  Clock,
  Users,
} from "lucide-react";

interface AnnotationToolbarProps {
  annotation: ReturnType<typeof useAnnotation>;
  onToggleHistory?: () => void;
  onToggleComparison?: () => void;
  showHistory?: boolean;
  showComparison?: boolean;
}

const tools: { id: AnnotationTool; icon: any; label: string }[] = [
  { id: "select", icon: MousePointer, label: "Select" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "polygon", icon: Triangle, label: "Polygon" },
  { id: "freehand", icon: Pen, label: "Freehand" },
  { id: "text", icon: Type, label: "Text" },
];


export default function AnnotationToolbar({ 
  annotation,
  onToggleHistory,
  onToggleComparison,
  showHistory = false,
  showComparison = false,
}: AnnotationToolbarProps) {
  const { tool, color, setTool, setColor, undo, redo, canUndo, canRedo } = annotation;
  const [hexInput, setHexInput] = useState(color);

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
      
      {/* Color Picker */}
      <div className="border-t border-border pt-4 space-y-2 flex flex-col items-center">
        <label 
          htmlFor="color-picker" 
          className="w-12 h-12 rounded border-2 cursor-pointer flex items-center justify-center"
          style={{ backgroundColor: color, borderColor: "#000" }}
          title={color}
        >
          <input
            id="color-picker"
            type="color"
            value={color}
            onChange={(e) => {
              const newColor = e.target.value;
              setColor(newColor);
              setHexInput(newColor);
            }}
            className="w-0 h-0 opacity-0 absolute"
            data-testid="color-picker"
          />
        </label>
        <input
          type="text"
          value={hexInput}
          onChange={(e) => {
            const value = e.target.value;
            setHexInput(value);
            // Only update the shared color when it's a complete valid hex code
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
              setColor(value);
            }
          }}
          onBlur={() => {
            // Reset to the current valid color if input is invalid
            if (!/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
              setHexInput(color);
            }
          }}
          className="w-16 px-1 py-1 text-xs text-center border border-border rounded"
          placeholder="#000000"
          maxLength={7}
          data-testid="color-hex-input"
        />
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

      {/* Version History & Peer Comparison */}
      <div className="border-t border-border pt-4 space-y-2">
        {onToggleHistory && (
          <Button
            variant={showHistory ? "default" : "secondary"}
            size="sm"
            className={`annotation-tool w-12 h-12 ${
              showHistory 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
            onClick={onToggleHistory}
            title="Version History"
            data-testid="button-history"
          >
            <Clock className="h-5 w-5" />
          </Button>
        )}
        {onToggleComparison && (
          <Button
            variant={showComparison ? "default" : "secondary"}
            size="sm"
            className={`annotation-tool w-12 h-12 ${
              showComparison 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
            onClick={onToggleComparison}
            title="Peer Comparison"
            data-testid="button-comparison"
          >
            <Users className="h-5 w-5" />
          </Button>
        )}
      </div>
    </aside>
  );
}
