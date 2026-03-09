import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";

type SuggestStats = {
  avgScore: number;
  commonMistakes: string[];
  skillGaps: string[];
};

type Upload = { name: string; url: string; type: string; size: number };

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
  correctIndex: number | null;
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
  audience: "all" | "classroom";
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

type ClassroomOption = {
  id: string;
  name: string;
  year: string;
  display?: string;
};

type Props = {
  stats: SuggestStats;
  onPublish: (payload: PublishPayload) => void;
  classrooms?: ClassroomOption[];
};

type FieldErrors = Partial<Record<string, string>>;

type BuilderTab = "Q&A" | "Annotate";

export default function HomeworkPrepPanel({ stats, onPublish, classrooms = [] }: Props) {
  const [builderTab, setBuilderTab] = useState<BuilderTab>("Q&A");

  const [caseTitle, setCaseTitle] = useState("");
  const [caseDesc, setCaseDesc] = useState("");
  const [caseType, setCaseType] = useState<string>("Cardiology");
  const [caseImageFile, setCaseImageFile] = useState<File | null>(null);
  const [caseImagePreview, setCaseImagePreview] = useState("");

  const [password, setPassword] = useState("");
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [className, setClassName] = useState("");
  const [year, setYear] = useState("");

  const [due, setDue] = useState("");
  const [audience, setAudience] = useState<"all" | "classroom">("all");
  const [instructions, setInstructions] = useState("");

  const [referenceUploads, setReferenceUploads] = useState<Upload[]>([]);
  const refFileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [questions, setQuestions] = useState<HomeworkQuestion[]>([]);
  const [homeworkTags, setHomeworkTags] = useState<{ label: string; highlighted: boolean }[]>([]);
  const [newHomeworkTagInput, setNewHomeworkTagInput] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const classroomOptions = useMemo(
    () =>
      classrooms.map((c) => ({
        id: c.id,
        name: c.name,
        year: c.year,
        display: c.display || `${c.name} (${c.year})`,
      })),
    [classrooms]
  );

  const autoChecklist = useMemo(() => {
    const base = [
      ...stats.commonMistakes.map((x) => `Fix: ${x}`),
      ...stats.skillGaps.map((x) => `Practice: ${x}`),
    ];
    return Array.from(new Set(base)).slice(0, 6);
  }, [stats]);

  const onSelectClassroom = (classroomId: string) => {
    setSelectedClassroomId(classroomId);
    const selected = classroomOptions.find((c) => c.id === classroomId);
    setClassName(selected?.name || "");
    setYear(selected?.year || "");
  };

  const validate = () => {
    const next: FieldErrors = {};
    if (!caseTitle.trim()) next.caseTitle = "Case title is required.";
    if (builderTab === "Annotate" && !caseImageFile) next.caseImage = "Annotation image is required.";
    if (!due) next.due = "Due date is required.";
    if (audience === "classroom") {
      if (!password.trim()) next.password = "Homework password is required.";
      if (!className.trim()) next.className = "Class is required.";
      if (!year.trim()) next.year = "Year is required.";
    }
    if (builderTab === "Q&A" && questions.length === 0) next.questions = "Add at least one Q&A question.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const canPublish =
    caseTitle.trim().length > 0 &&
    Boolean(due) &&
    (builderTab === "Q&A" ? questions.length > 0 : Boolean(caseImageFile)) &&
    (audience === "all" || (password.trim() && className.trim() && year.trim()));

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

  const addEssayQuestion = () => {
    setQuestions((qs) => [...qs, { type: "essay", prompt: "", points: 5, guidance: "" }]);
  };

  const addMcqQuestion = () => {
    setQuestions((qs) => [
      ...qs,
      { type: "mcq", prompt: "", points: 5, guidance: "", options: ["", ""], correctIndex: null },
    ]);
  };

  const updateQuestion = (idx: number, patch: Partial<HomeworkQuestion>) => {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? ({ ...q, ...patch } as HomeworkQuestion) : q)));
  };

  const updateMcqOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== questionIndex || q.type !== "mcq") return q;
        const options = q.options.map((opt, oi) => (oi === optionIndex ? value : opt));
        return { ...q, options };
      })
    );
  };

  const addMcqOption = (questionIndex: number) => {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== questionIndex || q.type !== "mcq" || q.options.length >= 5) return q;
        return { ...q, options: [...q.options, ""] };
      })
    );
  };

  const removeMcqOption = (questionIndex: number, optionIndex: number) => {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== questionIndex || q.type !== "mcq" || q.options.length <= 2) return q;
        const options = q.options.filter((_, oi) => oi !== optionIndex);
        let correctIndex = q.correctIndex;
        if (correctIndex === optionIndex) correctIndex = null;
        else if (correctIndex != null && correctIndex > optionIndex) correctIndex -= 1;
        return { ...q, options, correctIndex };
      })
    );
  };

  const removeQuestion = (idx: number) => {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Homework Builder</h3>
          <div className="text-xs text-muted-foreground">
            Build separate Q&amp;A and annotation homework flows for instructors.
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Class avg: {stats.avgScore}/10</div>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2">
            {(["Q&A", "Annotate"] as BuilderTab[]).map((tab) => (
              <Button
                key={tab}
                type="button"
                variant={builderTab === tab ? "default" : "outline"}
                className="rounded-full px-5"
                onClick={() => setBuilderTab(tab)}
              >
                {tab}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="text-xs font-medium text-muted-foreground">Suggested focus</div>
          <div className="flex flex-wrap gap-2">
            {(homeworkTags.length === 0 ? autoChecklist.map((label) => ({ label, highlighted: true })) : homeworkTags).map((tag, i) => (
              <button
                key={`${tag.label}-${i}`}
                type="button"
                onClick={() => {
                  if (homeworkTags.length === 0) {
                    setHomeworkTags(autoChecklist.map((label) => ({ label, highlighted: label === tag.label ? false : true })));
                    return;
                  }
                  setHomeworkTags((prev) => prev.map((t, idx) => (idx === i ? { ...t, highlighted: !t.highlighted } : t)));
                }}
                className={[
                  "px-2.5 py-1 text-xs rounded-full border transition",
                  tag.highlighted ? "bg-blue-500 border-blue-500 text-white" : "border-blue-300 bg-blue-50 text-blue-700",
                ].join(" ")}
              >
                {tag.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
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
                if (!newHomeworkTagInput.trim()) return;
                setHomeworkTags((prev) => [...prev, { label: newHomeworkTagInput.trim(), highlighted: true }]);
                setNewHomeworkTagInput("");
              }}
            >
              +
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-5">
        <div className="space-y-5">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <div className="text-sm font-semibold">Assignment setup</div>
                <div className="text-xs text-muted-foreground">
                  {builderTab === "Q&A"
                    ? "Create the Q&A homework content and publish it to students."
                    : "Create the annotation case and upload the image students will mark up."}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Case title</label>
                  <Input
                    placeholder={builderTab === "Q&A" ? "e.g., Week 7 Q&A" : "e.g., Chest X-Ray Analysis"}
                    value={caseTitle}
                    onChange={(e) => setCaseTitle(e.target.value)}
                  />
                  {errors.caseTitle && <p className="text-xs text-red-600">{errors.caseTitle}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Short description shown to students…"
                    value={caseDesc}
                    onChange={(e) => setCaseDesc(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Case type</label>
                  <select
                    className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                    value={caseType}
                    onChange={(e) => setCaseType(e.target.value)}
                  >
                    <option value="Neurology">Neurology</option>
                    <option value="Pulmonology">Pulmonology</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Gastroenterology">Gastroenterology</option>
                    <option value="Oncology">Oncology</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Orthopedics">Orthopedics</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Due date</label>
                  <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                  {errors.due && <p className="text-xs text-red-600">{errors.due}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-semibold">Assign settings</div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Audience</label>
                  <select
                    className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as "all" | "classroom")}
                  >
                    <option value="all">All students</option>
                    <option value="classroom">Classrooms</option>
                  </select>
                </div>

                {audience === "classroom" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Homework Password</label>
                      <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="e.g., week7pass" />
                      {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Class</label>
                      <select
                        className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                        value={selectedClassroomId}
                        onChange={(e) => onSelectClassroom(e.target.value)}
                      >
                        <option value="">Select class</option>
                        {classroomOptions.map((c) => (
                          <option key={c.id} value={c.id}>{c.display}</option>
                        ))}
                      </select>
                      {errors.className && <p className="text-xs text-red-600">{errors.className}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Year</label>
                      <Input value={year} readOnly placeholder="Auto-filled from selected class" />
                      {errors.year && <p className="text-xs text-red-600">{errors.year}</p>}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {builderTab === "Q&A" ? (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold">Q&amp;A content</div>
                    <div className="text-xs text-muted-foreground">Add essay or multiple-choice questions for this homework.</div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={addEssayQuestion} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Essay
                    </Button>
                    <Button type="button" onClick={addMcqQuestion} className="gap-2">
                      <Plus className="h-4 w-4" />
                      MCQ
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Instructions</label>
                    <Textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Write the general instructions for students..."
                      className="min-h-[120px]"
                    />
                  </div>

                  {questions.length === 0 && (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                      No Q&amp;A questions yet. Add an Essay or MCQ question to begin.
                    </div>
                  )}
                  {errors.questions && <p className="text-xs text-red-600">{errors.questions}</p>}

                  {questions.map((q, qi) => (
                    <div key={qi} className="rounded-xl border p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium flex items-center gap-2">
                          <span>Question {qi + 1}</span>
                          <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                            {q.type === "mcq" ? "MCQ" : "Essay"}
                          </span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(qi)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid md:grid-cols-[1fr_120px] gap-3">
                        <Textarea
                          value={q.prompt}
                          onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
                          placeholder="Write the question prompt..."
                          className="min-h-[120px]"
                        />
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Points</label>
                          <Input
                            type="number"
                            min={1}
                            value={q.points}
                            onChange={(e) => updateQuestion(qi, { points: Number(e.target.value) || 1 })}
                          />
                        </div>
                      </div>

                      {q.type === "mcq" && (
                        <div className="space-y-3 rounded-lg bg-muted/30 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-medium text-muted-foreground">Options (max 5)</div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={q.options.length >= 5}
                              onClick={() => addMcqOption(qi)}
                            >
                              Add option
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {q.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${qi}`}
                                  checked={q.correctIndex === optionIndex}
                                  onChange={() => updateQuestion(qi, { correctIndex: optionIndex })}
                                  className="h-4 w-4"
                                />
                                <Input
                                  value={option}
                                  onChange={(e) => updateMcqOption(qi, optionIndex, e.target.value)}
                                  placeholder={`Option ${optionIndex + 1}`}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={q.options.length <= 2}
                                  onClick={() => removeMcqOption(qi, optionIndex)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground">Select the radio button to mark the correct answer.</div>
                        </div>
                      )}

                      <Textarea
                        value={q.guidance || ""}
                        onChange={(e) => updateQuestion(qi, { guidance: e.target.value })}
                        placeholder={q.type === "mcq" ? "Optional explanation or marking notes..." : "Optional marking guidance or expected answer..."}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <div className="text-sm font-semibold">Annotation image</div>
                  <div className="text-xs text-muted-foreground">Upload the image students will annotate.</div>
                </div>

                <label className="block">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickCaseImage(e.target.files?.[0] ?? null)} />
                  <div
                    className={[
                      "aspect-[16/7] w-full rounded-xl border-2 border-dashed flex items-center justify-center text-center cursor-pointer transition overflow-hidden",
                      caseImagePreview ? "border-border bg-background" : "border-border hover:bg-muted/50",
                    ].join(" ")}
                  >
                    {caseImagePreview ? (
                      <div className="relative w-full h-full">
                        <img src={caseImagePreview} alt="Case preview" className="w-full h-full object-cover" />
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
                        <div className="text-xs text-muted-foreground">PNG or JPG only.</div>
                      </div>
                    )}
                  </div>
                </label>
                {errors.caseImage && <p className="text-xs text-red-600">{errors.caseImage}</p>}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {builderTab === "Annotate" && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Reference uploads</div>
                    <div className="text-xs text-muted-foreground">Optional files for supporting annotation tasks.</div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => refFileInputRef.current?.click()}>
                    Add files
                  </Button>
                  <input
                    ref={refFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => pushRefFiles(e.target.files)}
                  />
                </div>

                <div
                  className={[
                    "rounded-xl border-2 border-dashed p-4 text-sm text-muted-foreground transition",
                    dragOver ? "border-primary bg-primary/5" : "border-border",
                  ].join(" ")}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    pushRefFiles(e.dataTransfer.files);
                  }}
                >
                  Drag and drop files here, or click Add files.
                </div>

                <div className="space-y-2">
                  {referenceUploads.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No reference files uploaded.</div>
                  ) : (
                    referenceUploads.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{file.name}</div>
                          <div className="text-xs text-muted-foreground">{Math.ceil(file.size / 1024)} KB</div>
                        </div>
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeRefUpload(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-semibold">Publish homework</div>
              <div className="text-xs text-muted-foreground">
                Homework type will be published as <span className="font-medium">{builderTab}</span>.
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={!canPublish}
                onClick={() => {
                  if (!validate()) return;
                  onPublish({
                    newCase: {
                      title: caseTitle,
                      description: caseDesc || undefined,
                      type: caseType || undefined,
                      imageFile: builderTab === "Annotate" ? caseImageFile : null,
                      imagePreviewUrl: builderTab === "Annotate" ? caseImagePreview : undefined,
                    },
                    dueAtISO: toISO(due),
                    audience,
                    instructions: instructions || undefined,
                    autoChecklist,
                    suggestedFocusTags: homeworkTags,
                    homeworkType: builderTab,
                    referenceUploads,
                    questions: builderTab === "Q&A" ? questions : [],
                    password,
                    className,
                    year,
                  });
                }}
              >
                Publish {builderTab}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

