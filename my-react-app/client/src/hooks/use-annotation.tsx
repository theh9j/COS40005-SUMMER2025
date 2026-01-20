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
  | "eraser"
  | null;

// Using a more specific type for Annotation
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
  strokeWidth?: number; // Line/stroke width for drawing tools
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
  strokeWidth: number;
  textInputPosition: { x: number; y: number; width: number; height: number; annotationId: string } | null;
  // Other state properties from your original file
  peerAnnotations: any[];
  isLocked: boolean; // Note: This might represent global lock state, not individual annotation lock
  versions: any[]; // Ensure this matches the type expected by AnnotationHistory
  versionsLoading: boolean;
  imageBounds: { width: number; height: number } | null;
  currentAnnotation: Partial<Annotation> | null;
}

// Fix: Correct API Base path based on backend routes (annotations.py)
const API_BASE = "http://localhost:8000/annotations"; // Matches backend annotations.py router prefix

const isPointInShape = (px: number, py: number, ann: Annotation): boolean => {
    const coords = ann.coordinates;
    // Don't allow selecting hidden shapes
    if (!coords || ann.visible === false) return false;

    switch (ann.type) {
        case 'rectangle':
        case 'text':
            // Ensure width and height exist before checking bounds
            if (typeof coords.x !== 'number' || typeof coords.y !== 'number' || typeof coords.width !== 'number' || typeof coords.height !== 'number') return false;
            return (px >= coords.x && px <= coords.x + coords.width && py >= coords.y && py <= coords.y + coords.height);
        case 'circle':
            // Ellipse check
            if (typeof coords.x !== 'number' || typeof coords.y !== 'number' || typeof coords.radiusX !== 'number' || typeof coords.radiusY !== 'number') return false;
            const p = ((px - coords.x) ** 2) / (coords.radiusX ** 2) + ((py - coords.y) ** 2) / (coords.radiusY ** 2);
            return p <= 1;
        case 'triangle':
        case 'polygon': {
            let inside = false;
            const points = coords.points || [];
             if (!Array.isArray(points) || points.length < 3) return false; // Need at least 3 points
            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                 // Ensure points have x and y
                if (typeof points[i]?.x !== 'number' || typeof points[i]?.y !== 'number' || typeof points[j]?.x !== 'number' || typeof points[j]?.y !== 'number') continue;
                const xi = points[i].x, yi = points[i].y;
                const xj = points[j].x, yj = points[j].y;
                // Avoid division by zero if yi == yj
                const intersect = ((yi > py) !== (yj > py)) && (yj - yi !== 0) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }
        case 'freehand': { // Added check for freehand
            const points = coords.points || [];
            if (!Array.isArray(points) || points.length === 0) return false;
             // Ensure all points have x and y before calculating bounds
            if (!points.every(p => typeof p?.x === 'number' && typeof p?.y === 'number')) return false;
            // Simple bounding box check for performance
            const xs = points.map((p: any) => p.x);
            const ys = points.map((p: any) => p.y);
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
    strokeWidth: 2,
    textInputPosition: null,
    // Defaults for other state properties
    peerAnnotations: [],
    isLocked: false, // Represents global lock, maybe rename?
    versions: [], // Initialize as empty array
    versionsLoading: false,
    imageBounds: null,
    currentAnnotation: null,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const updateAnnotationsAndHistory = useCallback((newAnnotations: Annotation[], action: 'drawing' | 'update' | 'delete' | 'visibility' | 'lock' | 'duplicate') => {
    setState(prev => {
      // If history was undone, clear the "future"
      const currentHistory = prev.history || [[]]; // Ensure history exists
      const newHistory = currentHistory.slice(0, prev.historyIndex + 1);
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
    if (state.isLocked) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (state.tool === 'select') {
      const clickedAnnotation = [...state.annotations].reverse().find(ann => isPointInShape(x, y, ann));
      if (clickedAnnotation) {
        if (e.shiftKey) {
          setState(prev => ({
            ...prev,
            selectedAnnotationIds: prev.selectedAnnotationIds.includes(clickedAnnotation.id)
              ? prev.selectedAnnotationIds.filter(id => id !== clickedAnnotation.id)
              : [...prev.selectedAnnotationIds, clickedAnnotation.id]
          }));
        } else {
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
      id: uuidv4(), caseId, userId, type: state.tool, color: state.color, visible: true, locked: false,
      coordinates: { start: { x, y } }
    };

    if (state.tool === 'text' || state.tool === 'circle') {
      newAnnotation.coordinates = { ...newAnnotation.coordinates, x:x, y:y, width: 0, height: 0, text: '' };
    } else if (state.tool === 'freehand' || state.tool === 'polygon' || state.tool === 'eraser') {
        newAnnotation.coordinates.points = [{ x, y }];
    }
    
    // Store current stroke width with the annotation
    newAnnotation.strokeWidth = state.strokeWidth;

    setState((prev) => ({
        ...prev,
        isDrawing: true,
        currentAnnotation: newAnnotation,
        annotations: state.tool !== 'polygon' ? [...prev.annotations, newAnnotation as Annotation] : prev.annotations
    }));
  };

  const updateDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!state.isDrawing || !state.tool || state.isLocked) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setState(prev => {
        if (!prev.currentAnnotation) return prev;

        const currentId = prev.currentAnnotation.id;
        const start = prev.currentAnnotation.coordinates?.start || { x: 0, y: 0 };
        const newCoords = { ...prev.currentAnnotation.coordinates };

        switch(state.tool) {
            case "rectangle":
            case "text":
                newCoords.x = Math.min(start.x, x);
                newCoords.y = Math.min(start.y, y);
                newCoords.width = Math.abs(x - start.x);
                newCoords.height = Math.abs(y - start.y);
                break;
            case "circle":
                const width = Math.abs(x - start.x);
                const height = Math.abs(y - start.y);
                newCoords.x = start.x + (x - start.x) / 2;
                newCoords.y = start.y + (y - start.y) / 2;
                newCoords.radiusX = width / 2;
                newCoords.radiusY = height / 2;
                break;
            case "triangle":
                const bboxX = Math.min(start.x, x);
                const bboxY = Math.min(start.y, y);
                const triWidth = Math.abs(x - start.x);
                const triHeight = Math.abs(y - start.y);
                newCoords.points = [
                    { x: bboxX + triWidth / 2, y: bboxY },
                    { x: bboxX, y: bboxY + triHeight },
                    { x: bboxX + triWidth, y: bboxY + triHeight },
                ];
                break;
            case "freehand":
            case "eraser":
                const lastPoint = newCoords.points?.[newCoords.points.length - 1];
                if (!lastPoint || Math.sqrt((x - lastPoint.x)**2 + (y - lastPoint.y)**2) > 3) {
                   newCoords.points = [...(newCoords.points || []), { x, y }];
                }
                break;
            case "polygon":
                 break;
        }

        const updatedAnnotation = { ...prev.currentAnnotation, coordinates: newCoords };

        return {
            ...prev,
            currentAnnotation: updatedAnnotation,
            annotations: prev.annotations.map(ann => ann.id === currentId ? updatedAnnotation as Annotation : ann)
        };
    });
  };

  const finishDrawing = () => {
    if (!state.isDrawing || !state.currentAnnotation || state.isLocked) return;

    const ann = state.currentAnnotation;
    const coords = ann.coordinates;

    let isValid = true;
    if ((ann.type === 'rectangle' || ann.type === 'text') && (!coords?.width || !coords?.height || coords.width < 5 || coords.height < 5 )) isValid = false;
    else if (ann.type === 'circle' && (!coords?.radiusX || !coords?.radiusY || coords.radiusX < 3 || coords.radiusY < 3)) isValid = false;
    else if ((ann.type === 'freehand' || ann.type === 'eraser') && (!coords?.points || coords.points.length < 2)) isValid = false;
    else if (ann.type === 'triangle' && (!coords?.points || coords.points.length < 3)) isValid = false;

    if (!isValid) {
        setState(prev => ({
            ...prev, isDrawing: false, currentAnnotation: null,
            annotations: prev.annotations.filter(a => a.id !== ann.id)
        }));
        return;
    }

    if (state.tool !== 'freehand' && state.tool !== 'select' && state.tool !== 'polygon' && state.tool !== 'eraser') {
      let textX, textY, textWidth, textHeight;
      if (ann.type === 'rectangle' || ann.type === 'text') {
        textX = ann.coordinates.x;
        textY = ann.coordinates.y;
        textWidth = ann.coordinates.width;
        textHeight = ann.coordinates.height;
      } else if (ann.type === 'circle') {
        textX = ann.coordinates.x - ann.coordinates.radiusX;
        textY = ann.coordinates.y - ann.coordinates.radiusY;
        textWidth = ann.coordinates.radiusX * 2;
        textHeight = ann.coordinates.radiusY * 2;
      } else if (ann.type === 'triangle') {
        const xs = ann.coordinates.points.map((p: any) => p.x);
        const ys = ann.coordinates.points.map((p: any) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        textX = minX;
        textY = minY;
        textWidth = Math.max(...xs) - minX;
        textHeight = Math.max(...ys) - minY;
      } else {
        textX = 0; textY = 0; textWidth = 200; textHeight = 40;
      }

      setState(prev => ({
          ...prev,
          textInputPosition: {
              x: textX, y: textY,
              width: textWidth, height: textHeight,
              annotationId: ann.id!,
          },
          isDrawing: false,
          currentAnnotation: null,
          selectedAnnotationIds: []
      }));
      return;
    }

    const completedAnnotation = {
        ...state.currentAnnotation,
        coordinates: { ...state.currentAnnotation.coordinates, start: undefined },
        createdAt: new Date().toISOString()
    } as Annotation;

    const finalAnnotations = state.annotations.map(a => a.id === ann.id ? completedAnnotation : a);

    updateAnnotationsAndHistory(finalAnnotations, 'drawing');
    setState(prev => ({ ...prev, isDrawing: false, currentAnnotation: null }));
  };

  const completeTextInput = (text: string) => {
    if (!state.textInputPosition) return;
    const { annotationId } = state.textInputPosition;
    let finalizedAnnotation: Annotation | undefined;

    const newAnnotations = state.annotations.map(ann => {
        if (ann.id === annotationId) {
            const updates: Partial<Annotation> = {
                createdAt: new Date().toISOString(),
            };
            if(ann.type === 'text') {
              updates.coordinates = { ...ann.coordinates, text: text, start: undefined };
            } else {
              updates.label = text;
              updates.coordinates = { ...ann.coordinates, start: undefined };
            }
            finalizedAnnotation = { ...ann, ...updates };
            return finalizedAnnotation;
        }
        return ann;
    });

    if (finalizedAnnotation) {
        updateAnnotationsAndHistory(newAnnotations, 'update');
    } else {
         console.error("Could not find annotation for text input:", annotationId);
         const cleanedAnnotations = state.annotations.filter(ann => ann.id !== annotationId);
         setState(prev => ({ ...prev, annotations: cleanedAnnotations }));
    }
    setState(prev => ({ ...prev, textInputPosition: null }));
  };

  const cancelTextInput = () => {
    if (!state.textInputPosition) return;
    const { annotationId } = state.textInputPosition;
    const annotation = state.annotations.find(ann => ann.id === annotationId);

    // If it's not a text tool, the shape is already drawn, so we just close the input
    if(annotation && annotation.type !== 'text') {
       const finalAnnotations = state.annotations.map(a => a.id === annotationId ? { ...a, coordinates: {...a.coordinates, start: undefined}, createdAt: new Date().toISOString() } as Annotation : a);
       updateAnnotationsAndHistory(finalAnnotations, 'drawing');
       setState(prev => ({ ...prev, textInputPosition: null, selectedAnnotationIds: [] }));
    } else { // if it is a text tool, we cancel the annotation itself
      const newAnnotations = state.annotations.filter(ann => ann.id !== annotationId);
      setState(prev => ({
          ...prev,
          annotations: newAnnotations,
          textInputPosition: null,
          selectedAnnotationIds: []
      }));
    }
  };

  const deleteSelectedAnnotations = () => {
     if (state.selectedAnnotationIds.length === 0) return;

     const deletableIds = state.selectedAnnotationIds.filter(id => {
         const ann = state.annotations.find(a => a.id === id);
         return ann && !ann.locked;
     });

     if (deletableIds.length === 0) {
         console.log("No unlocked annotations selected for deletion.");
         return;
     }

    const newAnnotations = state.annotations.filter(a => !deletableIds.includes(a.id));

    if (newAnnotations.length < state.annotations.length) {
       updateAnnotationsAndHistory(newAnnotations, 'delete');
    }

    setState(prev => ({ ...prev, selectedAnnotationIds: [] }));
  };

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
     const annotationToUpdate = state.annotations.find(ann => ann.id === id);
     if (annotationToUpdate?.locked) {
         console.log(`Annotation ${id} is locked. Cannot update.`);
         return;
     }

    const newAnnotations = state.annotations.map(ann =>
        (ann.id === id) ? { ...ann, ...updates, updatedAt: new Date().toISOString() } : ann
    );

    if (JSON.stringify(newAnnotations) !== JSON.stringify(state.annotations)) {
        updateAnnotationsAndHistory(newAnnotations, 'update');
    }
  };

  const toggleAnnotationsVisibility = (ids: string[], visible: boolean) => {
    let changed = false;
    const newAnnotations = state.annotations.map(ann => {
        if (ids.includes(ann.id) && !ann.locked && ann.visible !== visible) {
            changed = true;
            return { ...ann, visible, updatedAt: new Date().toISOString() };
        }
        return ann;
    });
     if (changed) {
        updateAnnotationsAndHistory(newAnnotations, 'visibility');
     }
  };

  const lockAnnotations = (ids: string[], locked: boolean) => {
     let changed = false;
    const newAnnotations = state.annotations.map(ann => {
      if (ids.includes(ann.id) && ann.locked !== locked) {
          changed = true;
          return { ...ann, locked, updatedAt: new Date().toISOString() };
      }
       return ann;
    });
     if (changed) {
        updateAnnotationsAndHistory(newAnnotations, 'lock');
     }
  };

  const duplicateAnnotations = (ids: string[]) => {
    const newAnnotationsToAdd: Annotation[] = [];
    ids.forEach(id => {
      const original = state.annotations.find(a => a.id === id);
      if (original && !original.locked) {
        const newId = uuidv4();
        const newCoords = JSON.parse(JSON.stringify(original.coordinates));
        const offset = 10;

        if (typeof newCoords.x === 'number' && typeof newCoords.y === 'number') {
            newCoords.x += offset;
            newCoords.y += offset;
        } else if (Array.isArray(newCoords.points)) {
            newCoords.points = newCoords.points.map((p: {x: number, y: number}) => ({ x: p.x + offset, y: p.y + offset }));
        }

        newAnnotationsToAdd.push({
          ...original,
          id: newId,
          locked: false,
          coordinates: newCoords,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else if (original?.locked) {
          console.log(`Annotation ${id} is locked. Cannot duplicate.`);
      }
    });

    if (newAnnotationsToAdd.length > 0) {
       const combinedAnnotations = [...state.annotations, ...newAnnotationsToAdd];
       updateAnnotationsAndHistory(combinedAnnotations, 'duplicate');
    }
  };

  const undo = () => {
    setState((prev) => {
      const currentHistory = prev.history || [[]];
      if (prev.historyIndex <= 0) return prev;
      const newIndex = prev.historyIndex - 1;
      return {
          ...prev,
          annotations: currentHistory[newIndex],
          historyIndex: newIndex,
          selectedAnnotationIds: [],
          textInputPosition: null,
          currentAnnotation: null,
          isDrawing: false,
      };
    });
  };

  const redo = () => {
    setState((prev) => {
       const currentHistory = prev.history || [[]];
      if (prev.historyIndex >= currentHistory.length - 1) return prev;
      const newIndex = prev.historyIndex + 1;
      return {
          ...prev,
          annotations: currentHistory[newIndex],
          historyIndex: newIndex,
          selectedAnnotationIds: [],
          textInputPosition: null,
          currentAnnotation: null,
          isDrawing: false,
      };
    });
  };

  const saveAllAnnotationsSnapshot = async () => {
    if (!userId || !caseId) {
      console.error("Cannot save snapshot: userId or caseId missing.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          userId,
          annotations: state.annotations,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      console.log(result.message);
      await loadVersions();
    } catch (error) {
      console.error("Failed to save snapshot:", error);
    }
  };

  const loadVersions = useCallback(async () => {
    if (!caseId || !userId) {
      setState(prev => ({ ...prev, versions: [], versionsLoading: false }));
      return;
    }

    setState(prev => ({ ...prev, versionsLoading: true }));

    try {
      const res = await fetch(`${API_BASE}/version/${caseId}/${userId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        const sorted = [...data]
          .map((v) => ({
            ...v,
            id: v._id, // Map _id to id for component compatibility
          }))
          .sort((a, b) => b.version - a.version);
        setState(prev => ({
          ...prev,
          versions: sorted,
          versionsLoading: false,
        }));
      } else {
        console.error("Unexpected version data:", data);
        setState(prev => ({ ...prev, versions: [], versionsLoading: false }));
      }
    } catch (error) {
      console.error("Failed to load versions:", error);
      setState(prev => ({ ...prev, versions: [], versionsLoading: false }));
    }
  }, [caseId, userId]);

  const deleteVersion = async (versionId: string) => {
    if (!versionId) {
      console.error("Cannot delete: ID missing.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/version/${versionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || `HTTP ${res.status}`);
      }
      console.log("Version deleted successfully.");
      await loadVersions();
    } catch (error) {
      console.error("Failed to delete version:", error);
    }
  };

  const restoreVersion = async (versionData: any) => {
    if (!versionData?.annotations) {
      console.error("Invalid version data for restore.");
      return;
    }
    setState(prev => ({
      ...prev,
      annotations: versionData.annotations,
      history: [...prev.history, versionData.annotations],
      historyIndex: prev.history.length,
    }));
    console.log(`Restored version v${versionData.version}`);
  };

  const setImageBounds = (bounds: { width: number; height: number; }) => {
    setState(prev => ({...prev, imageBounds: bounds}));
  };

  const setStrokeWidth = (width: number) => {
    setState(prev => ({...prev, strokeWidth: Math.max(1, Math.min(20, width))}));
  };

  useEffect(() => { loadVersions(); }, [loadVersions]);

  return {
    ...state,
    canvasRef, setTool, setColor, setStrokeWidth, startDrawing, updateDrawing, finishDrawing,
    deleteSelectedAnnotations, updateAnnotation, toggleAnnotationsVisibility,
    lockAnnotations, duplicateAnnotations, undo, redo,
    completeTextInput, cancelTextInput, saveAllAnnotationsSnapshot,
    loadVersions, deleteVersion, setImageBounds, restoreVersion,
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < (state.history?.length ?? 1) - 1,
  };
}