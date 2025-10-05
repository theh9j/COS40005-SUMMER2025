import { useEffect, useRef } from "react";
import { useAnnotation } from "@/hooks/use-annotation";

interface AnnotationCanvasProps {
  imageUrl: string;
  annotation: ReturnType<typeof useAnnotation>;
}

export default function AnnotationCanvas({ imageUrl, annotation }: AnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    annotations,
    currentAnnotation,
    startDrawing,
    updateDrawing,
    finishDrawing,
    canvasRef,
  } = annotation;

  // Render annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing annotations
    annotations.forEach((ann) => {
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = ann.color + "33"; // Add transparency

      const coords = ann.coordinates as any;

      if (ann.type === "rectangle") {
        ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);
        ctx.fillRect(coords.x, coords.y, coords.width, coords.height);
      } else if (ann.type === "circle") {
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, coords.radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
      }
    });

    // Draw current annotation being drawn
    if (currentAnnotation) {
      ctx.strokeStyle = currentAnnotation.color || "#ef4444";
      ctx.lineWidth = 2;
      ctx.fillStyle = (currentAnnotation.color || "#ef4444") + "33";

      const coords = currentAnnotation.coordinates as any;

      if (currentAnnotation.type === "rectangle" && coords.width && coords.height) {
        ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);
        ctx.fillRect(coords.x, coords.y, coords.width, coords.height);
      } else if (currentAnnotation.type === "circle" && coords.radius) {
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, coords.radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
      }
    }
  }, [annotations, currentAnnotation, canvasRef]);

  return (
    <div 
      ref={containerRef}
      className="bg-card rounded-lg border border-border h-full flex items-center justify-center relative annotation-canvas"
      data-testid="annotation-canvas"
    >
      {/* Background Image */}
      <img 
        src={imageUrl}
        alt="Medical image for annotation"
        className="max-w-full max-h-full object-contain rounded-lg"
        draggable={false}
        data-testid="medical-image"
      />
      
      {/* Canvas Overlay */}
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={updateDrawing}
        onMouseUp={finishDrawing}
        onMouseLeave={finishDrawing}
        data-testid="annotation-overlay"
      />
      
      {/* Mock Annotations */}
      <div className="absolute top-1/4 left-1/3 w-20 h-20 border-2 border-red-500 rounded-full bg-red-500 bg-opacity-20 cursor-pointer">
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-2 py-1 rounded text-xs">
          Lesion Area
        </div>
      </div>
      <div className="absolute top-1/2 right-1/4 w-16 h-12 border-2 border-blue-500 bg-blue-500 bg-opacity-20 cursor-pointer">
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
          Ventricle
        </div>
      </div>
      
      {/* User Presence Indicators */}
      <div className="absolute top-4 right-4 flex space-x-2">
        <div className="flex items-center space-x-1 bg-green-100 px-2 py-1 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full pulse-dot"></div>
          <span className="text-xs" data-testid="online-user">Dr. Smith</span>
        </div>
      </div>
    </div>
  );
}
