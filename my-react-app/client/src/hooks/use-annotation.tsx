import { useState, useCallback, useRef } from "react";
import { Annotation, AnnotationVersion } from "@shared/schema";

export type AnnotationTool = "select" | "rectangle" | "circle" | "polygon" | "freehand" | "text";

interface AnnotationState {
  tool: AnnotationTool;
  color: string;
  isDrawing: boolean;
  currentAnnotation: Partial<Annotation> | null;
  annotations: Annotation[];
  history: Annotation[][];
  historyIndex: number;
  versions: AnnotationVersion[];
  currentVersion: number;
  versionOverlay: Annotation | null;
  peerAnnotations: Map<string, { annotations: Annotation[]; color: string; visible: boolean }>;
  selectedAnnotationIds: string[];
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
  isResizing: boolean;
  resizeHandle: string | null;
  resizeAnchor: { x: number; y: number } | null;
  textInputPosition: { x: number; y: number; width?: number; height?: number } | null;
  clipboard: Annotation[];
  imageBounds: { width: number; height: number };
}

function clampRectToImageBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  imageBounds: { width: number; height: number }
): { x: number; y: number; width: number; height: number } {
  const maxWidth = imageBounds.width;
  const maxHeight = imageBounds.height;
  
  const clampedX = Math.max(0, Math.min(x, maxWidth - width));
  const clampedY = Math.max(0, Math.min(y, maxHeight - height));
  const clampedWidth = Math.min(width, maxWidth - clampedX);
  const clampedHeight = Math.min(height, maxHeight - clampedY);
  
  return { x: clampedX, y: clampedY, width: clampedWidth, height: clampedHeight };
}

