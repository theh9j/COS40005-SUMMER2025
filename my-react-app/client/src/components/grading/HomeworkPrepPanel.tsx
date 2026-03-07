import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ImagePlus, Plus, X } from "lucide-react";

type SuggestStats = {
  avgScore: number;
  commonMistakes: string[];
  skillGaps: string[];
};

type Upload = { name: string; url: string; type: string; size: number };

type ExistingClass = {
  id: string;
  name: string;
  year: string;
  display: string;
};

type EssayQuestion = {
  type: "essay";
  prompt: string;
  points: number;
  guidance?: string;
  imageIndex?: number;
};

type McqQuestion = {
  type: "mcq";
  prompt: string;
  points: number;
  guidance?: string;
  options: string[];
  correctIndex?: number;
  imageIndex?: number;
};

type HomeworkQuestion = EssayQuestion | McqQuestion;

type PublishPayload = {
  newCase: {
    title: string;
    description?: string;
    type?: string;
    imageFile?: File | null;
    imagePreviewUrl?: string;
  };
  dueAtISO: string;
  audience: "all" | "group" | "list";
  groupName?: string;
  studentIds?: string[];
  instructions?: string;
  autoChecklist?: string[];
  suggestedFocusTags?: { label: string; highlighted: boolean }[];
  homeworkType?: "Q&A" | "Annotate";
  referenceUploads: Upload[];
  questions: HomeworkQuestion[];
  password: string;
  className: string;
  year: string;
};

type Props = {
  stats: SuggestStats;
  existingClasses?: ExistingClass[];
  onPublish: (payload: PublishPayload) => void;
};

type FieldErrors = Partial<Record<string, string>>;

function formatClassOption(cls: ExistingClass) {
  return cls.display || `${cls.name} (${cls.year})`;
}

