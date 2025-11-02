import { useEffect, useRef, useState } from "react";
import { useAnnotation } from "@/hooks/use-annotation";
import { Annotation } from "@shared/schema";
import InlineTextEditor from "./inline-text-editor";

interface AnnotationCanvasProps {
  imageUrl: string;
  annotation: ReturnType<typeof useAnnotation>;
  peerAnnotations?: Map<string, { annotations: Annotation[]; color: string; visible: boolean }>;
  versionOverlay?: Annotation | null;
}

interface ImageBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function AnnotationCanvas({ 
  imageUrl, 
  annotation,
  peerAnnotations,
  versionOverlay
}: AnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageBounds, setImageBounds] = useState<ImageBounds>({ x: 0, y: 0, width: 800, height: 600 });
  
  const {
    annotations,
    currentAnnotation,
    startDrawing,
    updateDrawing,
    finishDrawing,
    canvasRef,
    textInputPosition,
    completeTextInput,
    cancelTextInput,
    color,
    setImageBounds: updateAnnotationImageBounds,
  } = annotation;

  useEffect(() => {
    const updateImageBounds = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const image = imageRef.current;
      if (!canvas || !image || !container) return;

      const canvasRect = canvas.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const bounds: ImageBounds = {
        x: imageRect.left - canvasRect.left,
        y: imageRect.top - canvasRect.top,
        width: imageRect.width,
        height: imageRect.height,
      };

      canvas.width = containerRect.width;
      canvas.height = containerRect.height;

      setImageBounds(bounds);
      if (updateAnnotationImageBounds) {
        updateAnnotationImageBounds({ width: bounds.width, height: bounds.height });
      }
    };

    updateImageBounds();
    
    const resizeObserver = new ResizeObserver(() => {
      updateImageBounds();
    });

    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (imageRef.current) resizeObserver.observe(imageRef.current);

    window.addEventListener('resize', updateImageBounds);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateImageBounds);
    };
  }, [imageUrl, canvasRef]);

  const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation | Partial<Annotation>, opacity: number = 1, isSelected: boolean = false) => {
    if (!ann.type || !ann.coordinates || !ann.color) return;

    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    ctx.strokeStyle = ann.color;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.fillStyle = ann.color + alpha;

    const coords = ann.coordinates as any;
    const imgX = imageBounds.x;
    const imgY = imageBounds.y;

    if (ann.type === "rectangle" && coords.width && coords.height) {
      ctx.strokeRect(imgX + coords.x, imgY + coords.y, coords.width, coords.height);
      ctx.fillRect(imgX + coords.x, imgY + coords.y, coords.width, coords.height);
    } else if (ann.type === "circle" && coords.radius) {
      ctx.beginPath();
      ctx.arc(imgX + coords.x, imgY + coords.y, coords.radius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();
    } else if (ann.type === "triangle" && coords.points && Array.isArray(coords.points)) {
      ctx.beginPath();
      coords.points.forEach((point: { x: number; y: number }, index: number) => {
        if (index === 0) ctx.moveTo(imgX + point.x, imgY + point.y);
        else ctx.lineTo(imgX + point.x, imgY + point.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    } else if (ann.type === "polygon" && coords.points && Array.isArray(coords.points)) {
      ctx.beginPath();
      coords.points.forEach((point: { x: number; y: number }, index: number) => {
        if (index === 0) ctx.moveTo(imgX + point.x, imgY + point.y);
        else ctx.lineTo(imgX + point.x, imgY + point.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    } else if (ann.type === "freehand" && coords.points && Array.isArray(coords.points)) {
      ctx.beginPath();
      coords.points.forEach((point: { x: number; y: number }, index: number) => {
        if (index === 0) ctx.moveTo(imgX + point.x, imgY + point.y);
        else ctx.lineTo(imgX + point.x, imgY + point.y);
      });
      ctx.stroke();
    } else if (ann.type === "text") {
      if (coords.text) {
        ctx.fillStyle = ann.color;
        ctx.fillRect(imgX + coords.x, imgY + coords.y, coords.width || 200, coords.height || 40);
        ctx.strokeRect(imgX + coords.x, imgY + coords.y, coords.width || 200, coords.height || 40);
        ctx.fillStyle = "white";
        ctx.font = "14px sans-serif";
        const padding = 5;
        const maxWidth = (coords.width || 200) - (padding * 2);
        const lineHeight = 18;
        const words = coords.text.split(' ');
        let line = '';
        let yPos = imgY + coords.y + padding + lineHeight;
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, imgX + coords.x + padding, yPos);
            line = words[i] + ' ';
            yPos += lineHeight;
            if (yPos > imgY + coords.y + (coords.height || 40) - padding) break;
          } else line = testLine;
        }
        if (line.trim() && yPos <= imgY + coords.y + (coords.height || 40) - padding) {
          ctx.fillText(line, imgX + coords.x + padding, yPos);
        }
      } else {
        ctx.strokeRect(imgX + coords.x, imgY + coords.y, coords.width || 200, coords.height || 40);
      }
    }

    if (ann.label && ann.type !== "text") {
      ctx.fillStyle = ann.color;
      ctx.font = "12px sans-serif";
      const labelX = coords.x || (coords.points?.[0]?.x ?? 0);
      const labelY = coords.y || (coords.points?.[0]?.y ?? 0);
      ctx.fillText(ann.label, imgX + labelX, imgY + labelY - 5);
    }
  };

  // simplified bottom part
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (versionOverlay) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      drawAnnotation(ctx, versionOverlay, 0.3);
      ctx.restore();
    }
    if (peerAnnotations) {
      peerAnnotations.forEach((peerData) => {
        if (peerData.visible) {
          peerData.annotations.forEach((ann) => drawAnnotation(ctx, ann, 0.5));
        }
      });
    }
    annotations.forEach((ann) => {
      const isSelected = annotation.selectedAnnotationIds?.includes(ann.id) || false;
      drawAnnotation(ctx, ann, 0.5, isSelected);
    });
    if (currentAnnotation) drawAnnotation(ctx, currentAnnotation, 0.5);
  }, [annotations, currentAnnotation, peerAnnotations, versionOverlay, annotation.selectedAnnotationIds, imageBounds]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const imgX = canvasX - imageBounds.x;
    const imgY = canvasY - imageBounds.y;
    if (imgX < 0 || imgX > imageBounds.width || imgY < 0 || imgY > imageBounds.height) return;
    const syntheticEvent = { ...e, clientX: rect.left + imgX, clientY: rect.top + imgY } as React.MouseEvent<HTMLCanvasElement>;
    startDrawing(syntheticEvent);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const imgX = Math.max(0, Math.min(canvasX - imageBounds.x, imageBounds.width));
    const imgY = Math.max(0, Math.min(canvasY - imageBounds.y, imageBounds.height));
    const syntheticEvent = { ...e, clientX: rect.left + imgX, clientY: rect.top + imgY } as React.MouseEvent<HTMLCanvasElement>;
    updateDrawing(syntheticEvent);
  };

  return (
    <div ref={containerRef} className="bg-card rounded-lg border border-border h-full flex items-center justify-center relative annotation-canvas" data-testid="annotation-canvas">
      <img ref={imageRef} src={imageUrl} alt="Medical image for annotation" className="max-w-full max-h-full object-contain rounded-lg" draggable={false} data-testid="medical-image" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={finishDrawing} onMouseLeave={finishDrawing} data-testid="annotation-overlay" />
      {/* User Presence Indicators */}
      <div className="absolute top-4 right-4 flex space-x-2">
        <div className="flex items-center space-x-1 bg-green-100 px-2 py-1 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full pulse-dot"></div>
          <span className="text-xs" data-testid="online-user">Dr. Smith</span>
        </div>
      </div>
      {textInputPosition && (
        <InlineTextEditor
          x={imageBounds.x + textInputPosition.x}
          y={imageBounds.y + textInputPosition.y}
          width={textInputPosition.width}
          height={textInputPosition.height}
          color={color}
          onComplete={completeTextInput}
          onCancel={cancelTextInput}
        />
      )}
    </div>
  );
}
