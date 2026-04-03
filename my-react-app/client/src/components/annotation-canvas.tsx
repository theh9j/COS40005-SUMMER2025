import { useEffect, useRef, useState } from "react";
import { useAnnotation } from "@/hooks/use-annotation";
import { Annotation as SharedAnnotation } from "@shared/schema";
import InlineTextEditor from "./inline-text-editor";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Maximize2 } from "lucide-react";

interface AnnotationCanvasProps {
  imageUrl?: string | undefined;
  annotation: ReturnType<typeof useAnnotation>;
  peerAnnotations?: any[] | Map<string, { annotations: SharedAnnotation[]; color: string; visible: boolean }>;
  versionOverlay?: any | null;
  peerOpacity?: number;
  controlsDock?: "none" | "collapsed" | "expanded";
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
  versionOverlay,
  peerOpacity = 0.5,
  controlsDock = "none",
}: AnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const originalToolRef = useRef<any>(null);
  const [imageBounds, setImageBounds] = useState<ImageBounds>({ x: 0, y: 0, width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [naturalImageSize, setNaturalImageSize] = useState({ width: 0, height: 0 });
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [isMouseOverCanvas, setIsMouseOverCanvas] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 });
  const [zoomInput, setZoomInput] = useState("100");

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
    isDrawing,
    selectedAnnotationIds,
    tool,
    setTool,
  } = annotation;

  useEffect(() => {
    const updateContainerSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      setContainerSize({ width, height });

      canvas.width = width;
      canvas.height = height;
    };

    updateContainerSize();

    const resizeObserver = new ResizeObserver(() => {
      updateContainerSize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updateContainerSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateContainerSize);
    };
  }, [canvasRef]);

  useEffect(() => {
    const containerWidth = containerSize.width;
    const containerHeight = containerSize.height;
    const imageWidth = naturalImageSize.width;
    const imageHeight = naturalImageSize.height;

    if (!containerWidth || !containerHeight || !imageWidth || !imageHeight) return;

    const fitScale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
    const width = imageWidth * fitScale;
    const height = imageHeight * fitScale;
    const x = (containerWidth - width) / 2;
    const y = (containerHeight - height) / 2;

    const bounds = { x, y, width, height };
    setImageBounds(bounds);

    if (updateAnnotationImageBounds) {
      updateAnnotationImageBounds({ width: bounds.width, height: bounds.height });
    }
  }, [containerSize, naturalImageSize]);

  const screenToWorld = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    return {
      x: (screenX - panOffset.x) / canvasZoom,
      y: (screenY - panOffset.y) / canvasZoom,
    };
  };

  const getResizeHandleAtPoint = (
    ann: any,
    worldX: number,
    worldY: number,
    radius: number = 8
  ): "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | null => {
    const bounds = getSelectionBounds(ann);
    if (!bounds) return null;

    const x = imageBounds.x + bounds.x;
    const y = imageBounds.y + bounds.y;
    const width = bounds.width;
    const height = bounds.height;

    const centerX = x + width / 2;
    const centerY = y + height / 2;

    const handles: Array<{ key: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"; x: number; y: number }> = [
      { key: "nw", x, y },
      { key: "n", x: centerX, y },
      { key: "ne", x: x + width, y },
      { key: "e", x: x + width, y: centerY },
      { key: "se", x: x + width, y: y + height },
      { key: "s", x: centerX, y: y + height },
      { key: "sw", x, y: y + height },
      { key: "w", x, y: centerY },
    ];

    for (const handle of handles) {
      const dx = worldX - handle.x;
      const dy = worldY - handle.y;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) return handle.key;
    }

    return null;
  };

  const zoomAtPoint = (nextZoom: number, clientX: number, clientY: number) => {
    const clampedZoom = Math.max(0.5, Math.min(3, nextZoom));
    const container = containerRef.current;
    if (!container) {
      setCanvasZoom(clampedZoom);
      return;
    }

    const rect = container.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const worldX = (screenX - panOffset.x) / canvasZoom;
    const worldY = (screenY - panOffset.y) / canvasZoom;

    const nextPanX = screenX - worldX * clampedZoom;
    const nextPanY = screenY - worldY * clampedZoom;

    setCanvasZoom(clampedZoom);
    setPanOffset({ x: nextPanX, y: nextPanY });
  };

  const getSelectionBounds = (ann: any) => {
    const coords = ann?.coordinates as any;
    if (!coords) return null;

    if ((ann.type === "rectangle" || ann.type === "text") && Number.isFinite(coords.x) && Number.isFinite(coords.y)) {
      return {
        x: coords.x,
        y: coords.y,
        width: Math.max(1, Number(coords.width) || 0),
        height: Math.max(1, Number(coords.height) || 0),
      };
    }

    if (ann.type === "circle" && Number.isFinite(coords.x) && Number.isFinite(coords.y)) {
      const radiusX = Math.max(1, Number(coords.radiusX) || 0);
      const radiusY = Math.max(1, Number(coords.radiusY) || 0);
      return {
        x: coords.x - radiusX,
        y: coords.y - radiusY,
        width: radiusX * 2,
        height: radiusY * 2,
      };
    }

    if (Array.isArray(coords.points) && coords.points.length > 0) {
      const points = coords.points.filter((p: any) => Number.isFinite(p?.x) && Number.isFinite(p?.y));
      if (points.length === 0) return null;
      const xs = points.map((p: any) => p.x);
      const ys = points.map((p: any) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      };
    }

    return null;
  };

  const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: any, opacity: number = 1, isSelected: boolean = false) => {
    if (!ann.type || !ann.coordinates || !ann.color || ann.visible === false) return;

    const alpha = Math.round(opacity * 255).toString(16).padStart(2, "0");
    const lineWidth = ann.strokeWidth || 2;

    ctx.strokeStyle = ann.color;
    ctx.lineWidth = isSelected ? Math.max(3, lineWidth + 1) : lineWidth;
    ctx.fillStyle = ann.color + alpha;

    const coords = ann.coordinates as any;
    const imgX = imageBounds.x;
    const imgY = imageBounds.y;

    if (ann.type === "rectangle" && coords.width && coords.height) {
      ctx.strokeRect(imgX + coords.x, imgY + coords.y, coords.width, coords.height);
      ctx.fillRect(imgX + coords.x, imgY + coords.y, coords.width, coords.height);
    } else if (ann.type === "circle" && coords.radiusX && coords.radiusY) {
      ctx.beginPath();
      ctx.ellipse(imgX + coords.x, imgY + coords.y, coords.radiusX, coords.radiusY, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();
    } else if (ann.type === "triangle" && coords.points && Array.isArray(coords.points)) {
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
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      coords.points.forEach((point: { x: number; y: number }, index: number) => {
        if (index === 0) {
          ctx.moveTo(imgX + point.x, imgY + point.y);
        } else {
          ctx.lineTo(imgX + point.x, imgY + point.y);
        }
      });
      ctx.stroke();
    } else if (ann.type === "eraser" && coords.points && Array.isArray(coords.points)) {
      ctx.clearRect(
        imgX + Math.min(...coords.points.map((p: any) => p.x)) - lineWidth / 2,
        imgY + Math.min(...coords.points.map((p: any) => p.y)) - lineWidth / 2,
        Math.max(...coords.points.map((p: any) => p.x)) - Math.min(...coords.points.map((p: any) => p.x)) + lineWidth,
        Math.max(...coords.points.map((p: any) => p.y)) - Math.min(...coords.points.map((p: any) => p.y)) + lineWidth
      );
    } else if (ann.type === "text") {
      if (coords.text) {
        ctx.fillStyle = ann.color;
        ctx.fillRect(imgX + coords.x, imgY + coords.y, coords.width || 200, coords.height || 40);
        ctx.strokeRect(imgX + coords.x, imgY + coords.y, coords.width || 200, coords.height || 40);
        ctx.fillStyle = "white";
        ctx.font = "14px sans-serif";
        const padding = 5;
        const maxWidth = (coords.width || 200) - padding * 2;
        const lineHeight = 18;
        const words = coords.text.split(" ");
        let line = "";
        let yPos = imgY + coords.y + padding + lineHeight - 5;
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + " ";
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, imgX + coords.x + padding, yPos);
            line = words[i] + " ";
            yPos += lineHeight;
            if (yPos > imgY + coords.y + (coords.height || 40) - padding) break;
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
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const textMetrics = ctx.measureText(ann.label);
      const padding = 5;
      const boxWidth = textMetrics.width + padding * 2;
      const boxHeight = 20;
      const boxMargin = 8;

      let shapeTopY = 0;
      let shapeCenterX = 0;

      if (ann.type === "rectangle") {
        shapeTopY = coords.y;
        shapeCenterX = coords.x + coords.width / 2;
      } else if (ann.type === "circle") {
        shapeTopY = coords.y - coords.radiusY;
        shapeCenterX = coords.x;
      } else if (["triangle", "polygon", "freehand"].includes(ann.type as string) && Array.isArray(coords.points)) {
        const xs = coords.points.map((p: any) => p.x);
        const ys = coords.points.map((p: any) => p.y);
        shapeTopY = Math.min(...ys);
        shapeCenterX = Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) / 2;
      }

      const boxX = shapeCenterX - boxWidth / 2;
      const boxY = shapeTopY - boxHeight - boxMargin;

      ctx.fillStyle = ann.color;
      ctx.fillRect(imgX + boxX, imgY + boxY, boxWidth, boxHeight);

      ctx.fillStyle = "white";
      ctx.fillText(ann.label, imgX + shapeCenterX, imgY + boxY + boxHeight / 2);

      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }
  };

  const drawSelectionIndicators = (ctx: CanvasRenderingContext2D, ann: any) => {
    const bounds = getSelectionBounds(ann);
    if (!bounds) return;

    const x = imageBounds.x + bounds.x;
    const y = imageBounds.y + bounds.y;
    const width = bounds.width;
    const height = bounds.height;

    const handleRadius = 6;
    const handles = [
      { x, y },
      { x: x + width / 2, y },
      { x: x + width, y },
      { x: x + width, y: y + height / 2 },
      { x: x + width, y: y + height },
      { x: x + width / 2, y: y + height },
      { x, y: y + height },
      { x, y: y + height / 2 },
    ];

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);

    handles.forEach((handle) => {
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, handleRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#d1d5db";
      ctx.fill();
      ctx.strokeStyle = "#4b5563";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.setTransform(canvasZoom, 0, 0, canvasZoom, panOffset.x, panOffset.y);

    const image = imageRef.current;
    if (image && imageBounds.width > 0 && imageBounds.height > 0) {
      ctx.drawImage(image, imageBounds.x, imageBounds.y, imageBounds.width, imageBounds.height);
    }

    if (versionOverlay) {
      try {
        ctx.save();
        ctx.globalAlpha = 0.5;
        drawAnnotation(ctx, versionOverlay, 0.3);
        ctx.restore();
      } catch (e) {
        // ignore drawing errors for unknown overlay shapes
      }
    }

    if (peerAnnotations) {
      if (typeof (peerAnnotations as any).forEach === "function" && !(peerAnnotations instanceof Map)) {
        (peerAnnotations as any[]).forEach((peerData) => {
          if (peerData && peerData.visible && Array.isArray(peerData.annotations)) {
            ctx.globalAlpha = peerOpacity;
            peerData.annotations.forEach((ann: any) => drawAnnotation(ctx, ann, 0.5));
            ctx.globalAlpha = 1;
          }
        });
      } else if (peerAnnotations instanceof Map) {
        (peerAnnotations as Map<string, any>).forEach((peerData) => {
          if (peerData && peerData.visible) {
            ctx.globalAlpha = peerOpacity;
            peerData.annotations.forEach((ann: any) => drawAnnotation(ctx, ann, 0.5));
            ctx.globalAlpha = 1;
          }
        });
      }
    }

    annotations.forEach((ann) => {
      const isSelected = annotation.selectedAnnotationIds?.includes(ann.id) || false;
      drawAnnotation(ctx, ann as any, 0.5, isSelected);

      if (isSelected && ann.visible !== false) {
        drawSelectionIndicators(ctx, ann as any);
      }
    });

    if (currentAnnotation) {
      drawAnnotation(ctx, currentAnnotation as any, 0.5);
    }

    ctx.restore();
  }, [
    annotations,
    currentAnnotation,
    canvasRef,
    peerAnnotations,
    versionOverlay,
    annotation.selectedAnnotationIds,
    imageBounds,
    canvasZoom,
    panOffset,
  ]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanOrigin({ ...panOffset });
      return;
    }

    if (e.button !== 0 || isPanning) return;

    const world = screenToWorld(e.clientX, e.clientY);
    const annotationX = world.x - imageBounds.x;
    const annotationY = world.y - imageBounds.y;

    // Check if clicking on a resize handle of a selected annotation
    const selectedAnnotation = annotations.find(
      (ann) => selectedAnnotationIds?.includes(ann.id)
    );

    if (selectedAnnotation) {
      const resizeHandle = getResizeHandleAtPoint(selectedAnnotation, world.x, world.y);
      if (resizeHandle) {
        // Temporarily switch to select mode for resize operation
        originalToolRef.current = tool;
        setTool("select");
        // Use setTimeout to ensure tool state is updated before calling startDrawing
        setTimeout(() => {
          startDrawing({
            ...e,
            annotationX,
            annotationY,
          } as React.MouseEvent<HTMLCanvasElement>);
        }, 0);
        return;
      }
    }

    startDrawing({
      ...e,
      annotationX,
      annotationY,
    } as React.MouseEvent<HTMLCanvasElement>);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPanOffset({ x: panOrigin.x + dx, y: panOrigin.y + dy });
      return;
    }

    const world = screenToWorld(e.clientX, e.clientY);
    const annotationX = world.x - imageBounds.x;
    const annotationY = world.y - imageBounds.y;

    // Update cursor when hovering over resize handles
    const selectedAnnotation = annotations.find(
      (ann) => annotation.selectedAnnotationIds?.includes(ann.id)
    );
    if (selectedAnnotation && !isDrawing) {
      const resizeHandle = getResizeHandleAtPoint(selectedAnnotation, world.x, world.y);
      if (resizeHandle) {
        const cursorMap: { [key: string]: string } = {
          nw: "nwse-resize",
          n: "ns-resize",
          ne: "nesw-resize",
          e: "ew-resize",
          se: "nwse-resize",
          s: "ns-resize",
          sw: "nesw-resize",
          w: "ew-resize",
        };
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.style.cursor = cursorMap[resizeHandle] || "crosshair";
        }
      }
    }

    updateDrawing({
      ...e,
      annotationX,
      annotationY,
    } as React.MouseEvent<HTMLCanvasElement>);
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    finishDrawing();
  };

  useEffect(() => {
    if (!isPanning && !isDrawing) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setPanOffset({ x: panOrigin.x + dx, y: panOrigin.y + dy });
        return;
      }

      if (!isDrawing) return;
      const world = screenToWorld(e.clientX, e.clientY);
      updateDrawing({
        annotationX: world.x - imageBounds.x,
        annotationY: world.y - imageBounds.y,
        clientX: e.clientX,
        clientY: e.clientY,
      } as unknown as React.MouseEvent<HTMLCanvasElement>);
    };

    const handleWindowMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
        return;
      }
      if (isDrawing) {
        finishDrawing();
      }
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isPanning, isDrawing, panStart, panOrigin, imageBounds, canvasZoom, panOffset, annotations, selectedAnnotationIds]);

  const handleCanvasWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isMouseOverCanvas) return;

    e.preventDefault();

    const delta = -e.deltaY;
    const zoomSpeed = 0.1;
    const nextZoom = canvasZoom + (delta > 0 ? zoomSpeed : -zoomSpeed);
    zoomAtPoint(nextZoom, e.clientX, e.clientY);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset cursor to default when not hovering over handles
    if (!isPanning && !isDrawing) {
      canvas.style.cursor = "crosshair";
      // Restore original tool if we temporarily switched to select
      if (originalToolRef.current) {
        setTool(originalToolRef.current);
        originalToolRef.current = null;
      }
    } else if (isPanning) {
      canvas.style.cursor = "grabbing";
    }
  }, [isPanning, isDrawing, setTool]);

  const handleZoomIn = () => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    zoomAtPoint(canvasZoom + 0.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const handleZoomOut = () => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    zoomAtPoint(canvasZoom - 0.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const handleResetZoom = () => {
    setCanvasZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    setZoomInput(String(Math.round(canvasZoom * 100)));
  }, [canvasZoom]);

  const applyZoomInput = () => {
    const cleaned = zoomInput.replace("%", "").trim();
    const parsed = Number(cleaned);
    const clampedPercent = Number.isFinite(parsed)
      ? Math.max(50, Math.min(300, parsed))
      : Math.round(canvasZoom * 100);

    const container = containerRef.current;
    if (!container) {
      setZoomInput(String(clampedPercent));
      return;
    }

    const rect = container.getBoundingClientRect();
    zoomAtPoint(clampedPercent / 100, rect.left + rect.width / 2, rect.top + rect.height / 2);
    setZoomInput(String(clampedPercent));
  };

  return (
    <div
      ref={containerRef}
      className="bg-card rounded-lg border border-border h-full flex items-center justify-center relative annotation-canvas overflow-hidden"
      data-testid="annotation-canvas"
      onWheel={handleCanvasWheel}
      onContextMenu={(e) => e.preventDefault()}
      onMouseEnter={() => setIsMouseOverCanvas(true)}
      onMouseLeave={() => setIsMouseOverCanvas(false)}
    >
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Medical image for annotation"
        className="absolute pointer-events-none opacity-0 h-0 w-0"
        onLoad={(e) => {
          const target = e.currentTarget;
          setNaturalImageSize({ width: target.naturalWidth, height: target.naturalHeight });
        }}
        draggable={false}
        data-testid="medical-image"
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        data-testid="annotation-overlay"
      />

      {textInputPosition && (
        <InlineTextEditor
          x={(imageBounds.x + textInputPosition.x) * canvasZoom + panOffset.x}
          y={(imageBounds.y + textInputPosition.y) * canvasZoom + panOffset.y}
          width={Math.max(120, textInputPosition.width * canvasZoom)}
          height={Math.max(32, textInputPosition.height * canvasZoom)}
          color={color}
          onComplete={completeTextInput}
          onCancel={cancelTextInput}
        />
      )}

      <div
        className={`absolute bottom-3 z-20 flex items-center gap-2 ${
          controlsDock === "expanded"
            ? "right-[332px]"
            : controlsDock === "collapsed"
              ? "right-[76px]"
              : "right-3"
        }`}
      >
        <div className="rounded-xl border bg-background/95 backdrop-blur px-2 py-1 flex items-center gap-1 shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleZoomOut}
            title="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 px-1">
            <input
              type="text"
              value={zoomInput}
              onChange={(e) => setZoomInput(e.target.value)}
              onBlur={applyZoomInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  applyZoomInput();
                }
              }}
              className="h-7 w-12 rounded border bg-background text-[12px] text-center text-muted-foreground"
              title="Zoom percent (50-300)"
              aria-label="Zoom percent"
            />
            <span className="text-[12px] text-muted-foreground select-none">%</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleZoomIn}
            title="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleResetZoom}
            title="Reset zoom"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {canvasZoom === 1 && (
        <div className="absolute bottom-3 left-3 z-20 text-[11px] text-muted-foreground bg-background/80 border rounded-lg px-2 py-1">
          Tip: scroll to zoom � shift+click to multi-select
        </div>
      )}
    </div>
  );
}