export default function HomeworkPrepPanel({ stats, existingClasses = [], onPublish }: Props) {
  const [caseTitle, setCaseTitle] = useState("");
  const [caseDesc, setCaseDesc] = useState("");
  const [caseType, setCaseType] = useState<string>("Cardiology");
  const [caseImageFile, setCaseImageFile] = useState<File | null>(null);
  const [caseImagePreview, setCaseImagePreview] = useState<string>("");

  const [password, setPassword] = useState("");
  const [className, setClassName] = useState("");
  const [year, setYear] = useState("");
  const [classQuery, setClassQuery] = useState("");

  const [due, setDue] = useState<string>("");
  const [audience, setAudience] = useState<"all" | "group" | "list">("all");
  const [groupName, setGroupName] = useState("");
  const [studentIds, setStudentIds] = useState("");

  const [instructions, setInstructions] = useState("");
  const [referenceUploads, setReferenceUploads] = useState<Upload[]>([]);
  const refFileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [questions, setQuestions] = useState<HomeworkQuestion[]>([]);
  const [homeworkType, setHomeworkType] = useState<"Q&A" | "Annotate">("Annotate");

  const [homeworkTags, setHomeworkTags] = useState<{ label: string; highlighted: boolean }[]>([]);
  const [newHomeworkTagInput, setNewHomeworkTagInput] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const autoChecklist = useMemo(() => {
    const base = [
      ...stats.commonMistakes.map((x) => `Fix: ${x}`),
      ...stats.skillGaps.map((x) => `Practice: ${x}`),
    ];
    return Array.from(new Set(base)).slice(0, 6);
  }, [stats]);

  const classOptions = useMemo(() => {
    return [...existingClasses].sort((a, b) => formatClassOption(a).localeCompare(formatClassOption(b)));
  }, [existingClasses]);

  const visibleClassOptions = useMemo(() => {
    const q = classQuery.trim().toLowerCase();
    if (!q) return classOptions;
    return classOptions.filter((cls) => {
      const hay = `${cls.name} ${cls.year} ${formatClassOption(cls)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [classOptions, classQuery]);

  const validate = () => {
    const next: FieldErrors = {};
    if (!caseTitle.trim()) next.caseTitle = "Case title is required.";
    if (!caseImageFile) next.caseImage = "Annotation image is required.";
    if (!due) next.due = "Due date is required.";
    if (!password.trim()) next.password = "Homework password is required.";
    if (!className.trim()) next.className = "Class is required.";
    if (!year.trim()) next.year = "Class year is required.";
    if (questions.length === 0) next.questions = "Add at least one question.";

    questions.forEach((q, index) => {
      if (!q.prompt.trim()) next[`q-${index}`] = `Question ${index + 1} needs a prompt.`;
      if (q.type === "mcq") {
        const cleanOptions = q.options.map((o) => o.trim()).filter(Boolean);
        if (cleanOptions.length < 2) next[`q-${index}-options`] = `MCQ ${index + 1} needs at least 2 options.`;
        if (q.options.length > 5) next[`q-${index}-options`] = `MCQ ${index + 1} can have maximum 5 options.`;
      }
    });

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const canPublish =
    caseTitle.trim().length > 0 &&
    Boolean(caseImageFile) &&
    Boolean(due) &&
    password.trim().length > 0 &&
    className.trim().length > 0 &&
    year.trim().length > 0 &&
    questions.length > 0;

  const toISO = (d: string) => (d ? new Date(`${d}T23:59:00`).toISOString() : "");

  const onPickCaseImage = (file: File | null) => {
    if (!file) return;
    setCaseImageFile(file);
    setCaseImagePreview(URL.createObjectURL(file));
  };

  const clearCaseImage = () => {
    setCaseImageFile(null);
    setCaseImagePreview("");
  };

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

  const addEssayQuestion = () => {
    setQuestions((qs) => [...qs, { type: "essay", prompt: "", points: 5, guidance: "" }]);
  };

  const addMcqQuestion = () => {
    setQuestions((qs) => [
      ...qs,
      { type: "mcq", prompt: "", points: 5, guidance: "", options: ["", ""], correctIndex: undefined },
    ]);
  };

  const updateQuestion = (idx: number, patch: Partial<HomeworkQuestion>) => {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? ({ ...q, ...patch } as HomeworkQuestion) : q)));
  };

  const updateMcqOption = (qIndex: number, optionIndex: number, value: string) => {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIndex || q.type !== "mcq") return q;
        const options = [...q.options];
        options[optionIndex] = value;
        return { ...q, options };
      })
    );
  };

  const addMcqOption = (qIndex: number) => {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIndex || q.type !== "mcq" || q.options.length >= 5) return q;
        return { ...q, options: [...q.options, ""] };
      })
    );
  };

  const removeMcqOption = (qIndex: number, optionIndex: number) => {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIndex || q.type !== "mcq" || q.options.length <= 2) return q;
        const options = q.options.filter((_, idx) => idx !== optionIndex);
        const correctIndex =
          q.correctIndex == null
            ? undefined
            : q.correctIndex === optionIndex
              ? undefined
              : q.correctIndex > optionIndex
                ? q.correctIndex - 1
                : q.correctIndex;
        return { ...q, options, correctIndex };
      })
    );
  };

  const removeQuestion = (idx: number) => {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  };

  const applyClassSelection = (value: string) => {
    setClassQuery(value);
    const matched = classOptions.find((cls) => formatClassOption(cls) === value);
    if (matched) {
      setClassName(matched.name);
      setYear(matched.year);
      setErrors((prev) => ({ ...prev, className: undefined, year: undefined }));
      return;
    }

    setClassName(value.trim());
    setYear("");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Homework Builder</h3>
          <div className="text-xs text-muted-foreground">
            Create case + homework metadata + essay / MCQ questions
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Class avg: {stats.avgScore}/10</div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="text-xs font-medium text-muted-foreground">Suggested focus</div>
          <div className="flex flex-wrap gap-2">
            {homeworkTags.length === 0
              ? autoChecklist.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => setHomeworkTags([...homeworkTags, { label: c, highlighted: true }])}
                    className="px-2.5 py-1 text-xs rounded-full cursor-pointer transition border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  >
                    {c}
                  </div>
                ))
              : homeworkTags.map((tag, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setHomeworkTags((prev) => prev.map((t, idx) => (idx === i ? { ...t, highlighted: !t.highlighted } : t)));
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

          <div className="flex gap-2 pt-2">
            <Input
              placeholder="Add focus area…"
              value={newHomeworkTagInput}
              onChange={(e) => setNewHomeworkTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newHomeworkTagInput.trim()) {
                  setHomeworkTags((prev) => [...prev, { label: newHomeworkTagInput.trim(), highlighted: true }]);
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
                  setHomeworkTags((prev) => [...prev, { label: newHomeworkTagInput.trim(), highlighted: true }]);
                  setNewHomeworkTagInput("");
                }
              }}
            >
              +
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <div className="text-sm font-semibold">Create a Case</div>
            <div className="text-xs text-muted-foreground">You write case name and upload the image students will annotate.</div>
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-5">
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Case title</label>
                <Input placeholder="e.g., Brain MRI – Stroke Case" value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} />
                {errors.caseTitle && <p className="mt-1 text-xs text-red-600">{errors.caseTitle}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Case description (optional)</label>
                <Textarea placeholder="Short description shown in case management/student view…" value={caseDesc} onChange={(e) => setCaseDesc(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Case Type (Specialty)</label>
                <select className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm" value={caseType} onChange={(e) => setCaseType(e.target.value)}>
                  <option value="Neurology">Neurology</option>
                  <option value="Pulmonology">Pulmonology</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Gastroenterology">Gastroenterology</option>
                  <option value="Oncology">Oncology</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Orthopedics">Orthopedics</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold">Annotation image</div>

              <label className="block">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickCaseImage(e.target.files?.[0] ?? null)} />
                <div className={[
                  "aspect-square w-full rounded-xl border-2 border-dashed",
                  "flex items-center justify-center text-center cursor-pointer transition",
                  caseImagePreview ? "border-border bg-background" : "border-border hover:bg-muted/50",
                ].join(" ") }>
                  {caseImagePreview ? (
                    <div className="relative w-full h-full">
                      <img src={caseImagePreview} alt="Case preview" className="w-full h-full object-cover rounded-xl" />
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
                      <div className="text-xs text-muted-foreground">This image will be used in student annotation page.</div>
                    </div>
                  )}
                </div>
              </label>

              <div className="text-xs text-muted-foreground">Required. Upload 1 image (PNG/JPG).</div>
              {errors.caseImage && <p className="mt-1 text-xs text-red-600">{errors.caseImage}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        <div className="space-y-5">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-semibold">Requirement Metadata</div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Homework Password</label>
                  <Input placeholder="e.g., secure-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Class</label>
                  <Input
                    list="homework-class-options"
                    placeholder="Search or choose existing class"
                    value={classQuery}
                    onChange={(e) => applyClassSelection(e.target.value)}
                  />
                  <datalist id="homework-class-options">
                    {visibleClassOptions.map((cls) => (
                      <option key={cls.id} value={formatClassOption(cls)} />
                    ))}
                  </datalist>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {className && year ? <Badge variant="secondary">{className} ({year})</Badge> : <span>Selecting a class will auto-fill the year.</span>}
                  </div>
                  {errors.className && <p className="mt-1 text-xs text-red-600">{errors.className}</p>}
                  {errors.year && <p className="mt-1 text-xs text-red-600">{errors.year}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-semibold">Assign Settings</div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Homework Type</label>
                  <select className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm" value={homeworkType} onChange={(e) => setHomeworkType(e.target.value as "Q&A" | "Annotate")}>
                    <option value="Annotate">Annotate</option>
                    <option value="Q&A">Q&A</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Due date</label>
                  <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                  {errors.due && <p className="mt-1 text-xs text-red-600">{errors.due}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Audience</label>
                  <select className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm" value={audience} onChange={(e) => setAudience(e.target.value as "all" | "group" | "list")}>
                    <option value="all">All students</option>
                    <option value="group">Group (named)</option>
                    <option value="list">Specific student IDs</option>
                  </select>
                </div>
              </div>

              {audience === "group" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Group name</label>
                  <Input placeholder="e.g., Week8-Remedial" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                </div>
              )}

              {audience === "list" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Student IDs (comma separated)</label>
                  <Input placeholder="david.tran, emma.wilson" value={studentIds} onChange={(e) => setStudentIds(e.target.value)} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Questions</div>
                  <div className="text-xs text-muted-foreground">Support both Essay and MCQ. MCQ can have up to 5 options.</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={addEssayQuestion}>Add Essay</Button>
                  <Button size="sm" onClick={addMcqQuestion}>Add MCQ</Button>
                </div>
              </div>

              {questions.length === 0 && <div className="text-sm text-muted-foreground">No questions yet. Add one to start.</div>}
              {errors.questions && <p className="mt-1 text-xs text-red-600">{errors.questions}</p>}

              <div className="space-y-4">
                {questions.map((q, qi) => (
                  <Card key={qi} className="border border-border/70">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-medium">Question {qi + 1}</div>
                          <Badge variant={q.type === "mcq" ? "secondary" : "outline"}>{q.type === "mcq" ? "MCQ" : "Essay"}</Badge>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeQuestion(qi)}>Remove</Button>
                      </div>

                      <div className="grid md:grid-cols-[1fr_110px] gap-3">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium">Prompt</label>
                          <Textarea value={q.prompt} onChange={(e) => updateQuestion(qi, { prompt: e.target.value })} placeholder="Write the question here…" />
                          {errors[`q-${qi}`] && <p className="text-xs text-red-600">{errors[`q-${qi}`]}</p>}
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-medium">Points</label>
                          <Input type="number" min={0} value={q.points} onChange={(e) => updateQuestion(qi, { points: Math.max(0, Number(e.target.value)) })} />
                        </div>
                      </div>

                      {referenceUploads.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium">Attach reference image (optional)</label>
                          <select className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm" value={(q.imageIndex ?? "").toString()} onChange={(e) => updateQuestion(qi, { imageIndex: e.target.value === "" ? undefined : Number(e.target.value) })}>
                            <option value="">— None —</option>
                            {referenceUploads.map((u, i) => (
                              <option key={i} value={i.toString()}>{i + 1}. {u.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="block text-xs font-medium">Guidance (optional)</label>
                        <Input value={q.guidance ?? ""} onChange={(e) => updateQuestion(qi, { guidance: e.target.value })} placeholder="What should students focus on?" />
                      </div>

                      {q.type === "mcq" && (
                        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium">Options</div>
                            <Button size="sm" variant="outline" disabled={q.options.length >= 5} onClick={() => addMcqOption(qi)}>
                              <Plus className="mr-1 h-4 w-4" /> Add option
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {q.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateQuestion(qi, { correctIndex: q.correctIndex === optionIndex ? undefined : optionIndex })}
                                  className="shrink-0 text-muted-foreground hover:text-foreground"
                                  title="Mark as correct"
                                >
                                  {q.correctIndex === optionIndex ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                </button>
                                <Input value={option} onChange={(e) => updateMcqOption(qi, optionIndex, e.target.value)} placeholder={`Option ${optionIndex + 1}`} />
                                <Button type="button" size="icon" variant="ghost" disabled={q.options.length <= 2} onClick={() => removeMcqOption(qi, optionIndex)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground">Choose the correct option by clicking the circle. Max 5 options.</div>
                          {errors[`q-${qi}-options`] && <p className="text-xs text-red-600">{errors[`q-${qi}-options`]}</p>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <label className="text-sm font-semibold">General instructions (optional)</label>
              <Textarea placeholder="Short guidance for the assignment…" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {canPublish ? "Ready to publish." : "Need: case title + annotation image + due date + metadata + at least 1 question."}
            </div>

            <Button
              disabled={!canPublish}
              onClick={() => {
                if (!validate()) return;
                onPublish({
                  newCase: {
                    title: caseTitle.trim(),
                    description: caseDesc.trim() || undefined,
                    type: caseType,
                    imageFile: caseImageFile,
                    imagePreviewUrl: caseImagePreview || undefined,
                  },
                  dueAtISO: toISO(due),
                  audience,
                  groupName: audience === "group" ? groupName || undefined : undefined,
                  studentIds: audience === "list" ? studentIds.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
                  instructions: instructions || undefined,
                  autoChecklist: homeworkTags.map((tag) => tag.label),
                  suggestedFocusTags: homeworkTags.length > 0 ? homeworkTags : undefined,
                  homeworkType,
                  referenceUploads,
                  questions,
                  password: password.trim(),
                  className: className.trim(),
                  year: year.trim(),
                });
              }}
            >
              Publish homework
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Reference images</div>
                  <div className="text-xs text-muted-foreground">Optional • drag & drop</div>
                </div>

                <input ref={refFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => pushRefFiles(e.target.files)} />
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
                  <div className="text-xs font-medium text-muted-foreground">Uploaded ({referenceUploads.length})</div>
                  <div className="grid grid-cols-2 gap-3">
                    {referenceUploads.slice(0, 6).map((u, i) => (
                      <div key={i} className="relative group overflow-hidden rounded-lg border border-border">
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
                  {referenceUploads.length > 6 && <div className="text-xs text-muted-foreground">+ {referenceUploads.length - 6} more…</div>}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground">
            Note: “Annotation image” is the main image for student annotation. “Reference images” are optional supporting images attached to questions.
          </div>
        </div>
      </div>
    </div>
  );
}