export function useAnnotation(caseId: string, userId?: string) {
  const [state, setState] = useState<AnnotationState>({
    tool: "select",
    color: "#ef4444",
    isDrawing: false,
    currentAnnotation: null,
    annotations: [],
    history: [[]],
    historyIndex: 0,
    versions: [],
    currentVersion: 1,
    versionOverlay: null,
    peerAnnotations: new Map(),
    selectedAnnotationIds: [],
    isDragging: false,
    dragStart: null,
    isResizing: false,
    resizeHandle: null,
    resizeAnchor: null,
    textInputPosition: null,
    clipboard: [],
    imageBounds: { width: 800, height: 600 },
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const setTool = useCallback((tool: AnnotationTool) => {
    setState(prev => ({ ...prev, tool }));
  }, []);

  const setColor = useCallback((color: string) => {
    setState(prev => ({ ...prev, color }));
  }, []);

  const getResizeHandle = (x: number, y: number, ann: Annotation) => {
    if (ann.type !== "rectangle") return null;
    
    const coords = ann.coordinates as any;
    if (!coords.width || !coords.height) return null;
    
    const handleSize = 8;
    const handles = [
      { name: 'nw', x: coords.x, y: coords.y },
      { name: 'ne', x: coords.x + coords.width, y: coords.y },
      { name: 'se', x: coords.x + coords.width, y: coords.y + coords.height },
      { name: 'sw', x: coords.x, y: coords.y + coords.height },
      { name: 'n', x: coords.x + coords.width / 2, y: coords.y },
      { name: 'e', x: coords.x + coords.width, y: coords.y + coords.height / 2 },
      { name: 's', x: coords.x + coords.width / 2, y: coords.y + coords.height },
      { name: 'w', x: coords.x, y: coords.y + coords.height / 2 },
    ];
    
    for (const handle of handles) {
      if (Math.abs(x - handle.x) <= handleSize && Math.abs(y - handle.y) <= handleSize) {
        return handle.name;
      }
    }
    
    return null;
  };

  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (state.tool === "select") {
      const selectedAnn = state.annotations.find(ann => state.selectedAnnotationIds.includes(ann.id));
      if (selectedAnn && state.selectedAnnotationIds.length === 1) {
        const handle = getResizeHandle(x, y, selectedAnn);
        if (handle && selectedAnn.type === "rectangle") {
          const coords = selectedAnn.coordinates as any;
          let anchorX = coords.x;
          let anchorY = coords.y;
          
          switch (handle) {
            case 'nw':
              anchorX = coords.x + coords.width;
              anchorY = coords.y + coords.height;
              break;
            case 'ne':
              anchorX = coords.x;
              anchorY = coords.y + coords.height;
              break;
            case 'se':
              anchorX = coords.x;
              anchorY = coords.y;
              break;
            case 'sw':
              anchorX = coords.x + coords.width;
              anchorY = coords.y;
              break;
            case 'n':
              anchorX = coords.x + coords.width / 2;
              anchorY = coords.y + coords.height;
              break;
            case 'e':
              anchorX = coords.x;
              anchorY = coords.y + coords.height / 2;
              break;
            case 's':
              anchorX = coords.x + coords.width / 2;
              anchorY = coords.y;
              break;
            case 'w':
              anchorX = coords.x + coords.width;
              anchorY = coords.y + coords.height / 2;
              break;
          }
          
          setState(prev => ({
            ...prev,
            isResizing: true,
            resizeHandle: handle,
            resizeAnchor: { x: anchorX, y: anchorY },
          }));
          return;
        }
      }

      const isShiftPressed = event.shiftKey;
      const clickedAnnotation = state.annotations.find(ann => {
        const coords = ann.coordinates as any;
        if (ann.type === "rectangle") {
          return x >= coords.x && x <= coords.x + coords.width &&
                 y >= coords.y && y <= coords.y + coords.height;
        } else if (ann.type === "circle") {
          const distance = Math.sqrt(Math.pow(x - coords.x, 2) + Math.pow(y - coords.y, 2));
          return distance <= coords.radius;
        } else if (ann.type === "text") {
          const textWidth = coords.width || 200;
          const textHeight = coords.height || 40;
          return x >= coords.x && x <= coords.x + textWidth &&
                 y >= coords.y && y <= coords.y + textHeight;
        } else if (ann.type === "polygon" && coords.points && Array.isArray(coords.points)) {
          let inside = false;
          const points = coords.points;
          for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
          }
          return inside;
        } else if (ann.type === "freehand" && coords.points && Array.isArray(coords.points)) {
          const threshold = 10;
          for (let i = 0; i < coords.points.length - 1; i++) {
            const p1 = coords.points[i];
            const p2 = coords.points[i + 1];
            
            const segmentLength = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
            if (segmentLength === 0) {
              const distance = Math.sqrt(Math.pow(x - p1.x, 2) + Math.pow(y - p1.y, 2));
              if (distance <= threshold) return true;
              continue;
            }
            
            const t = Math.max(0, Math.min(1, ((x - p1.x) * (p2.x - p1.x) + (y - p1.y) * (p2.y - p1.y)) / (segmentLength * segmentLength)));
            const projX = p1.x + t * (p2.x - p1.x);
            const projY = p1.y + t * (p2.y - p1.y);
            
            const distance = Math.sqrt(Math.pow(x - projX, 2) + Math.pow(y - projY, 2));
            if (distance <= threshold) {
              return true;
            }
          }
          
          if (coords.points.length > 0) {
            const lastPoint = coords.points[coords.points.length - 1];
            const distance = Math.sqrt(Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2));
            if (distance <= threshold) return true;
          }
          
          return false;
        }
        return false;
      });
      
      setState(prev => {
        if (!clickedAnnotation) {
          return { ...prev, selectedAnnotationIds: [], isDragging: false, dragStart: null };
        }

        let newSelectedIds: string[];
        if (isShiftPressed) {
          if (prev.selectedAnnotationIds.includes(clickedAnnotation.id)) {
            newSelectedIds = prev.selectedAnnotationIds.filter(id => id !== clickedAnnotation.id);
          } else {
            newSelectedIds = [...prev.selectedAnnotationIds, clickedAnnotation.id];
          }
        } else {
          newSelectedIds = [clickedAnnotation.id];
        }

        return {
          ...prev,
          selectedAnnotationIds: newSelectedIds,
          isDragging: true,
          dragStart: { x, y },
        };
      });
      return;
    }

    if (state.tool === "text") {
      setState(prev => ({
        ...prev,
        isDrawing: true,
        currentAnnotation: {
          caseId,
          type: "text",
          coordinates: { x, y, width: 0, height: 0 },
          color: prev.color,
        },
      }));
      return;
    }

    const annotationType = state.tool === "rectangle" ? "rectangle" : 
                          state.tool === "circle" ? "circle" : 
                          state.tool === "polygon" ? "polygon" : "freehand";

    const initialCoords = (annotationType === "polygon" || annotationType === "freehand") 
      ? { points: [{ x, y }] } 
      : { x, y };

    setState(prev => ({
      ...prev,
      isDrawing: true,
      currentAnnotation: {
        caseId,
        type: annotationType,
        coordinates: initialCoords,
        color: prev.color,
      },
    }));
  }, [state.tool, state.annotations, state.color, caseId, userId]);

  const updateDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    if (state.tool === "select" && state.isResizing && state.resizeHandle && state.resizeAnchor && state.selectedAnnotationIds.length === 1) {
      setState(prev => {
        if (!prev.resizeAnchor) return prev;
        
        const clampedCurrentX = Math.max(0, Math.min(currentX, prev.imageBounds.width));
        const clampedCurrentY = Math.max(0, Math.min(currentY, prev.imageBounds.height));
        
        const targetId = prev.selectedAnnotationIds[0];
        const updatedAnnotations = prev.annotations.map(ann => {
          if (ann.id !== targetId || ann.type !== "rectangle") return ann;

          let x1 = prev.resizeAnchor!.x;
          let y1 = prev.resizeAnchor!.y;
          let x2 = clampedCurrentX;
          let y2 = clampedCurrentY;

          switch (prev.resizeHandle) {
            case 'n':
            case 's':
              x1 = (ann.coordinates as any).x;
              x2 = (ann.coordinates as any).x + (ann.coordinates as any).width;
              if (prev.resizeHandle === 'n') {
                y2 = clampedCurrentY;
              } else {
                y2 = clampedCurrentY;
              }
              break;
            case 'e':
            case 'w':
              y1 = (ann.coordinates as any).y;
              y2 = (ann.coordinates as any).y + (ann.coordinates as any).height;
              if (prev.resizeHandle === 'e') {
                x2 = clampedCurrentX;
              } else {
                x2 = clampedCurrentX;
              }
              break;
          }

          const minX = Math.min(x1, x2);
          const minY = Math.min(y1, y2);
          const width = Math.max(Math.abs(x2 - x1), 10);
          const height = Math.max(Math.abs(y2 - y1), 10);

          return { 
            ...ann, 
            coordinates: {
              x: minX,
              y: minY,
              width,
              height
            }
          };
        });

        return {
          ...prev,
          annotations: updatedAnnotations,
        };
      });
      return;
    }

    if (state.tool === "select" && state.isDragging && state.dragStart && state.selectedAnnotationIds.length > 0) {
      const deltaX = currentX - state.dragStart.x;
      const deltaY = currentY - state.dragStart.y;

      setState(prev => {
        const updatedAnnotations = prev.annotations.map(ann => {
          if (prev.selectedAnnotationIds.includes(ann.id) && !(ann as any).locked) {
            const coords = ann.coordinates as any;
            let newCoords;

            if (ann.type === "rectangle") {
              const clamped = clampRectToImageBounds(
                coords.x + deltaX,
                coords.y + deltaY,
                coords.width || 0,
                coords.height || 0,
                prev.imageBounds
              );
              newCoords = clamped;
            } else if (ann.type === "circle") {
              const radius = coords.radius || 0;
              const clampedX = Math.max(radius, Math.min(coords.x + deltaX, prev.imageBounds.width - radius));
              const clampedY = Math.max(radius, Math.min(coords.y + deltaY, prev.imageBounds.height - radius));
              newCoords = {
                ...coords,
                x: clampedX,
                y: clampedY,
              };
            } else if (ann.type === "text") {
              const clamped = clampRectToImageBounds(
                coords.x + deltaX,
                coords.y + deltaY,
                coords.width || 0,
                coords.height || 0,
                prev.imageBounds
              );
              newCoords = clamped;
            } else if (ann.type === "polygon" || ann.type === "freehand") {
              newCoords = {
                points: coords.points.map((p: any) => ({
                  x: p.x + deltaX,
                  y: p.y + deltaY,
                })),
              };
            } else {
              newCoords = coords;
            }

            return { ...ann, coordinates: newCoords };
          }
          return ann;
        });

        return {
          ...prev,
          annotations: updatedAnnotations,
          dragStart: { x: currentX, y: currentY },
        };
      });
      return;
    }

    if (!state.isDrawing || !state.currentAnnotation) return;

    setState(prev => {
      if (!prev.currentAnnotation) return prev;

      const startCoords = prev.currentAnnotation.coordinates as any;
      let updatedCoords;

      if (prev.tool === "rectangle" || prev.tool === "text") {
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
      } else if (prev.tool === "polygon") {
        updatedCoords = {
          points: [...startCoords.points, { x: currentX, y: currentY }],
        };
      } else if (prev.tool === "freehand") {
        updatedCoords = {
          points: [...startCoords.points, { x: currentX, y: currentY }],
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
    setState(prev => {
      if (prev.tool === "select" && prev.isResizing) {
        const newHistory = prev.history.slice(0, prev.historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(prev.annotations)));
        return {
          ...prev,
          isResizing: false,
          resizeHandle: null,
          resizeAnchor: null,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
      }

      if (prev.tool === "select" && prev.isDragging) {
        const newHistory = prev.history.slice(0, prev.historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(prev.annotations)));
        return {
          ...prev,
          isDragging: false,
          dragStart: null,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
      }

      if (!prev.isDrawing || !prev.currentAnnotation) return prev;

      if (prev.tool === "text") {
        const coords = prev.currentAnnotation.coordinates as any;
        const minSize = 20;
        
        if (coords.width < minSize || coords.height < minSize) {
          return {
            ...prev,
            isDrawing: false,
            currentAnnotation: null,
          };
        }
        
        const maxWidth = prev.imageBounds.width;
        const maxHeight = prev.imageBounds.height;
        const clampedX = Math.max(0, Math.min(coords.x, maxWidth - coords.width));
        const clampedY = Math.max(0, Math.min(coords.y, maxHeight - coords.height));
        const clampedWidth = Math.min(coords.width, maxWidth - clampedX);
        const clampedHeight = Math.min(coords.height, maxHeight - clampedY);
        
        return {
          ...prev,
          isDrawing: false,
          currentAnnotation: null,
          textInputPosition: { 
            x: clampedX, 
            y: clampedY,
            width: clampedWidth,
            height: clampedHeight
          },
        };
      }

      const newAnnotation: Annotation = {
        id: Math.random().toString(36).substr(2, 9),
        userId: userId || "1",
        ...prev.currentAnnotation,
        createdAt: new Date(),
      } as Annotation;

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
  }, [userId]);

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

  const saveVersion = useCallback((annotationId: string, changeDescription?: string) => {
    setState(prev => {
      const targetAnnotation = prev.annotations.find(a => a.id === annotationId);
      if (!targetAnnotation) {
        console.warn('Cannot save version: annotation not found');
        return prev;
      }

      const newVersion: AnnotationVersion = {
        id: Math.random().toString(36).substr(2, 9),
        annotationId: targetAnnotation.id,
        userId: userId || "1",
        version: prev.currentVersion + 1,
        type: targetAnnotation.type,
        coordinates: targetAnnotation.coordinates,
        color: targetAnnotation.color,
        label: targetAnnotation.label || null,
        changeDescription: changeDescription || null,
        createdAt: new Date(),
      };

      return {
        ...prev,
        versions: [...prev.versions, newVersion],
        currentVersion: newVersion.version,
      };
    });
  }, [userId]);

  const restoreVersion = useCallback((version: AnnotationVersion) => {
    setState(prev => {
      const existingAnnotation = prev.annotations.find(a => a.id === version.annotationId);
      const previousVersion = prev.versions.find(v => v.annotationId === version.annotationId && v.version === version.version - 1);
      
      let coordinatesToRestore = version.coordinates;
      
      if (previousVersion && existingAnnotation) {
        const prevCoords = previousVersion.coordinates as any;
        const currCoords = version.coordinates as any;
        
        if (version.type === "rectangle") {
          coordinatesToRestore = {
            x: currCoords.x !== prevCoords.x ? currCoords.x : (existingAnnotation.coordinates as any).x,
            y: currCoords.y !== prevCoords.y ? currCoords.y : (existingAnnotation.coordinates as any).y,
            width: currCoords.width !== prevCoords.width ? currCoords.width : (existingAnnotation.coordinates as any).width,
            height: currCoords.height !== prevCoords.height ? currCoords.height : (existingAnnotation.coordinates as any).height,
          };
        } else if (version.type === "circle") {
          coordinatesToRestore = {
            x: currCoords.x !== prevCoords.x ? currCoords.x : (existingAnnotation.coordinates as any).x,
            y: currCoords.y !== prevCoords.y ? currCoords.y : (existingAnnotation.coordinates as any).y,
            radius: currCoords.radius !== prevCoords.radius ? currCoords.radius : (existingAnnotation.coordinates as any).radius,
          };
        }
      }

      const restoredAnnotation: Annotation = {
        id: version.annotationId,
        caseId,
        userId: version.userId,
        type: version.type,
        coordinates: coordinatesToRestore,
        color: version.color,
        label: version.label,
        version: version.version,
        createdAt: version.createdAt,
        updatedAt: new Date(),
      };

      return {
        ...prev,
        annotations: [...prev.annotations.filter(a => a.id !== version.annotationId), restoredAnnotation],
        currentVersion: version.version,
        versionOverlay: null,
      };
    });
  }, [caseId]);

  const previewVersion = useCallback((version: AnnotationVersion) => {
    const previewAnnotation: Annotation = {
      id: version.annotationId,
      caseId,
      userId: version.userId,
      type: version.type,
      coordinates: version.coordinates,
      color: version.color,
      label: version.label,
      version: version.version,
      createdAt: version.createdAt,
      updatedAt: new Date(),
    };

    setState(prev => ({
      ...prev,
      versionOverlay: previewAnnotation,
    }));
  }, [caseId]);

  const clearVersionOverlay = useCallback(() => {
    setState(prev => ({ ...prev, versionOverlay: null }));
  }, []);

  const addPeerAnnotations = useCallback((peerId: string, annotations: Annotation[], color: string) => {
    setState(prev => {
      const newPeerAnnotations = new Map(prev.peerAnnotations);
      newPeerAnnotations.set(peerId, { annotations, color, visible: false });
      return { ...prev, peerAnnotations: newPeerAnnotations };
    });
  }, []);

  const togglePeerAnnotations = useCallback((peerId: string) => {
    setState(prev => {
      const newPeerAnnotations = new Map(prev.peerAnnotations);
      const existing = newPeerAnnotations.get(peerId);
      if (existing) {
        newPeerAnnotations.set(peerId, { ...existing, visible: !existing.visible });
      }
      return { ...prev, peerAnnotations: newPeerAnnotations };
    });
  }, []);

  const deleteVersion = useCallback((versionId: string) => {
    setState(prev => {
      const versionIndex = prev.versions.findIndex(v => v.id === versionId);
      if (versionIndex === -1) return prev;

      const newVersions = prev.versions.filter(v => v.id !== versionId);
      
      const renumberedVersions = newVersions.map((v, index) => ({
        ...v,
        version: index + 1,
      }));

      return {
        ...prev,
        versions: renumberedVersions,
        currentVersion: renumberedVersions.length > 0 ? renumberedVersions[renumberedVersions.length - 1].version : 1,
      };
    });
  }, []);

  const deleteSelectedAnnotations = useCallback(() => {
    if (state.selectedAnnotationIds.length === 0) return;

    setState(prev => {
      const newAnnotations = prev.annotations.filter(a => !prev.selectedAnnotationIds.includes(a.id));
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(newAnnotations);

      return {
        ...prev,
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        selectedAnnotationIds: [],
      };
    });
  }, [state.selectedAnnotationIds]);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setState(prev => {
      const updatedAnnotations = prev.annotations.map(ann =>
        ann.id === id ? { ...ann, ...updates } : ann
      );
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(updatedAnnotations);

      return {
        ...prev,
        annotations: updatedAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }, []);

  const lockAnnotations = useCallback((ids: string[], locked: boolean) => {
    setState(prev => ({
      ...prev,
      annotations: prev.annotations.map(ann =>
        ids.includes(ann.id) ? { ...ann, locked } as any : ann
      ),
    }));
  }, []);

  const copySelectedAnnotations = useCallback(() => {
    if (state.selectedAnnotationIds.length === 0) return;

    setState(prev => ({
      ...prev,
      clipboard: prev.annotations.filter(a => prev.selectedAnnotationIds.includes(a.id)),
    }));
  }, [state.selectedAnnotationIds]);

  const pasteAnnotations = useCallback(() => {
    if (state.clipboard.length === 0) return;

    setState(prev => {
      const newAnnotations = state.clipboard.map(ann => ({
        ...ann,
        id: Math.random().toString(36).substr(2, 9),
        coordinates: (() => {
          const coords = ann.coordinates as any;
          if (ann.type === "rectangle" || ann.type === "circle" || ann.type === "text") {
            return { ...coords, x: coords.x + 20, y: coords.y + 20 };
          } else if (ann.type === "polygon" || ann.type === "freehand") {
            return {
              points: coords.points.map((p: any) => ({ x: p.x + 20, y: p.y + 20 })),
            };
          }
          return coords;
        })(),
      }));

      const combinedAnnotations = [...prev.annotations, ...newAnnotations];
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(combinedAnnotations);

      return {
        ...prev,
        annotations: combinedAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        selectedAnnotationIds: newAnnotations.map(a => a.id),
      };
    });
  }, [state.clipboard]);

  const duplicateAnnotations = useCallback((ids: string[]) => {
    setState(prev => {
      const annotationsToDuplicate = prev.annotations.filter(a => ids.includes(a.id));
      const duplicated = annotationsToDuplicate.map(ann => ({
        ...ann,
        id: Math.random().toString(36).substr(2, 9),
        coordinates: (() => {
          const coords = ann.coordinates as any;
          if (ann.type === "rectangle" || ann.type === "circle" || ann.type === "text") {
            return { ...coords, x: coords.x + 20, y: coords.y + 20 };
          } else if (ann.type === "polygon" || ann.type === "freehand") {
            return {
              points: coords.points.map((p: any) => ({ x: p.x + 20, y: p.y + 20 })),
            };
          }
          return coords;
        })(),
      }));

      const combinedAnnotations = [...prev.annotations, ...duplicated];
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(combinedAnnotations);

      return {
        ...prev,
        annotations: combinedAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }, []);

  const completeTextInput = useCallback((text: string) => {
    if (!state.textInputPosition) return;

    const coords = state.textInputPosition;
    const newAnnotation: Annotation = {
      id: Math.random().toString(36).substr(2, 9),
      caseId,
      userId: userId || "1",
      type: "text",
      coordinates: { 
        x: coords.x, 
        y: coords.y, 
        width: coords.width || 200,
        height: coords.height || 40,
        text 
      },
      color: state.color,
      createdAt: new Date(),
    } as Annotation;

    setState(prev => {
      const newAnnotations = [...prev.annotations, newAnnotation];
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(newAnnotations);

      return {
        ...prev,
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        textInputPosition: null,
        currentAnnotation: null,
      };
    });
  }, [state.textInputPosition, state.color, caseId, userId]);

  const cancelTextInput = useCallback(() => {
    setState(prev => ({ ...prev, textInputPosition: null, currentAnnotation: null }));
  }, []);

  const setImageBounds = useCallback((bounds: { width: number; height: number }) => {
    setState(prev => ({ ...prev, imageBounds: bounds }));
  }, []);

  return {
    tool: state.tool,
    color: state.color,
    isDrawing: state.isDrawing,
    annotations: state.annotations,
    currentAnnotation: state.currentAnnotation,
    versions: state.versions,
    currentVersion: state.currentVersion,
    versionOverlay: state.versionOverlay,
    peerAnnotations: state.peerAnnotations,
    selectedAnnotationIds: state.selectedAnnotationIds,
    textInputPosition: state.textInputPosition,
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
    saveVersion,
    restoreVersion,
    previewVersion,
    clearVersionOverlay,
    addPeerAnnotations,
    togglePeerAnnotations,
    deleteVersion,
    deleteSelectedAnnotations,
    updateAnnotation,
    lockAnnotations,
    copySelectedAnnotations,
    pasteAnnotations,
    duplicateAnnotations,
    completeTextInput,
    cancelTextInput,
    setImageBounds,
  };
}
