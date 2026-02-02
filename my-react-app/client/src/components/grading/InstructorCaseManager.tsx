import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Edit2, Save, X as XIcon } from "lucide-react";

/** ============ Types ============ */
type QuestionMCQ = {
  type: "mcq";
  prompt: string;
  points: number;
  guidance?: string;
  options: string[];
  correctIndex: number | null;
  imageIndex?: number;
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

type Upload = { name: string; url: string; type: string; size: number };

type HomeworkData = {
  id: string;
  caseId: string;
  caseName: string;
  dueAt: string;
  audience: "all" | "group" | "list";
  groupName?: string;
  studentIds?: string[];
  instructions?: string;
  autoChecklist: string[];
  uploads: Upload[];
  questions: Question[];
  createdAt: string;
  createdBy: string;
};

type Props = {
  homeworks: HomeworkData[];
  cases: { id: string; title: string }[];
  onUpdate: (id: string, data: Partial<HomeworkData>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

/** ============ Component ============ */
export default function InstructorCaseManager({ homeworks, cases, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<HomeworkData>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleEditStart = (hw: HomeworkData) => {
    setEditingId(hw.id);
    setEditData({ ...hw });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleEditSave = async (id: string) => {
    try {
      await onUpdate(id, editData);
      setEditingId(null);
      setEditData({});
    } catch (error) {
      console.error("Failed to update homework:", error);
      alert("Failed to update homework");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this homework?")) return;
    try {
      await onDelete(id);
    } catch (error) {
      console.error("Failed to delete homework:", error);
      alert("Failed to delete homework");
    }
  };

  const handleQuestionUpdate = (qi: number, patch: Partial<Question>) => {
    if (!editData.questions) return;
    const updated = editData.questions.map((q, i) =>
      i === qi ? ({ ...q, ...patch } as Question) : q
    );
    setEditData({ ...editData, questions: updated });
  };

  const handleAddQuestion = (type: "mcq" | "short") => {
    if (!editData.questions) return;
    const base = { points: 1, prompt: "", guidance: "" } as const;
    if (type === "mcq") {
      setEditData({
        ...editData,
        questions: [
          ...editData.questions,
          { type: "mcq", ...base, options: ["", ""], correctIndex: null },
        ],
      });
    } else {
      setEditData({
        ...editData,
        questions: [...editData.questions, { type: "short", ...base, expectedAnswer: "" }],
      });
    }
  };

  const handleRemoveQuestion = (qi: number) => {
    if (!editData.questions) return;
    setEditData({
      ...editData,
      questions: editData.questions.filter((_, i) => i !== qi),
    });
  };

  if (homeworks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No homework assignments created yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {homeworks.map((hw) => {
        const isEditing = editingId === hw.id;
        const data = isEditing ? editData : hw;
        const caseTitle = cases.find((c) => c.id === data.caseId)?.title || data.caseName;

        return (
          <Card key={hw.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">{caseTitle}</CardTitle>
                    <Badge variant="outline">{data.audience === "all" ? "All students" : data.audience === "group" ? `Group: ${data.groupName}` : `${data.studentIds?.length ?? 0} students`}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Created by {hw.createdBy} on {new Date(hw.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {!isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditStart(hw)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(hw.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleEditSave(hw.id)}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEditCancel}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Metadata Section */}
              {isEditing ? (
                <div className="grid md:grid-cols-2 gap-4 pb-4 border-b">
                  <div>
                    <label className="text-sm font-medium">Case</label>
                    <Select value={data.caseId || ""} onValueChange={(val) => setEditData({ ...editData, caseId: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cases.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Due date</label>
                    <Input
                      type="date"
                      value={data.dueAt ? new Date(data.dueAt).toISOString().split('T')[0] : ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          dueAt: e.target.value ? new Date(e.target.value + "T23:59:00").toISOString() : "",
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Audience</label>
                    <Select value={data.audience || "all"} onValueChange={(val) => setEditData({ ...editData, audience: val as any })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All students</SelectItem>
                        <SelectItem value="group">Group (named)</SelectItem>
                        <SelectItem value="list">Specific student IDs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {data.audience === "group" && (
                    <div>
                      <label className="text-sm font-medium">Group name</label>
                      <Input
                        value={data.groupName || ""}
                        onChange={(e) => setEditData({ ...editData, groupName: e.target.value })}
                      />
                    </div>
                  )}
                  {data.audience === "list" && (
                    <div>
                      <label className="text-sm font-medium">Student IDs</label>
                      <Input
                        value={(data.studentIds || []).join(", ")}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            studentIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-2 text-sm pb-4 border-b">
                  <div>
                    <span className="font-medium">Due:</span> {new Date(data.dueAt).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Audience:</span>{" "}
                    {data.audience === "all"
                      ? "All students"
                      : data.audience === "group"
                        ? `Group: ${data.groupName}`
                        : `${data.studentIds?.length ?? 0} students`}
                  </div>
                  <div>
                    <span className="font-medium">Questions:</span> {data.questions?.length ?? 0}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {isEditing ? (
                <div>
                  <label className="text-sm font-medium">Instructions</label>
                  <Textarea
                    value={data.instructions || ""}
                    onChange={(e) => setEditData({ ...editData, instructions: e.target.value })}
                    placeholder="General instructions for this assignment…"
                  />
                </div>
              ) : data.instructions ? (
                <div className="text-sm">
                  <span className="font-medium">Instructions:</span>
                  <p className="text-muted-foreground mt-1">{data.instructions}</p>
                </div>
              ) : null}

              {/* Questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">Questions ({data.questions?.length ?? 0})</div>
                  {isEditing && (
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleAddQuestion("short")}>
                        + Short answer
                      </Button>
                      <Button size="sm" onClick={() => handleAddQuestion("mcq")}>
                        + Multiple choice
                      </Button>
                    </div>
                  )}
                </div>

                {data.questions && data.questions.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {data.questions.map((q, qi) => (
                      <Card key={qi} className="p-3">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs uppercase font-medium text-muted-foreground">
                                {q.type === "mcq" ? "Multiple Choice" : "Short Answer"}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveQuestion(qi)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div>
                              <label className="text-xs font-medium">Prompt</label>
                              <Textarea
                                value={q.prompt}
                                onChange={(e) => handleQuestionUpdate(qi, { prompt: e.target.value })}
                                className="text-sm"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs font-medium">Points</label>
                                <Input
                                  type="number"
                                  value={q.points}
                                  onChange={(e) =>
                                    handleQuestionUpdate(qi, { points: Math.max(0, Number(e.target.value)) })
                                  }
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium">Guidance</label>
                                <Input
                                  value={q.guidance || ""}
                                  onChange={(e) => handleQuestionUpdate(qi, { guidance: e.target.value })}
                                />
                              </div>
                            </div>
                            {q.type === "short" ? (
                              <div>
                                <label className="text-xs font-medium">Expected answer</label>
                                <Input
                                  value={(q as QuestionShort).expectedAnswer || ""}
                                  onChange={(e) =>
                                    handleQuestionUpdate(qi, { expectedAnswer: e.target.value } as any)
                                  }
                                />
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <label className="text-xs font-medium">Options</label>
                                {(q as QuestionMCQ).options.map((opt, oi) => (
                                  <div key={oi} className="flex items-center gap-2">
                                    <Input
                                      value={opt}
                                      onChange={(e) => {
                                        const opts = [...(q as QuestionMCQ).options];
                                        opts[oi] = e.target.value;
                                        handleQuestionUpdate(qi, { options: opts } as any);
                                      }}
                                      className="text-sm"
                                    />
                                    <label className="text-xs flex items-center gap-1">
                                      <input
                                        type="radio"
                                        checked={(q as QuestionMCQ).correctIndex === oi}
                                        onChange={() =>
                                          handleQuestionUpdate(qi, { correctIndex: oi } as any)
                                        }
                                      />
                                      Correct
                                    </label>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">
                                {q.type === "mcq" ? "MCQ" : "Short Answer"} ({q.points} pts)
                              </span>
                              {q.guidance && <span className="text-xs text-muted-foreground">Guidance: {q.guidance}</span>}
                            </div>
                            <p className="text-sm">{q.prompt}</p>
                            {q.type === "mcq" && (
                              <div className="text-xs space-y-0.5 ml-2">
                                {(q as QuestionMCQ).options.map((opt, oi) => (
                                  <div key={oi}>
                                    {(q as QuestionMCQ).correctIndex === oi ? "✓ " : "• "}{opt}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No questions yet.</div>
                )}
              </div>

              {/* Auto Checklist */}
              {data.autoChecklist && data.autoChecklist.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Suggested focus areas</div>
                  <div className="flex flex-wrap gap-2">
                    {data.autoChecklist.map((item, i) => (
                      <Badge key={i} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
