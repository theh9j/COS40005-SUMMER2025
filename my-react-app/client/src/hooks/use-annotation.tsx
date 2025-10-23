import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export type AnnotationTool =
  | "select"
  | "rectangle"
  | "circle"
  | "freehand"
  | "text"
  | "polygon"
  | null;

interface Annotation {
  id: string;
  caseId: string;
  userId: string;
  type: string;
  coordinates: any;
  color?: string;
  label?: string;
  locked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface PeerAnnotation {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  annotations: Annotation[];
  color: string;
}

interface UseAnnotationState {
  annotations: Annotation[];
  selectedAnnotationIds: string[];
  history: Annotation[][];
  historyIndex: number;
  isDrawing: boolean;
  drawType: string | null;
  strokeColor: string;
  peerAnnotations: PeerAnnotation[]; 
  isLocked: boolean;
  versions: any[];         
  versionsLoading: boolean;
}

const API_BASE = "http://127.0.0.1:8000/api/annotations";
const WS_BASE = "ws://127.0.0.1:8000/ws/annotations";

export function useAnnotation(caseId: string, userId: string) {
  const [state, setState] = useState<UseAnnotationState>({
    annotations: [],
    selectedAnnotationIds: [],
    history: [[]],
    historyIndex: 0,
    isDrawing: false,
    drawType: null,
    strokeColor: "#ff0000",  // your color state
    peerAnnotations: [],
    isLocked: false,
    versions: [],            // ✅ new
    versionsLoading: false, 
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // --- Load annotations once on mount
  useEffect(() => {
    loadVersions();
    if (!caseId) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/${caseId}`);
        if (!res.ok) throw new Error("Failed to load annotations");
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          annotations: data,
          history: [data],
          historyIndex: 0,
        }));
      } catch (err) {
        console.error("Load annotations error:", err);
      }
    })();
  }, [caseId]);

  // --- Connect WebSocket
  useEffect(() => {
    if (!caseId || !userId) return;
    const ws = new WebSocket(`${WS_BASE}/${caseId}?userId=${userId}`);
    wsRef.current = ws;

    ws.onopen = () => console.log(`[WS] Connected to case ${caseId}`);
    ws.onclose = () => console.log("[WS] Closed connection");
    ws.onerror = (e) => console.error("[WS] Error", e);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleIncomingMessage(msg);
      } catch (e) {
        console.error("WS parse error:", e);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [caseId, userId]);

  function setTool(tool: AnnotationTool) {
    setState((prev) => ({ ...prev, drawType: tool }));
  }

  function setColor(newColor: string) {
    setState((prev) => ({ ...prev, strokeColor: newColor }));
  }

  // --- Handle messages from WS
  function handleIncomingMessage(msg: any) {
    if (!msg) return;

    if (msg.type === "add" && msg.annotation) {
      setState((prev) => {
        if (prev.annotations.some((a) => a.id === msg.annotation.id)) return prev;
        const ann = [...prev.annotations, msg.annotation];
        const hist = prev.history.slice(0, prev.historyIndex + 1);
        hist.push(ann);
        return { ...prev, annotations: ann, history: hist, historyIndex: hist.length - 1 };
      });
    } else if (msg.type === "update" && msg.annotation) {
      setState((prev) => ({
        ...prev,
        annotations: prev.annotations.map((a) =>
          a.id === msg.annotation.id ? msg.annotation : a
        ),
      }));
    } else if (msg.type === "delete" && msg.annotationId) {
      setState((prev) => ({
        ...prev,
        annotations: prev.annotations.filter((a) => a.id !== msg.annotationId),
      }));
    } else if (msg.type === "presence") {
      console.log(`[Presence] ${msg.userId} ${msg.action}`);
    }
  }

  // --- Drawing start
  function startDrawing(type: string) {
    setState((prev) => ({ ...prev, isDrawing: true, drawType: type }));
  }

  function updateDrawing(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!state.isDrawing || !state.drawType) return;

    const rect = (canvasRef.current as HTMLCanvasElement)?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setState((prev) => {
      const annotations = [...prev.annotations];
      const current = annotations[annotations.length - 1];

      if (!current) return prev;

      const updated = { ...current };

      if (updated.type === "rectangle") {
        const start = updated.coordinates.start || { x, y };
        updated.coordinates = {
          ...updated.coordinates,
          x: start.x,
          y: start.y,
          width: x - start.x,
          height: y - start.y,
        };
      } else if (updated.type === "circle") {
        const start = updated.coordinates.start || { x, y };
        const dx = x - start.x;
        const dy = y - start.y;
        updated.coordinates = {
          ...updated.coordinates,
          x: start.x,
          y: start.y,
          radius: Math.sqrt(dx * dx + dy * dy),
        };
      } else if (updated.type === "freehand") {
        const points = updated.coordinates.points || [];
        updated.coordinates = { ...updated.coordinates, points: [...points, { x, y }] };
      }

      annotations[annotations.length - 1] = updated;
      return { ...prev, annotations };
    });
  }

  // Load
  async function loadVersions() {
    if (!caseId || !userId) return;

    setState((prev) => ({ ...prev, versionsLoading: true }));

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/annotations/versions/${caseId}?userId=${userId}`
      );
      if (!res.ok) throw new Error("Failed to fetch versions");

      const data = await res.json();
      const versionsArray = Array.isArray(data)
        ? data.map((v) => ({
            ...v,
            id: v._id ?? v.id,
            version: v.version ?? 0,
          }))
        : [];

      setState((prev) => ({
        ...prev,
        versions: versionsArray,
        versionsLoading: false,
      }));
    } catch (err) {
      console.error("Error loading versions:", err);
      setState((prev) => ({ ...prev, versions: [], versionsLoading: false }));
    }
  }
  // --- Finish drawing
  async function finishDrawing(coordinates: any) {
    if (!state.drawType || !state.isDrawing) return;

    const newAnnotation: Annotation = {
      id: uuidv4(),
      caseId,
      userId,
      type: state.drawType,
      coordinates,
      color: state.strokeColor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic update
    setState((prev) => {
      const ann = [...prev.annotations, newAnnotation];
      const hist = prev.history.slice(0, prev.historyIndex + 1);
      hist.push(ann);
      return { ...prev, annotations: ann, history: hist, historyIndex: hist.length - 1, isDrawing: false };
    });

    // Persist to backend
    try {
      const res = await fetch(`${API_BASE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAnnotation),
      });
      const saved = await res.json();

      // Replace temp ID with server ID
      setState((prev) => ({
        ...prev,
        annotations: prev.annotations.map((a) =>
          a.id === newAnnotation.id ? saved : a
        ),
      }));

      // Broadcast through WS
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "add", annotation: saved }));
      }
    } catch (err) {
      console.error("Failed to save annotation:", err);
    }
  }

  // --- Select annotation
  function selectAnnotation(id: string) {
    setState((prev) => ({
      ...prev,
      selectedAnnotationIds: prev.selectedAnnotationIds.includes(id)
        ? prev.selectedAnnotationIds.filter((x) => x !== id)
        : [...prev.selectedAnnotationIds, id],
    }));
  }

  // --- Update annotation
  async function updateAnnotation(id: string, updates: Partial<Annotation>) {
    setState((prev) => ({
      ...prev,
      annotations: prev.annotations.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));

    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "update", annotation: updated }));
      }
    } catch (err) {
      console.error("Update annotation failed:", err);
    }
  }

  // --- Delete selected
  async function deleteSelectedAnnotations() {
    const ids = state.selectedAnnotationIds;
    if (ids.length === 0) return;

    setState((prev) => ({
      ...prev,
      annotations: prev.annotations.filter((a) => !ids.includes(a.id)),
      selectedAnnotationIds: [],
    }));

    for (const id of ids) {
      try {
        await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "delete", annotationId: id }));
        }
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  }

  // --- Undo / Redo
  function undo() {
    setState((prev) => {
      if (prev.historyIndex <= 0) return prev;
      const newIndex = prev.historyIndex - 1;
      return {
        ...prev,
        annotations: prev.history[newIndex],
        historyIndex: newIndex,
      };
    });
  }

  function redo() {
    setState((prev) => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;
      const newIndex = prev.historyIndex + 1;
      return {
        ...prev,
        annotations: prev.history[newIndex],
        historyIndex: newIndex,
      };
    });
  }

  // --- Save snapshot
  async function saveAllAnnotationsSnapshot() {
    try {
      const res = await fetch(`${API_BASE}/snapshot/${caseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, annotations: state.annotations }),
      });
      if (!res.ok) throw new Error("Failed to save snapshot");
      const saved = await res.json();
      console.log("Snapshot saved:", saved);
      await loadVersions(); // reload only this user’s versions
    } catch (err) {
      console.error("Snapshot save failed:", err);
    }
  }

  // --- Clear all
  function clearAllAnnotations() {
    setState((prev) => ({
      ...prev,
      annotations: [],
      selectedAnnotationIds: [],
    }));
  }

  return {
    ...state,
    canvasRef,
    tool: state.drawType,      
    color: state.strokeColor, 
    setTool,
    setColor, 
    startDrawing,
    updateDrawing,   
    finishDrawing,
    selectAnnotation,
    updateAnnotation,
    deleteSelectedAnnotations,
    undo,
    redo,
    clearAllAnnotations,
    saveAllAnnotationsSnapshot,
    loadVersions,
    versions: state.versions, 
    versionsLoading: state.versionsLoading,
  };
}
