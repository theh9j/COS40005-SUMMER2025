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
      const image = imageRef.current;
      if (!canvas || !image) return;

      const canvasRect = canvas.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();

      const bounds: ImageBounds = {
        x: imageRect.left - canvasRect.left,
        y: imageRect.top - canvasRect.top,
        width: imageRect.width,
        height: imageRect.height,
      };

      setImageBounds(bounds);
      if (updateAnnotationImageBounds) {
        updateAnnotationImageBounds({ width: bounds.width, height: bounds.height });
      }
    };

    updateImageBounds();
    
    const resizeObserver = new ResizeObserver(() => {
      updateImageBounds();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    if (imageRef.current) {
      resizeObserver.observe(imageRef.current);
    }

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
    } else if (ann.type === "polygon" && coords.points && Array.isArray(coords.points)) {
      ctx.beginPath();
      coords.points.forEach((point: { x: number; y: number }, index: number) => {
        if (index === 0) {
          ctx.moveTo(imgX + point.x, imgY + point.y);
        } else {
          ctx.lineTo(imgX + point.x, imgY + point.y);
        }
      });
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    } else if (ann.type === "freehand" && coords.points && Array.isArray(coords.points)) {
      ctx.beginPath();
      coords.points.forEach((point: { x: number; y: number }, index: number) => {
        if (index === 0) {
          ctx.moveTo(imgX + point.x, imgY + point.y);
        } else {
          ctx.lineTo(imgX + point.x, imgY + point.y);
        }
      });
      ctx.stroke();
    } else if (ann.type === "text") {
      if (coords.text) {
        // Draw colored background box
        ctx.fillStyle = ann.color;
        ctx.fillRect(imgX + coords.x, imgY + coords.y, coords.width || 200, coords.height || 40);
        
        // Draw border
        ctx.strokeRect(imgX + coords.x, imgY + coords.y, coords.width || 200, coords.height || 40);
        
        // Draw white text
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
            
            if (yPos > imgY + coords.y + (coords.height || 40) - padding) {
              break;
            }
          } else {
            line = testLine;
          }
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

  const drawSelectionIndicators = (ctx: CanvasRenderingContext2D, ann: Annotation) => {
    const coords = ann.coordinates as any;
    const imgX = imageBounds.x;
    const imgY = imageBounds.y;
    
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    if (ann.type === "rectangle" && coords.width && coords.height) {
      ctx.strokeRect(imgX + coords.x - 5, imgY + coords.y - 5, coords.width + 10, coords.height + 10);
      
      const handles = [
        { x: imgX + coords.x, y: imgY + coords.y },
        { x: imgX + coords.x + coords.width, y: imgY + coords.y },
        { x: imgX + coords.x + coords.width, y: imgY + coords.y + coords.height },
        { x: imgX + coords.x, y: imgY + coords.y + coords.height },
        { x: imgX + coords.x + coords.width / 2, y: imgY + coords.y },
        { x: imgX + coords.x + coords.width, y: imgY + coords.y + coords.height / 2 },
        { x: imgX + coords.x + coords.width / 2, y: imgY + coords.y + coords.height },
        { x: imgX + coords.x, y: imgY + coords.y + coords.height / 2 },
      ];
      
      ctx.setLineDash([]);
      ctx.fillStyle = '#3b82f6';
      handles.forEach(handle => {
        ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
      });
    } else if (ann.type === "circle" && coords.radius) {
      const bbox = {
        x: imgX + coords.x - coords.radius,
        y: imgY + coords.y - coords.radius,
        width: coords.radius * 2,
        height: coords.radius * 2,
      };
      ctx.strokeRect(bbox.x - 5, bbox.y - 5, bbox.width + 10, bbox.height + 10);
      
      ctx.setLineDash([]);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(imgX + coords.x - 4, imgY + coords.y - coords.radius - 4, 8, 8);
      ctx.fillRect(imgX + coords.x + coords.radius - 4, imgY + coords.y - 4, 8, 8);
      ctx.fillRect(imgX + coords.x - 4, imgY + coords.y + coords.radius - 4, 8, 8);
      ctx.fillRect(imgX + coords.x - coords.radius - 4, imgY + coords.y - 4, 8, 8);
    } else if (ann.type === "polygon" && coords.points && Array.isArray(coords.points)) {
      const xs = coords.points.map((p: any) => p.x);
      const ys = coords.points.map((p: any) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      
      ctx.strokeRect(imgX + minX - 5, imgY + minY - 5, maxX - minX + 10, maxY - minY + 10);
      
      ctx.setLineDash([]);
      ctx.fillStyle = '#3b82f6';
      coords.points.forEach((point: { x: number; y: number }) => {
        ctx.fillRect(imgX + point.x - 4, imgY + point.y - 4, 8, 8);
      });
    } else if (ann.type === "freehand" && coords.points && Array.isArray(coords.points)) {
      const xs = coords.points.map((p: any) => p.x);
      const ys = coords.points.map((p: any) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      
      ctx.strokeRect(imgX + minX - 5, imgY + minY - 5, maxX - minX + 10, maxY - minY + 10);
    } else if (ann.type === "text" && coords.text) {
      const textWidth = ctx.measureText(coords.text).width;
      const textHeight = 20;
      ctx.strokeRect(imgX + coords.x - 5, imgY + coords.y - textHeight - 5, textWidth + 10, textHeight + 10);
      
      ctx.setLineDash([]);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(imgX + coords.x - 4, imgY + coords.y - textHeight - 4, 8, 8);
      ctx.fillRect(imgX + coords.x + textWidth - 4, imgY + coords.y - 4, 8, 8);
    }
    
    ctx.setLineDash([]);
  };

  // Render annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw version overlay with different opacity if present
    if (versionOverlay) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      drawAnnotation(ctx, versionOverlay, 0.3);
      ctx.restore();
    }

    // Draw peer annotations if visible
    if (peerAnnotations) {
      peerAnnotations.forEach((peerData) => {
        if (peerData.visible) {
          peerData.annotations.forEach((ann) => {
            drawAnnotation(ctx, ann, 0.5);
          });
        }
      });
    }

    // Draw current user's annotations
    annotations.forEach((ann) => {
      const isSelected = annotation.selectedAnnotationIds?.includes(ann.id) || false;
      drawAnnotation(ctx, ann, 0.5, isSelected);
      
      if (isSelected) {
        drawSelectionIndicators(ctx, ann);
      }
    });

    // Draw current annotation being drawn
    if (currentAnnotation) {
      drawAnnotation(ctx, currentAnnotation, 0.5);
    }
  }, [annotations, currentAnnotation, canvasRef, peerAnnotations, versionOverlay, annotation.selectedAnnotationIds, imageBounds]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    const imgX = canvasX - imageBounds.x;
    const imgY = canvasY - imageBounds.y;
    
    if (imgX < 0 || imgX > imageBounds.width || imgY < 0 || imgY > imageBounds.height) {
      return;
    }
    
    const syntheticEvent = {
      ...e,
      clientX: rect.left + imgX,
      clientY: rect.top + imgY,
    } as React.MouseEvent<HTMLCanvasElement>;
    
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
    
    const syntheticEvent = {
      ...e,
      clientX: rect.left + imgX,
      clientY: rect.top + imgY,
    } as React.MouseEvent<HTMLCanvasElement>;
    
    updateDrawing(syntheticEvent);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    finishDrawing();
  };

  return (
    <div 
      ref={containerRef}
      className="bg-card rounded-lg border border-border h-full flex items-center justify-center relative annotation-canvas"
      data-testid="annotation-canvas"
    >
      {/* Background Image */}
      <img 
        ref={imageRef}
        src={imageUrl}
        alt="Medical image for annotation"
        className="max-w-full max-h-full object-contain rounded-lg"
        draggable={false}
        data-testid="medical-image"
        onLoad={() => {
          const updateImageBounds = () => {
            const canvas = canvasRef.current;
            const image = imageRef.current;
            if (!canvas || !image) return;

            const canvasRect = canvas.getBoundingClientRect();
            const imageRect = image.getBoundingClientRect();

            const bounds: ImageBounds = {
              x: imageRect.left - canvasRect.left,
              y: imageRect.top - canvasRect.top,
              width: imageRect.width,
              height: imageRect.height,
            };

            setImageBounds(bounds);
          };
          updateImageBounds();
        }}
      />
      
      {/* Canvas Overlay */}
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
      
      {/* Inline Text Editor with Image-Relative Positioning */}
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
