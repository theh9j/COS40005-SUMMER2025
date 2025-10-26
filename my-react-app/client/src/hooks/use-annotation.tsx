// src/hooks/use-annotation.tsx

import { useEffect, useRef, useState, useCallback, MouseEvent } from "react";
import { v4 as uuidv4 } from "uuid";

export type AnnotationTool =
  | "select"
  | "rectangle"
  | "circle"
  | "triangle"
  | "freehand"
  | "text"
  | "polygon"
  | null;

export interface Annotation {
  id: string;
  caseId: string;
  userId: string;
  type: AnnotationTool | string;
  coordinates: any;
  color?: string;
  label?: string; // Used for text inside shapes
  locked?: boolean;
  visible?: boolean; // Used for hide/show
  createdAt?: string;
  updatedAt?: string;
}

interface UseAnnotationState {
  annotations: Annotation[];
  selectedAnnotationIds: string[];
  history: Annotation[][];
  historyIndex: number;
  isDrawing: boolean;
  tool: AnnotationTool;
  color: string;
  textInputPosition: { x: number; y: number; width: number; height: number; annotationId: string } | null;
  // Other state properties from your original file
  peerAnnotations: any[];
  isLocked: boolean;
  versions: any[];
  versionsLoading: boolean;
  imageBounds: { width: number; height: number } | null;
  currentAnnotation: Partial<Annotation> | null;
}

