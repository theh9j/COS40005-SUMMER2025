import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, ImagePlus } from "lucide-react";

/** ============ Types ============ */
type SuggestStats = {
  avgScore: number;
  commonMistakes: string[];
  skillGaps: string[];
};

type Upload = { name: string; url: string; type: string; size: number };

// Essay question only
type EssayQuestion = {
  type: "essay";
  prompt: string;
  points: number;
  guidance?: string;
  imageIndex?: number;
};

type PublishPayload = {
  // ✅ NEW: create case in builder (instead of choose existing)
  newCase: {
    title: string;
    description?: string;
    // main image for annotation (student)
    imageFile?: File | null;
    // preview URL for UI
    imagePreviewUrl?: string;
  };

  dueAtISO: string;
  audience: "all" | "group" | "list";
  groupName?: string;
  studentIds?: string[];
  instructions?: string;
  autoChecklist?: string[];
  suggestedFocusTags?: { label: string; highlighted: boolean }[];
  referenceUploads: Upload[]; // optional reference images
  questions: EssayQuestion[];

  requirementId: string;
  className: string;
  year: string;
};

type Props = {
  stats: SuggestStats;
  onPublish: (payload: PublishPayload) => void;
};

export default function HomeworkPrepPanel({ stats, onPublish }: Props) {
  // ====== Create Case fields ======
  const [caseTitle, setCaseTitle] = useState("");
  const [caseDesc, setCaseDesc] = useState("");
  const [caseImageFile, setCaseImageFile] = useState<File | null>(null);
  const [caseImagePreview, setCaseImagePreview] = useState<string>("");

  // ====== meta ======
  const [requirementId, setRequirementId] = useState("");
  const [className, setClassName] = useState("");
  const [year, setYear] = useState("");

  // ====== schedule & audience ======
  const [due, setDue] = useState<string>("");
  const [audience, setAudience] = useState<"all" | "group" | "list">("all");
  const [groupName, setGroupName] = useState("");
  const [studentIds, setStudentIds] = useState("");

  // ====== content ======
  const [instructions, setInstructions] = useState("");

  // right panel: reference uploads (optional)
  const [referenceUploads, setReferenceUploads] = useState<Upload[]>([]);
  const refFileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // essay questions only
  const [questions, setQuestions] = useState<EssayQuestion[]>([]);

  // ====== suggested focus tags ======
  const [homeworkTags, setHomeworkTags] = useState<
    { label: string; highlighted: boolean }[]
  >([]);
  const [newHomeworkTagInput, setNewHomeworkTagInput] = useState("");

  const autoChecklist = useMemo(() => {
    const base = [
      ...stats.commonMistakes.map((x) => `Fix: ${x}`),
      ...stats.skillGaps.map((x) => `Practice: ${x}`),
    ];
    return Array.from(new Set(base)).slice(0, 6);
  }, [stats]);

  // ✅ must have: caseTitle + caseImageFile + due + requirement meta + >=1 question
  const canPublish =
    caseTitle.trim().length > 0 &&
    Boolean(caseImageFile) &&
    Boolean(due) &&
    requirementId.trim().length > 0 &&
    className.trim().length > 0 &&
    year.trim().length > 0 &&
    questions.length > 0;

  const toISO = (d: string) => (d ? new Date(d + "T23:59:00").toISOString() : "");

  /** ============ Case image ============ */
  const onPickCaseImage = (file: File | null) => {
    if (!file) return;
    setCaseImageFile(file);
    const url = URL.createObjectURL(file);
    setCaseImagePreview(url);
  };

  const clearCaseImage = () => {
    setCaseImageFile(null);
    setCaseImagePreview("");
  };

  /** ============ Reference images (optional) ============ */
  const pushRefFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list: Upload[] = Array.from(files).map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
      type: f.type || "application/octet-stream",
      size: f.size,
    }));
    setReferenceUploads((prev) => [...prev, ...list]);
  };

  const removeRefUpload = (idx: number) => {
    setReferenceUploads((prev) => prev.filter((_, i) => i !== idx));
    // shift imageIndex on questions
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.imageIndex == null) return q;
        if (q.imageIndex === idx) return { ...q, imageIndex: undefined };
        if (q.imageIndex > idx) return { ...q, imageIndex: q.imageIndex - 1 };
        return q;
      })
    );
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    pushRefFiles(e.dataTransfer.files);
  };

  /** ============ Questions (essay only) ============ */
  const addEssayQuestion = () => {
    setQuestions((qs) => [
      ...qs,
      { type: "essay", prompt: "", points: 5, guidance: "" },
    ]);
  };

  const updateQuestion = (idx: number, patch: Partial<EssayQuestion>) => {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (idx: number) => {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Homework Builder</h3>
          <div className="text-xs text-muted-foreground">
            Create case + upload image for annotation • Essay questions only
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Class avg: {stats.avgScore}/10</div>
      </div>

      {/* Suggested focus */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="text-xs font-medium text-muted-foreground">Suggested focus</div>
          
          {/* Editable tags */}
          <div className="flex flex-wrap gap-2">
            {/* Add default suggestions if no custom tags set */}
            {homeworkTags.length === 0
              ? autoChecklist.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setHomeworkTags([
                        ...homeworkTags,
                        { label: c, highlighted: true },
                      ]);
                    }}
                    className="px-2.5 py-1 text-xs rounded-full cursor-pointer transition border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  >
                    {c}
                  </div>
                ))
              : homeworkTags.map((tag, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setHomeworkTags((prev) =>
                        prev.map((t, idx) =>
                          idx === i ? { ...t, highlighted: !t.highlighted } : t
                        )
                      );
                    }}
                    className={[
                      "px-2.5 py-1 text-xs rounded-full cursor-pointer transition border",
                      tag.highlighted
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300",
                    ].join(" ")}
                  >
                    {tag.label}
                  </div>
                ))}
          </div>

          {/* Add new tag */}
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="Add focus area…"
              value={newHomeworkTagInput}
              onChange={(e) => setNewHomeworkTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newHomeworkTagInput.trim()) {
                  setHomeworkTags((prev) => [
                    ...prev,
                    { label: newHomeworkTagInput.trim(), highlighted: true },
                  ]);
                  setNewHomeworkTagInput("");
                }
              }}
              className="text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (newHomeworkTagInput.trim()) {
                  setHomeworkTags((prev) => [
                    ...prev,
                    { label: newHomeworkTagInput.trim(), highlighted: true },
                  ]);
                  setNewHomeworkTagInput("");
                }
              }}
            >
              +
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ✅ Create Case (like management, but create) */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <div className="text-sm font-semibold">Create a Case</div>
            <div className="text-xs text-muted-foreground">
              You write case name and upload the image students will annotate.
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-5">
            {/* Left: title/desc */}
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Case title</label>
                <Input
                  placeholder="e.g., Brain MRI – Stroke Case"
                  value={caseTitle}
                  onChange={(e) => setCaseTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Case description (optional)</label>
                <Textarea
                  placeholder="Short description shown in case management/student view…"
                  value={caseDesc}
                  onChange={(e) => setCaseDesc(e.target.value)}
                />
              </div>
            </div>

            {/* Right: square upload - this is the ACTUAL annotation image */}
            <div className="space-y-3">
              <div className="text-sm font-semibold">Annotation image</div>

              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickCaseImage(e.target.files?.[0] ?? null)}
                />

                <div
                  className={[
                    "aspect-square w-full rounded-xl border-2 border-dashed",
                    "flex items-center justify-center text-center cursor-pointer transition",
                    caseImagePreview ? "border-border bg-background" : "border-border hover:bg-muted/50",
                  ].join(" ")}
                >
                  {caseImagePreview ? (
                    <div className="relative w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={caseImagePreview}
                        alt="Case preview"
                        className="w-full h-full object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          clearCaseImage();
                        }}
                        className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
                        title="Remove"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 px-6">
                      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <ImagePlus className="h-6 w-6" />
                      </div>
                      <div className="text-sm font-medium">Click to upload image</div>
                      <div className="text-xs text-muted-foreground">
                        This image will be used in student annotation page.
                      </div>
                    </div>
                  )}
                </div>
              </label>

              <div className="text-xs text-muted-foreground">
                Required. Upload 1 image (PNG/JPG).
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main layout: left settings + questions, right reference images */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        {/* Left */}
        <div className="space-y-5">
          {/* Requirement meta */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-semibold">Requirement Metadata</div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Requirement ID</label>
                  <Input
                    placeholder="e.g., RQ-2025-W3-01"
                    value={requirementId}
                    onChange={(e) => setRequirementId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Class</label>
                  <Input
                    placeholder="e.g., COS40005"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Year</label>
                  <Input
                    placeholder="e.g., 2025"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assign settings */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-semibold">Assign Settings</div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Due date</label>
                  <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Audience</label>
                  <select
                    className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as any)}
                  >
                    <option value="all">All students</option>
                    <option value="group">Group (named)</option>
                    <option value="list">Specific student IDs</option>
                  </select>
                </div>
              </div>

              {audience === "group" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Group name</label>
                  <Input
                    placeholder="e.g., Week8-Remedial"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
              )}

              {audience === "list" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Student IDs (comma separated)</label>
                  <Input
                    placeholder="david.tran, emma.wilson"
                    value={studentIds}
                    onChange={(e) => setStudentIds(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Essay questions */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Essay Questions</div>
                  <div className="text-xs text-muted-foreground">
                    Students write their own answers (no MCQ)
                  </div>
                </div>
                <Button size="sm" onClick={addEssayQuestion}>
                  + Add question
                </Button>
              </div>

              {questions.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No questions yet. Add one to start.
                </div>
              )}

              {questions.map((q, qi) => (
                <Card key={qi} className="border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Essay #{qi + 1}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeQuestion(qi)}>
                        Remove
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium">Prompt</label>
                      <Textarea
                        value={q.prompt}
                        onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
                        placeholder="Write the essay question…"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium">Points</label>
                        <Input
                          type="number"
                          value={q.points}
                          onChange={(e) =>
                            updateQuestion(qi, { points: Math.max(0, Number(e.target.value)) })
                          }
                        />
                      </div>

                      {referenceUploads.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium">
                            Attach reference image (optional)
                          </label>
                          <select
                            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                            value={(q.imageIndex ?? "").toString()}
                            onChange={(e) =>
                              updateQuestion(qi, {
                                imageIndex:
                                  e.target.value === "" ? undefined : Number(e.target.value),
                              })
                            }
                          >
                            <option value="">— None —</option>
                            {referenceUploads.map((u, i) => (
                              <option key={i} value={i.toString()}>
                                {i + 1}. {u.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium">Guidance (optional)</label>
                      <Input
                        value={q.guidance ?? ""}
                        onChange={(e) => updateQuestion(qi, { guidance: e.target.value })}
                        placeholder="What should students focus on?"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* General instructions */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <label className="text-sm font-semibold">General instructions (optional)</label>
              <Textarea
                placeholder="Short guidance for the assignment…"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Publish */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {canPublish
                ? "Ready to publish."
                : "Need: Case title + annotation image + due + requirement meta + 1 essay question."}
            </div>

            <Button
              disabled={!canPublish}
              onClick={() =>
                onPublish({
                  newCase: {
                    title: caseTitle.trim(),
                    description: caseDesc.trim() || undefined,
                    imageFile: caseImageFile,
                    imagePreviewUrl: caseImagePreview || undefined,
                  },
                  dueAtISO: toISO(due),
                  audience,
                  groupName: audience === "group" ? groupName || undefined : undefined,
                  studentIds:
                    audience === "list"
                      ? studentIds.split(",").map((s) => s.trim()).filter(Boolean)
                      : undefined,
                  instructions: instructions || undefined,
                  autoChecklist,
                  suggestedFocusTags: homeworkTags.length > 0 ? homeworkTags : undefined,
                  referenceUploads,
                  questions,
                  requirementId: requirementId.trim(),
                  className: className.trim(),
                  year: year.trim(),
                })
              }
            >
              Publish homework
            </Button>
          </div>
        </div>

        {/* Right: reference images (optional) */}
        <div className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Reference images</div>
                  <div className="text-xs text-muted-foreground">Optional • drag & drop</div>
                </div>

                <input
                  ref={refFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => pushRefFiles(e.target.files)}
                />
              </div>

              <div
                onClick={() => refFileInputRef.current?.click()}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                }}
                onDrop={onDrop}
                className={[
                  "aspect-square w-full rounded-xl border-2 border-dashed",
                  "flex items-center justify-center text-center cursor-pointer transition",
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                ].join(" ")}
              >
                <div className="space-y-2 px-6">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                  <div className="text-sm font-medium">Click to upload</div>
                  <div className="text-xs text-muted-foreground">PNG/JPG • Multiple allowed</div>
                </div>
              </div>

              {referenceUploads.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Uploaded ({referenceUploads.length})
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {referenceUploads.slice(0, 6).map((u, i) => (
                      <div
                        key={i}
                        className="relative group overflow-hidden rounded-lg border border-border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u.url} alt={u.name} className="h-28 w-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRefUpload(i);
                          }}
                          className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center bg-black/60 rounded-full p-1"
                          title="Remove"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                        <div className="px-2 py-1 text-[11px] truncate">{u.name}</div>
                      </div>
                    ))}
                  </div>
                  {referenceUploads.length > 6 && (
                    <div className="text-xs text-muted-foreground">
                      + {referenceUploads.length - 6} more…
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground">
            Note: “Annotation image” (ở trên) là ảnh chính để student vẽ. “Reference images” chỉ là
            ảnh phụ gắn vào câu hỏi.
          </div>
        </div>
      </div>
    </div>
  );
}
