import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Copy,
  Trash2,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAnnotation } from "@/hooks/use-annotation";

export default function AnnotationInspector({
  annotation,
  className,
}: {
  annotation: ReturnType<typeof useAnnotation>;
  className?: string;
}) {
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = annotation.annotations ?? [];
    if (!query) return list;
    return list.filter((a) => {
      const label = (a.label ?? "").toLowerCase();
      const type = (a.type ?? "").toLowerCase();
      return label.includes(query) || type.includes(query) || a.id.toLowerCase().includes(query);
    });
  }, [annotation.annotations, q]);

  const selectedSet = useMemo(() => new Set(annotation.selectedAnnotationIds ?? []), [annotation.selectedAnnotationIds]);

  const toggleVisible = (id: string, currentVisible?: boolean) => {
    annotation.toggleAnnotationsVisibility([id], !(currentVisible ?? true));
  };

  const toggleLock = (id: string, currentLocked?: boolean) => {
    annotation.lockAnnotations([id], !(currentLocked ?? false));
  };

  const selectOne = (id: string) => {
    // use internal state update by selecting via click logic:
    // simplest: set selectedAnnotationIds through updateAnnotation? not exposed.
    // workaround: shift-click behavior exists on canvas. Here we mimic single selection by toggling via updateAnnotation? not available.
    // So we "select" by temporarily toggling visibility twice is bad. Instead: rely on canvas click for selection.
    // We'll still provide "focus" meaning scroll user attention.
    // => For now, just show highlight if already selected.
  };

  const duplicateOne = (id: string) => annotation.duplicateAnnotations([id]);

  const deleteOne = (id: string) => {
    // deleteSelectedAnnotations deletes selection only.
    // so we lock in selection by toggling selectedAnnotationIds is not exposed.
    // easiest: duplicate hook supports deleteSelectedAnnotations only.
    // => We'll do: set tool to select and ask user to click on canvas then press delete.
    // But we can still delete via updateAnnotation? not.
    // So instead: we call lockAnnotations? no.
    // To keep UX good: show a "Delete selected" button, and per item show guidance.
    annotation.setTool("select");
    // user can click the item on canvas and press Delete
  };

  const deleteSelected = () => annotation.deleteSelectedAnnotations();

  const bulkHideSelected = () => {
    const ids = annotation.selectedAnnotationIds ?? [];
    if (ids.length === 0) return;
    annotation.toggleAnnotationsVisibility(ids, false);
  };
  const bulkShowSelected = () => {
    const ids = annotation.selectedAnnotationIds ?? [];
    if (ids.length === 0) return;
    annotation.toggleAnnotationsVisibility(ids, true);
  };

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      <div className="p-3 border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold text-sm">Annotations</div>
          <Badge variant="secondary" className="text-xs">
            {annotation.annotations?.length ?? 0}
          </Badge>
        </div>

        <div className="mt-2 relative">
          <Search className="h-4 w-4 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8 h-9"
            placeholder="Search label/type…"
          />
        </div>

        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1" onClick={bulkHideSelected} disabled={(annotation.selectedAnnotationIds?.length ?? 0) === 0}>
            <EyeOff className="h-4 w-4 mr-1" />
            Hide selected
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" onClick={bulkShowSelected} disabled={(annotation.selectedAnnotationIds?.length ?? 0) === 0}>
            <Eye className="h-4 w-4 mr-1" />
            Show selected
          </Button>
        </div>

        <div className="mt-2">
          <Button size="sm" variant="destructive" className="w-full" onClick={deleteSelected} disabled={(annotation.selectedAnnotationIds?.length ?? 0) === 0}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete selected
          </Button>
          <div className="text-[11px] text-muted-foreground mt-1">
            Tip: click shape on canvas to select • Shift+click for multi
          </div>
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto divide-y">
        {items.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">No annotations found.</div>
        ) : (
          items
            .slice()
            .reverse()
            .map((a) => {
              const selected = selectedSet.has(a.id);
              const visible = a.visible !== false;
              const locked = a.locked === true;

              return (
                <div
                  key={a.id}
                  className={cn(
                    "p-3 flex items-start gap-3 hover:bg-muted/30 transition",
                    selected && "bg-muted/40"
                  )}
                  onClick={() => selectOne(a.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">
                        {a.label?.trim() ? a.label : "(no label)"}
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {String(a.type)}
                      </Badge>
                      {selected ? (
                        <Badge variant="secondary" className="text-[10px]">Selected</Badge>
                      ) : null}
                    </div>

                    <div className="text-[11px] text-muted-foreground mt-1 truncate">
                      ID: {a.id.slice(0, 8)} • {visible ? "Visible" : "Hidden"} • {locked ? "Locked" : "Unlocked"}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title={visible ? "Hide" : "Show"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisible(a.id, visible);
                      }}
                    >
                      {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title={locked ? "Unlock" : "Lock"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLock(a.id, locked);
                      }}
                    >
                      {locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title="Duplicate"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateOne(a.id);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title="Delete (select it on canvas then delete selected)"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOne(a.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}