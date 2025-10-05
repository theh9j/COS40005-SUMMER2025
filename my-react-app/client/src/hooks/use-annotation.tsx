import { useState, useCallback, useRef } from "react";
import { Annotation } from "@shared/schema";

export type AnnotationTool = "select" | "rectangle" | "circle" | "polygon" | "freehand";

interface AnnotationState {
  tool: AnnotationTool;
  color: string;
  isDrawing: boolean;
  currentAnnotation: Partial<Annotation> | null;
  annotations: Annotation[];
  history: Annotation[][];
  historyIndex: number;
}

export function useAnnotation(caseId: string) {
  const [state, setState] = useState<AnnotationState>({
    tool: "select",
    color: "#ef4444",
    isDrawing: false,
    currentAnnotation: null,
    annotations: [],
    history: [[]],
    historyIndex: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const setTool = useCallback((tool: AnnotationTool) => {
    setState(prev => ({ ...prev, tool }));
  }, []);

  const setColor = useCallback((color: string) => {
    setState(prev => ({ ...prev, color }));
  }, []);

  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (state.tool === "select") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setState(prev => ({
      ...prev,
      isDrawing: true,
      currentAnnotation: {
        caseId,
        type: prev.tool === "rectangle" ? "rectangle" : 
              prev.tool === "circle" ? "circle" : "polygon",
        coordinates: { x, y },
        color: prev.color,
      },
    }));
  }, [state.tool, caseId]);

  const updateDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!state.isDrawing || !state.currentAnnotation) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    setState(prev => {
      if (!prev.currentAnnotation) return prev;

      const startCoords = prev.currentAnnotation.coordinates as any;
      let updatedCoords;

      if (prev.tool === "rectangle") {
        updatedCoords = {
          x: Math.min(startCoords.x, currentX),
          y: Math.min(startCoords.y, currentY),
          width: Math.abs(currentX - startCoords.x),
          height: Math.abs(currentY - startCoords.y),
        };
      } else if (prev.tool === "circle") {
        const radius = Math.sqrt(
          Math.pow(currentX - startCoords.x, 2) + Math.pow(currentY - startCoords.y, 2)
        );
        updatedCoords = {
          x: startCoords.x,
          y: startCoords.y,
          radius,
        };
      }

      return {
        ...prev,
        currentAnnotation: {
          ...prev.currentAnnotation,
          coordinates: updatedCoords,
        },
      };
    });
  }, [state.isDrawing, state.tool]);

  const finishDrawing = useCallback(() => {
    if (!state.isDrawing || !state.currentAnnotation) return;

    const newAnnotation: Annotation = {
      id: Math.random().toString(36).substr(2, 9),
      userId: "1", // Mock current user ID
      ...state.currentAnnotation,
      createdAt: new Date(),
    } as Annotation;

    setState(prev => {
      const newAnnotations = [...prev.annotations, newAnnotation];
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(newAnnotations);

      return {
        ...prev,
        isDrawing: false,
        currentAnnotation: null,
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }, [state.isDrawing, state.currentAnnotation]);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex <= 0) return prev;
      
      const newIndex = prev.historyIndex - 1;
      return {
        ...prev,
        annotations: prev.history[newIndex],
        historyIndex: newIndex,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;
      
      const newIndex = prev.historyIndex + 1;
      return {
        ...prev,
        annotations: prev.history[newIndex],
        historyIndex: newIndex,
      };
    });
  }, []);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  return {
    tool: state.tool,
    color: state.color,
    isDrawing: state.isDrawing,
    annotations: state.annotations,
    currentAnnotation: state.currentAnnotation,
    canUndo,
    canRedo,
    canvasRef,
    setTool,
    setColor,
    startDrawing,
    updateDrawing,
    finishDrawing,
    undo,
    redo,
  };
}
