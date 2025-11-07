import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

/** ============ Types ============ */
type SuggestStats = {
  avgScore: number;
  commonMistakes: string[];
  skillGaps: string[];
};

type Upload = { name: string; url: string; type: string; size: number };

type QuestionMCQ = {
  type: "mcq";
  prompt: string;
  points: number;
  guidance?: string;
  options: string[];
  correctIndex: number | null; // null -> chưa chọn
  imageIndex?: number; // optional: đính kèm ảnh từ uploads
};

type QuestionShort = {
  type: "short";
  prompt: string;
  points: number;
  guidance?: string;
  expectedAnswer?: string;
  imageIndex?: number;
};

type Question = QuestionMCQ | QuestionShort;

type Props = {
  cases: { id: string; title: string }[];
  stats: SuggestStats;
  onPublish: (payload: {
    caseId: string;
    dueAtISO: string;
    audience: "all" | "group" | "list";
    groupName?: string;
    studentIds?: string[];
    instructions?: string;
    autoChecklist?: string[];
    uploads: Upload[];
    questions: Question[];
  }) => void;
};

/** ============ Component ============ */
export default function HomeworkPrepPanel({ cases, stats, onPublish }: Props) {
  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");
  const [due, setDue] = useState<string>(""); // yyyy-mm-dd
  const [audience, setAudience] = useState<"all" | "group" | "list">("all");
  const [groupName, setGroupName] = useState("");
  const [studentIds, setStudentIds] = useState("");
  const [instructions, setInstructions] = useState("");

  // uploads
  const [uploads, setUploads] = useState<Upload[]>([]);

  // questions
  const [questions, setQuestions] = useState<Question[]>([]);

  // checklist auto từ thống kê
  const autoChecklist = useMemo(() => {
    const base = [
      ...stats.commonMistakes.map((x) => `Fix: ${x}`),
      ...stats.skillGaps.map((x) => `Practice: ${x}`),
    ];
    return Array.from(new Set(base)).slice(0, 6);
  }, [stats]);

  const canPublish = caseId && due && questions.length > 0;

  /** ---------- Handlers ---------- */
  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list: Upload[] = Array.from(files).map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f), // mock preview; BE sẽ trả URL thật
      type: f.type || "application/octet-stream",
      size: f.size,
    }));
    setUploads((prev) => [...prev, ...list]);
  };

  const removeUpload = (idx: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== idx));
    // đồng thời bỏ imageIndex trong câu hỏi nếu trỏ đến ảnh vừa xoá
    setQuestions((prev) =>
      prev.map((q) =>
        q.imageIndex === idx ? { ...q, imageIndex: undefined } as Question : q
      )
    );
  };

  const addQuestion = (type: Question["type"]) => {
    const base = { points: 1, prompt: "", guidance: "" } as const;
    if (type === "mcq") {
      setQuestions((qs) => [
        ...qs,
        { type: "mcq", ...base, options: ["", ""], correctIndex: null },
      ]);
    } else {
      setQuestions((qs) => [...qs, { type: "short", ...base, expectedAnswer: "" }]);
    }
  };

  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    setQuestions((qs) =>
      qs.map((q, i) => (i === idx ? ({ ...q, ...patch } as Question) : q))
    );
  };

  const removeQuestion = (idx: number) => {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  };

  const addOption = (qi: number) => {
    const q = questions[qi];
    if (q?.type !== "mcq") return;
    const next = [...q.options, ""];
    updateQuestion(qi, { options: next } as Partial<QuestionMCQ>);
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    const q = questions[qi];
    if (q?.type !== "mcq") return;
    const next = q.options.map((o, i) => (i === oi ? value : o));
    updateQuestion(qi, { options: next } as Partial<QuestionMCQ>);
  };

  const removeOption = (qi: number, oi: number) => {
    const q = questions[qi];
    if (q?.type !== "mcq") return;
    const next = q.options.filter((_, i) => i !== oi);
    const patch: Partial<QuestionMCQ> = { options: next };
    if (q.correctIndex != null && q.correctIndex === oi) {
      patch.correctIndex = null; // reset
    } else if (q.correctIndex != null && oi < q.correctIndex) {
      patch.correctIndex = q.correctIndex - 1;
    }
    updateQuestion(qi, patch);
  };

  const toISO = (d: string) => (d ? new Date(d + "T23:59:00").toISOString() : "");

  /** ---------- Render ---------- */
  return (
    <Card>
      <CardContent className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Homework Builder</h3>
          <div className="text-xs text-muted-foreground">Class avg: {stats.avgScore}/10</div>
        </div>

        {/* Suggestions */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Suggested focus</div>
          <div className="flex flex-wrap gap-2">
            {autoChecklist.map((c, i) => (
              <Badge key={i} variant="secondary">
                {c}
              </Badge>
            ))}
          </div>
        </div>

        {/* Form: case + due + audience */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Case</label>
            <select
              className="w-full border rounded-md p-2"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            <label className="text-sm font-medium">Due date</label>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Audience</label>
            <select
              className="w-full border rounded-md p-2"
              value={audience}
              onChange={(e) => setAudience(e.target.value as any)}
            >
              <option value="all">All students</option>
              <option value="group">Group (named)</option>
              <option value="list">Specific student IDs</option>
            </select>

            {audience === "group" && (
              <>
                <label className="text-sm font-medium">Group name</label>
                <Input
                  placeholder="e.g., Week8-Remedial"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </>
            )}

            {audience === "list" && (
              <>
                <label className="text-sm font-medium">Student IDs (comma separated)</label>
                <Input
                  placeholder="david.tran, emma.wilson"
                  value={studentIds}
                  onChange={(e) => setStudentIds(e.target.value)}
                />
              </>
            )}
          </div>
        </div>

        {/* Upload images */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Reference images (optional)</label>
            <Input type="file" multiple onChange={(e) => handleUploadFiles(e.target.files)} />
          </div>
          {uploads.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {uploads.map((u, i) => (
                <div key={i} className="relative group border rounded-md overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u.url} alt={u.name} className="h-28 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeUpload(i)}
                    className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center bg-black/60 rounded-full p-1"
                    title="Remove"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                  <div className="px-2 py-1 text-[11px] truncate">{u.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Questions builder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Questions</div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => addQuestion("short")}>
                + Short answer
              </Button>
              <Button size="sm" onClick={() => addQuestion("mcq")}>+ Multiple choice</Button>
            </div>
          </div>

          {questions.length === 0 && (
            <div className="text-xs text-muted-foreground">No questions yet. Add one to start.</div>
          )}

          {questions.map((q, qi) => (
            <Card key={qi}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {q.type === "mcq" ? "Multiple Choice" : "Short Answer"}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeQuestion(qi)}>
                    Remove
                  </Button>
                </div>

                {/* prompt */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium">Prompt</label>
                  <Textarea
                    value={q.prompt}
                    onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
                    placeholder="Write the question…"
                  />
                </div>

                {/* points + guidance */}
                <div className="grid grid-cols-2 gap-2">
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
                  <div>
                    <label className="block text-xs font-medium">Guidance (optional)</label>
                    <Input
                      value={q.guidance ?? ""}
                      onChange={(e) => updateQuestion(qi, { guidance: e.target.value })}
                      placeholder="What to pay attention to…"
                    />
                  </div>
                </div>

                {/* attach image from uploads */}
                {uploads.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium">Attach image (optional)</label>
                    <select
                      className="w-full border rounded-md p-2 text-sm"
                      value={q.imageIndex ?? ""}
                      onChange={(e) =>
                        updateQuestion(qi, {
                          imageIndex: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                    >
                      <option value="">— None —</option>
                      {uploads.map((u, i) => (
                        <option key={i} value={i}>
                          {i + 1}. {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* answer type specifics */}
                {q.type === "short" ? (
                  <div>
                    <label className="block text-xs font-medium">Expected answer (optional)</label>
                    <Input
                      value={(q as QuestionShort).expectedAnswer ?? ""}
                      onChange={(e) =>
                        updateQuestion(qi, { expectedAnswer: e.target.value } as Partial<QuestionShort>)
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-medium">Options</div>
                    {(q as QuestionMCQ).options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <Input
                          className="flex-1"
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          placeholder={`Option ${oi + 1}`}
                        />
                        <label className="text-xs flex items-center gap-1">
                          <input
                            type="radio"
                            name={`correct-${qi}`}
                            checked={(q as QuestionMCQ).correctIndex === oi}
                            onChange={() => updateQuestion(qi, { correctIndex: oi } as Partial<QuestionMCQ>)}
                          />
                          Correct
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(qi, oi)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="secondary" size="sm" onClick={() => addOption(qi)}>
                      + Add option
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Instructions */}
        <div>
          <label className="text-sm font-medium">General instructions (optional)</label>
          <Textarea
            placeholder="Short guidance for the assignment…"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>

        {/* Publish */}
        <div className="flex justify-end">
          <Button
            onClick={() =>
              onPublish({
                caseId,
                dueAtISO: toISO(due),
                audience,
                groupName: audience === "group" ? groupName || undefined : undefined,
                studentIds:
                  audience === "list"
                    ? studentIds.split(",").map((s) => s.trim()).filter(Boolean)
                    : undefined,
                instructions: instructions || undefined,
                autoChecklist,
                uploads,
                questions,
              })
            }
            disabled={!canPublish}
          >
            Publish homework
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
