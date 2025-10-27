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
  isLocked: boolean; // Note: This might represent global lock state, not individual annotation lock
  versions: any[]; // Ensure this matches the type expected by AnnotationHistory
  versionsLoading: boolean;
  imageBounds: { width: number; height: number } | null;
  currentAnnotation: Partial<Annotation> | null;
}

// Fix: Correct API Base path based on backend routes (annotations.py)
const API_BASE = "/api/version"; // Matches backend annotations.py router prefix

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
             // Ensure radius exists
            if (typeof coords.x !== 'number' || typeof coords.y !== 'number' || typeof coords.radius !== 'number') return false;
            const distance = Math.sqrt((px - coords.x) ** 2 + (py - coords.y) ** 2);
            return distance <= coords.radius;
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
    // Prevent drawing if locked (global or specific annotation?)
    // Assuming global lock for now based on state name
    if (state.isLocked) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
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
          // Allow dragging selected annotation? Check if it's locked here.
          // if (clickedAnnotation.locked) { /* Prevent drag start */ }
        }
      } else {
        setState(prev => ({ ...prev, selectedAnnotationIds: [] }));
      }
      return;
    }

    if (!state.tool) return;

    const newAnnotation: Partial<Annotation> = {
      id: uuidv4(), caseId, userId, type: state.tool, color: state.color, visible: true, locked: false,
      coordinates: { start: { x, y } } // Store start point
    };

    if (state.tool === 'text') {
      // Initialize with start point, actual x,y,w,h set during updateDrawing
      newAnnotation.coordinates = { ...newAnnotation.coordinates, x:x, y:y, width: 0, height: 0, text: '' };
    } else if (state.tool === 'freehand') {
        newAnnotation.coordinates.points = [{ x, y }];
    } else if (state.tool === 'polygon') {
         // Initialize polygon with the first point
        newAnnotation.coordinates.points = [{ x, y }];
    }


    setState((prev) => ({
        ...prev,
        isDrawing: true,
        currentAnnotation: newAnnotation,
         // Add temp annotation for immediate feedback (except for polygon)
        annotations: state.tool !== 'polygon' ? [...prev.annotations, newAnnotation as Annotation] : prev.annotations
    }));
  };

  const updateDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Prevent drawing if locked
    if (!state.isDrawing || !state.tool || state.isLocked) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setState(prev => {
        if (!prev.currentAnnotation) return prev;

        const currentId = prev.currentAnnotation.id;
        // Ensure start coordinates exist
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
                const dx = x - start.x;
                const dy = y - start.y;
                newCoords.x = start.x; // Center remains at start point
                newCoords.y = start.y;
                newCoords.radius = Math.sqrt(dx * dx + dy * dy);
                break;
            case "triangle":
                const bboxX = Math.min(start.x, x);
                const bboxY = Math.min(start.y, y);
                const width = Math.abs(x - start.x);
                const height = Math.abs(y - start.y);
                newCoords.points = [
                    { x: bboxX + width / 2, y: bboxY },
                    { x: bboxX, y: bboxY + height },
                    { x: bboxX + width, y: bboxY + height },
                ];
                break;
            case "freehand":
                const lastPoint = newCoords.points?.[newCoords.points.length - 1];
                if (!lastPoint || Math.sqrt((x - lastPoint.x)**2 + (y - lastPoint.y)**2) > 3) {
                   newCoords.points = [...(newCoords.points || []), { x, y }];
                }
                break;
            case "polygon":
                 break; // Polygon points added on click
        }

        const updatedAnnotation = { ...prev.currentAnnotation, coordinates: newCoords };

        // Update the temporary annotation in the main list
        return {
            ...prev,
            currentAnnotation: updatedAnnotation,
            annotations: prev.annotations.map(ann => ann.id === currentId ? updatedAnnotation as Annotation : ann)
        };
    });
  };

  const finishDrawing = () => {
     // Prevent finishing if locked
    if (!state.isDrawing || !state.currentAnnotation || state.isLocked) return;

    const ann = state.currentAnnotation;
    const coords = ann.coordinates;

    // Check validity
    let isValid = true;
    if ((ann.type === 'rectangle' || ann.type === 'text') && (!coords?.width || !coords?.height || coords.width < 5 || coords.height < 5 )) isValid = false;
    else if (ann.type === 'circle' && (!coords?.radius || coords.radius < 3)) isValid = false;
    else if (ann.type === 'freehand' && (!coords?.points || coords.points.length < 2)) isValid = false;
    else if (ann.type === 'triangle' && (!coords?.points || coords.points.length < 3)) isValid = false;

    if (!isValid) {
        // Remove invalid temp annotation
        setState(prev => ({
            ...prev, isDrawing: false, currentAnnotation: null,
            annotations: prev.annotations.filter(a => a.id !== ann.id)
        }));
        return;
    }

    if (state.tool === 'text') {
        // Finalize text box position, open editor
        setState(prev => ({
            ...prev,
            textInputPosition: {
                x: ann.coordinates.x, y: ann.coordinates.y,
                width: ann.coordinates.width, height: ann.coordinates.height,
                annotationId: ann.id!,
            },
            isDrawing: false,
            currentAnnotation: null,
            selectedAnnotationIds: []
        }));
        return; // History update happens in completeTextInput
    }

     // Finalize other shapes
    const completedAnnotation = {
        ...state.currentAnnotation,
        coordinates: { ...state.currentAnnotation.coordinates, start: undefined }, // Remove temp start point
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

    // Update the temporary text annotation
    const newAnnotations = state.annotations.map(ann => {
        if (ann.id === annotationId) {
            finalizedAnnotation = {
                ...ann,
                coordinates: { ...ann.coordinates, text: text, start: undefined },
                createdAt: new Date().toISOString()
            };
            return finalizedAnnotation;
        }
        return ann;
    });

    if (finalizedAnnotation) {
        updateAnnotationsAndHistory(newAnnotations, 'update'); // Save completed text box to history
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
    // Remove the temporary annotation
    const newAnnotations = state.annotations.filter(ann => ann.id !== annotationId);
    setState(prev => ({
        ...prev,
        annotations: newAnnotations,
        textInputPosition: null,
        selectedAnnotationIds: []
    }));
     // No history update needed
  };

  const deleteSelectedAnnotations = () => {
     if (state.selectedAnnotationIds.length === 0) return;

     // Fix: Filter out locked annotations *before* deleting
     const deletableIds = state.selectedAnnotationIds.filter(id => {
         const ann = state.annotations.find(a => a.id === id);
         return ann && !ann.locked; // Only allow deleting if found and not locked
     });

     if (deletableIds.length === 0) {
         console.log("No unlocked annotations selected for deletion.");
         return; // Nothing to delete
     }

    // Filter out annotations that are NOT selected and deletable
    const newAnnotations = state.annotations.filter(a => !deletableIds.includes(a.id));

    // Update history only if something was actually deleted
    if (newAnnotations.length < state.annotations.length) {
       updateAnnotationsAndHistory(newAnnotations, 'delete');
    }

    // Clear selection after delete attempt
    setState(prev => ({ ...prev, selectedAnnotationIds: [] }));
  };

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
     // Find the annotation first to check if it's locked
     const annotationToUpdate = state.annotations.find(ann => ann.id === id);
     if (annotationToUpdate?.locked) {
         console.log(`Annotation ${id} is locked. Cannot update.`);
         return; // Prevent updating locked annotations
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
        // Fix: Prevent hiding/showing locked annotations
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
     // Note: Locking itself should always be allowed
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
       // Fix: Prevent duplicating locked annotations
      if (original && !original.locked) {
        const newId = uuidv4();
        const newCoords = JSON.parse(JSON.stringify(original.coordinates));
        const offset = 10;

        // Offset coordinates
        if (typeof newCoords.x === 'number' && typeof newCoords.y === 'number') {
            newCoords.x += offset;
            newCoords.y += offset;
        } else if (Array.isArray(newCoords.points)) {
            newCoords.points = newCoords.points.map((p: {x: number, y: number}) => ({ x: p.x + offset, y: p.y + offset }));
        }

        newAnnotationsToAdd.push({
          ...original,
          id: newId,
          locked: false, // Duplicates start unlocked
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

  // --- API Functions ---
  const saveAllAnnotationsSnapshot = async () => {
    if (!userId) { console.error("Cannot save: userId missing."); return; }
    try {
      const response = await fetch(`${API_BASE}/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, userId, data: { annotations: state.annotations } }),
      });
       if (!response.ok) { throw new Error(`HTTP ${response.status}`); }
      await loadVersions();
      console.log("Snapshot saved.");
    } catch (error) { console.error("Save snapshot failed:", error); }
  };

 const loadVersions = useCallback(async () => {
    if (!caseId || !userId) {
      setState(prev => ({ ...prev, versions: [], versionsLoading: false })); return;
    }
    setState(prev => ({ ...prev, versionsLoading: true }));
    let versionsData: any[] = [];
    try {
      const res = await fetch(`${API_BASE}/${caseId}/${userId}`);
      if (!res.ok) { if (res.status !== 404) throw new Error(`HTTP ${res.status}`); }
      else {
         const data = await res.json();
         if (Array.isArray(data)) versionsData = data;
         else console.error("Loaded versions not an array:", data);
      }
    } catch (error) { console.error("Load versions failed:", error); }
    finally { setState(prev => ({ ...prev, versions: versionsData, versionsLoading: false })); }
  }, [caseId, userId]);

  const deleteVersion = async (id: string) => {
    if (!id) { console.error("Cannot delete: ID missing."); return; }
    try {
      const response = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
        if (!response.ok) { throw new Error(`HTTP ${response.status}`); }
      await loadVersions();
      console.log(`Version ${id} deleted.`);
    } catch (error) { console.error("Delete version failed:", error); }
  };

  const setImageBounds = (bounds: { width: number; height: number; }) => {
    setState(prev => ({...prev, imageBounds: bounds}));
  };

  // Fetch initial versions
  useEffect(() => { loadVersions(); }, [loadVersions]);

  return {
    ...state, // Spread all state properties
    // Functions
    canvasRef, setTool, setColor, startDrawing, updateDrawing, finishDrawing,
    deleteSelectedAnnotations, updateAnnotation, toggleAnnotationsVisibility,
    lockAnnotations, duplicateAnnotations, undo, redo,
    completeTextInput, cancelTextInput, saveAllAnnotationsSnapshot,
    loadVersions, deleteVersion, setImageBounds,
    // Calculated values
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < (state.history?.length ?? 1) - 1, // Safe check for history length
  };
}

