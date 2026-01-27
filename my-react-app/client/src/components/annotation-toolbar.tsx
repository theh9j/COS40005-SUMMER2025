// src/components/annotation-toolbar.tsx

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
  Eraser,
  FileText,
} from "lucide-react";

interface AnnotationToolbarProps {
  annotation: ReturnType<typeof useAnnotation>;
  onToggleHistory?: () => void;
  onToggleComparison?: () => void;
  onShowRequirements?: () => void;
  showHistory?: boolean;
  showComparison?: boolean;
}

const tools: { id: AnnotationTool; icon: any; label: string }[] = [
  { id: "select", icon: MousePointer, label: "Select" },
  { id: "freehand", icon: Pen, label: "Pen" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "triangle", icon: Triangle, label: "Triangle" },
  { id: "text", icon: Type, label: "Text" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
];


export default function AnnotationToolbar({ 
  annotation,
  onToggleHistory,
  onToggleComparison,
  onShowRequirements,
  showHistory = false,
  showComparison = false,
}: AnnotationToolbarProps) {
  const { tool, color, strokeWidth, setTool, setColor, setStrokeWidth, undo, redo, canUndo, canRedo } = annotation;
  const [hexInput, setHexInput] = useState(color);

  return (
    <div className="w-full bg-card border-b border-border px-6 py-3 flex items-center gap-6" data-testid="annotation-toolbar">
      {/* Left Group: Drawing Tools */}
      <div className="flex items-center gap-1">
        {tools.map((toolItem) => {
          const Icon = toolItem.icon;
          const isActive = tool === toolItem.id;
          
          return (
            <Button
              key={toolItem.id}
              variant={isActive ? "default" : "secondary"}
              size="sm"
              className={`annotation-tool px-3 h-9 ${
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
              onClick={() => setTool(toolItem.id)}
              title={toolItem.label}
              data-testid={`tool-${toolItem.id}`}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border" />

      {/* Middle Group: Width and Color Selection */}
      <div className="flex items-center gap-6">
        {/* Width Customization */}
        <div className="flex items-center gap-2">
          <label htmlFor="stroke-width" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Width:
          </label>
          <input
            id="stroke-width"
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-24 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            data-testid="stroke-width-slider"
            title={`Stroke width: ${strokeWidth}px`}
          />
          <span className="text-xs text-muted-foreground w-8 text-right">{strokeWidth}px</span>
        </div>

        {/* Color Picker */}
        <div className="flex items-center gap-2">
          <label 
            htmlFor="color-picker" 
            className="w-8 h-8 rounded border-2 cursor-pointer flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color }}
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
              if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                setColor(value);
              }
            }}
            onBlur={() => {
              if (!/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
                setHexInput(color);
              }
            }}
            className="w-20 px-2 py-1 text-xs text-center border rounded bg-background text-foreground border-input"
            placeholder="#000000"
            maxLength={7}
            data-testid="color-hex-input"
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Group: Undo/Redo/History/Requirements Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          className="px-3 h-9"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          data-testid="button-undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="px-3 h-9"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          data-testid="button-redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
        
        {onToggleHistory && (
          <Button
            variant={showHistory ? "default" : "secondary"}
            size="sm"
            className="px-3 h-9"
            onClick={onToggleHistory}
            title="Version History"
            data-testid="button-history"
          >
            <Clock className="h-4 w-4" />
          </Button>
        )}
        
        {onShowRequirements && (
          <Button
            variant="secondary"
            size="sm"
            className="px-3 h-9"
            onClick={onShowRequirements}
            title="View Assignment Requirements"
            data-testid="button-requirements"
          >
            <FileText className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}