const isPointInShape = (px: number, py: number, ann: Annotation): boolean => {
    const coords = ann.coordinates;
    if (!coords || ann.visible === false) return false;

    switch (ann.type) {
        case 'rectangle':
        case 'text':
            return (px >= coords.x && px <= coords.x + coords.width && py >= coords.y && py <= coords.y + coords.height);
        case 'circle':
            const distance = Math.sqrt((px - coords.x) ** 2 + (py - coords.y) ** 2);
            return distance <= coords.radius;
        case 'triangle':
        case 'polygon': {
            let inside = false;
            const points = coords.points || [];
            for (let i = 0, j = points.length - 1; i < points.length; i++) {
                const xi = points[i].x, yi = points[i].y;
                const xj = points[j].x, yj = points[j].y;
                const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }
        case 'freehand': { // Added check for freehand
            if (!coords.points || coords.points.length === 0) return false;
            // Simple bounding box check for performance
            const xs = coords.points.map((p: any) => p.x);
            const ys = coords.points.map((p: any) => p.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            return px >= minX && px <= maxX && py >= minY && py <= maxY;
        }
        default:
            return false;
    }
};

export function useAnnotation(caseId: string, userId: string) {
  const [state, setState] = useState<UseAnnotationState>({
    annotations: [],
    selectedAnnotationIds: [],
    history: [[]],
    historyIndex: 0,
    isDrawing: false,
    tool: "select",
    color: "#ff0000",
    textInputPosition: null,
    // Defaults for other state properties
    peerAnnotations: [],
    isLocked: false,
    versions: [],
    versionsLoading: false,
    imageBounds: null,
    currentAnnotation: null,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const updateAnnotationsAndHistory = useCallback((newAnnotations: Annotation[], action: 'drawing' | 'update' | 'delete' | 'visibility') => {
    setState(prev => {
      // If history was undone, clear the "future"
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(newAnnotations);
      
      return {
        ...prev,
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }, []);

  const setTool = (tool: AnnotationTool) => {
    setState((prev) => ({ ...prev, tool, selectedAnnotationIds: [] }));
  };

  const setColor = (newColor: string) => {
    setState((prev) => ({ ...prev, color: newColor }));
  };
  
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Note: This assumes the event (e.g., e.clientX) is relative to the viewport.
    // If e.nativeEvent.offsetX/Y is used, it must be relative to the *image* origin.
    // We'll use clientX/Y and subtract rect.left/top for canvas-relative coords.
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (state.tool === 'select') {
      const clickedAnnotation = [...state.annotations].reverse().find(ann => isPointInShape(x, y, ann));
      if (clickedAnnotation) {
        // Handle multi-select with Shift key
        if (e.shiftKey) {
          setState(prev => ({
            ...prev,
            selectedAnnotationIds: prev.selectedAnnotationIds.includes(clickedAnnotation.id)
              ? prev.selectedAnnotationIds.filter(id => id !== clickedAnnotation.id)
              : [...prev.selectedAnnotationIds, clickedAnnotation.id]
          }));
        } else {
           // Only select if not already selected
          if (!state.selectedAnnotationIds.includes(clickedAnnotation.id)) {
            setState(prev => ({ ...prev, selectedAnnotationIds: [clickedAnnotation.id] }));
          }
        }
      } else {
        setState(prev => ({ ...prev, selectedAnnotationIds: [] }));
      }
      return;
    }
    
    if (!state.tool) return;

    const newAnnotation: Partial<Annotation> = {
      id: uuidv4(), caseId, userId, type: state.tool, color: state.color, visible: true,
      coordinates: { start: { x, y } }
    };

    // Fix 1: Text tool now behaves like rectangle tool on start/update
    if (state.tool === 'text') {
      newAnnotation.coordinates = { ...newAnnotation.coordinates, x, y, width: 0, height: 0, text: '' };
    }

    if (state.tool === 'freehand') {
        newAnnotation.coordinates.points = [{ x, y }];
    }

    setState((prev) => ({ 
        ...prev, 
        isDrawing: true, 
        currentAnnotation: newAnnotation,
        annotations: [...prev.annotations, newAnnotation as Annotation] // Add temp annotation
    }));
  };

  const updateDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!state.isDrawing || !state.tool) return; // Removed currentAnnotation check, rely on isDrawing
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setState(prev => {
        // Use the ID from the state's currentAnnotation object
        if (!prev.currentAnnotation) return prev;
        const currentId = prev.currentAnnotation.id;
        const start = prev.currentAnnotation.coordinates.start;

        const newCoords = { ...prev.currentAnnotation.coordinates };

        // Fix 1: Text tool draws like rectangle
        if (state.tool === "rectangle" || state.tool === "text") { 
          newCoords.x = Math.min(start.x, x); newCoords.y = Math.min(start.y, y);
          newCoords.width = Math.abs(x - start.x); newCoords.height = Math.abs(y - start.y);
        } else if (state.tool === "circle") {
          const dx = x - start.x; const dy = y - start.y;
          newCoords.x = start.x; newCoords.y = start.y;
          newCoords.radius = Math.sqrt(dx * dx + dy * dy);
        } else if (state.tool === "triangle") {
          const bboxX = Math.min(start.x, x); const bboxY = Math.min(start.y, y);
          const width = Math.abs(x - start.x); const height = Math.abs(y - start.y);
          newCoords.points = [
            { x: bboxX + width / 2, y: bboxY }, { x: bboxX, y: bboxY + height }, { x: bboxX + width, y: bboxY + height },
          ];
        } else if (state.tool === "freehand") {
          newCoords.points = [...(newCoords.points || []), { x, y }];
        }

        const updatedAnnotation = { ...prev.currentAnnotation, coordinates: newCoords };

        return { 
            ...prev, 
            currentAnnotation: updatedAnnotation,
            // Update the temporary annotation in the main list
            annotations: prev.annotations.map(ann => ann.id === currentId ? updatedAnnotation as Annotation : ann)
        };
    });
  };

  const finishDrawing = () => {
    if (!state.isDrawing || !state.currentAnnotation) return;
    
    const ann = state.currentAnnotation;

    // Don't save zero-size shapes
    const coords = ann.coordinates;
    if ((ann.type === 'rectangle' || ann.type === 'text') && (!coords.width || !coords.height)) {
        setState(prev => ({
            ...prev,
            isDrawing: false,
            currentAnnotation: null,
            annotations: prev.annotations.filter(a => a.id !== ann.id) // Remove temp
        }));
        return;
    }
     if (ann.type === 'circle' && !coords.radius) {
        setState(prev => ({
            ...prev,
            isDrawing: false,
            currentAnnotation: null,
            annotations: prev.annotations.filter(a => a.id !== ann.id) // Remove temp
        }));
        return;
    }

    // Fix 1: Handle Text tool: trigger the inline editor
    if (state.tool === 'text') {
        setState(prev => ({
            ...prev,
            textInputPosition: {
                x: ann.coordinates.x, y: ann.coordinates.y,
                width: ann.coordinates.width, height: ann.coordinates.height,
                annotationId: ann.id!,
            },
            isDrawing: false,
            currentAnnotation: null,
            selectedAnnotationIds: [ann.id!] // Select the new text box
        }));
        // Note: The temporary annotation is already in the annotations list
        return;
    }
    
    const completedAnnotation = { ...state.currentAnnotation, createdAt: new Date().toISOString() } as Annotation;
    // Finalize the annotation in the list
    const finalAnnotations = state.annotations.map(a => a.id === ann.id ? completedAnnotation : a);

    updateAnnotationsAndHistory(finalAnnotations, 'drawing');
    setState(prev => ({ ...prev, isDrawing: false, currentAnnotation: null }));
  };

  // Handle text input completion
  const completeTextInput = (text: string) => {
    if (!state.textInputPosition) return;
    const { annotationId } = state.textInputPosition;
    
    let finalizedAnnotation: Annotation | undefined;
    
    const newAnnotations = state.annotations.map(ann => {
        if (ann.id === annotationId) {
            finalizedAnnotation = { 
                ...ann, 
                coordinates: { ...ann.coordinates, text },
                createdAt: new Date().toISOString() // Finalize creation time
            };
            return finalizedAnnotation;
        }
        return ann;
    });

    if (finalizedAnnotation) {
        // This was a new (temp) item, now it's finalized
        updateAnnotationsAndHistory(newAnnotations, 'update'); 
    }
    setState(prev => ({ ...prev, textInputPosition: null }));
  };

  const cancelTextInput = () => {
    if (!state.textInputPosition) return;
    const { annotationId } = state.textInputPosition;
    // Remove the temporary annotation that was added
    const newAnnotations = state.annotations.filter(ann => ann.id !== annotationId);
    
    // Don't add to history for a cancelled action
    setState(prev => ({
        ...prev,
        annotations: newAnnotations,
        textInputPosition: null,
        selectedAnnotationIds: []
    }));
  };

  const deleteSelectedAnnotations = () => {
    const newAnnotations = state.annotations.filter(a => !state.selectedAnnotationIds.includes(a.id));
    updateAnnotationsAndHistory(newAnnotations, 'delete');
    setState(prev => ({ ...prev, selectedAnnotationIds: [] }));
  };
  
  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    const newAnnotations = state.annotations.map(ann => ann.id === id ? { ...ann, ...updates } : ann);
    updateAnnotationsAndHistory(newAnnotations, 'update');
  };
  
  // Hide/Show selected annotations
  const toggleAnnotationsVisibility = (ids: string[], visible: boolean) => {
    const newAnnotations = state.annotations.map(ann => 
        ids.includes(ann.id) ? { ...ann, visible } : ann
    );
    updateAnnotationsAndHistory(newAnnotations, 'visibility');
  };

  const undo = () => {
    setState((prev) => {
      if (prev.historyIndex <= 0) return prev;
      const newIndex = prev.historyIndex - 1;
      return { ...prev, annotations: prev.history[newIndex], historyIndex: newIndex, selectedAnnotationIds: [] };
    });
  };

  const redo = () => {
    setState((prev) => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;
      const newIndex = prev.historyIndex + 1;
      return { ...prev, annotations: prev.history[newIndex], historyIndex: newIndex, selectedAnnotationIds: [] };
    });
  };
  
  // Stubs for functions that might be called by AnnotationView
  // (Assuming these are not part of this core hook but are expected)
  const stubs = {
    saveAllAnnotationsSnapshot: () => console.log("Save snapshot"),
    loadVersions: () => console.log("Load versions"),
    lockAnnotations: (ids: string[], locked: boolean) => console.log("Lock", ids, locked),
    duplicateAnnotations: (ids: string[]) => console.log("Duplicate", ids),
    setImageBounds: (bounds: { width: number; height: number; }) => setState(prev => ({...prev, imageBounds: bounds})),
    // Other stubs...
    peerAnnotations: [],
    versions: [],
    versionsLoading: false,
    versionOverlay: null,
    currentVersion: undefined,
    previewVersion: () => {},
    restoreVersion: () => {},
    deleteVersion: () => {},
    togglePeerAnnotations: () => {},
  };


  return {
    ...state,
    ...stubs, // Include stubs
    canvasRef, setTool, setColor, startDrawing, updateDrawing, finishDrawing,
    deleteSelectedAnnotations, updateAnnotation, toggleAnnotationsVisibility,
    undo, redo, completeTextInput, cancelTextInput,
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
  };
}

