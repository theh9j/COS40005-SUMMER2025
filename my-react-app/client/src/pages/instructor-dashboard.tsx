import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import ProfileMenu from "@/components/profile-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, useHeartbeat } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { mockAtRiskStudents, mockCases } from "@/lib/mock-data";
import UploadModal from "@/components/upload-modal";
import {
  Presentation,
  Gauge,
  GraduationCap,
  ClipboardCheck,
  FolderOpen,
  Clock,
  ChartLine,
  Upload as UploadIcon,
  AlertTriangle,
  TrendingDown,
  Mail,
  LineChart,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import AnnotationCanvas from "@/components/annotation-canvas";
import { useAnnotation } from "@/hooks/use-annotation";
import RubricPanel from "@/components/grading/RubricPanel";
import HomeworkPrepPanel from "@/components/grading/HomeworkPrepPanel";

type InstructorView =
  | "overview"
  | "students"
  | "grading"
  | "analytics"
  | "cases"
  | "settings";

const VIEW_STORAGE_KEY = "instructor.activeView";
const VALID_TABS: InstructorView[] = [
  "overview",
  "students",
  "grading",
  "analytics",
  "cases",
  "settings",
];

// ====== API base (update nếu bạn dùng port khác) ======
const API_BASE = "http://127.0.0.1:8000";

// ===== Types =====
type SubmissionStatus = "submitted" | "graded" | "grading";

type Submission = {
  id: string;
  caseId: string;
  caseTitle: string;
  studentId: string;

  status: SubmissionStatus;

  // grading result
  score?: number;
  feedback?: string; // "return answer to student" (instructor feedback / model answer)
  rubric?: any[]; // optional
  modelAnswers?: any[]; // optional nếu bạn cần trả đáp án dạng structured

  // publish control (IMPORTANT)
  published?: boolean;
  publishedAt?: string;

  updatedAt: string;
};

type Mode = "one" | "group";

// ===== Helpers: hook-safe components =====
function GroupCompareCard({
  submission,
}: {
  submission: Submission;
}) {
  const caseObj = mockCases.find((c) => c.id === submission.caseId);
  const ann = useAnnotation(submission.caseId, submission.studentId);

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{submission.studentId}</div>
          <div className="text-xs text-muted-foreground">
            {submission.score != null ? `Score ${submission.score}` : submission.status}
            {submission.published ? " • Published" : ""}
          </div>
        </div>
          <AnnotationCanvas
            imageUrl={caseObj?.imageUrl ?? ""}
            annotation={ann}
            peerAnnotations={ann.peerAnnotations}
          />
      </CardContent>
    </Card>
  );
}

export default function InstructorDashboard() {
  // ==== Auth / routing ====
  const [, setLocation] = useLocation();
  const { user, logout, isLoading } = useAuth();
  const { t } = useI18n();
  useHeartbeat(user?.user_id);

  // ==== UI state ====
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [classrooms, setClassrooms] = useState<string[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  useEffect(() => {
    // fetch classrooms and students from backend
    async function load() {
      try {
        const resC = await fetch(`${API_BASE}/api/classroom/all`);
        if (resC.ok) {
          const data = await resC.json();
          setClassrooms(data.classrooms.map((c: any) => c.name));
        }

        const resS = await fetch(`${API_BASE}/api/classroom/students-all`);
        if (resS.ok) {
          const d = await resS.json();
          setAvailableStudents(d.students.map((s: any) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName })));
        }
      } catch (e) {
        console.error("Failed to load classrooms/students", e);
      }
    }

    load();
  }, []);
  const [activeView, setActiveView] = useState<InstructorView>(() => {
    const saved = (localStorage.getItem(VIEW_STORAGE_KEY) || "") as InstructorView;
    return VALID_TABS.includes(saved) ? saved : "overview";
  });
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // ==== Grading state ====
  // default mock để UI không trống nếu BE chưa chạy
  const [submissions, setSubmissions] = useState<Submission[]>([
    {
      id: "sub-1",
      caseId: "case-1",
      caseTitle: "Brain MRI - Stroke",
      studentId: "david.tran",
      status: "submitted",
      score: 8,
      feedback: "",
      published: false,
      updatedAt: "2025-10-10T10:00:00Z",
    },
    {
      id: "sub-2",
      caseId: "case-1",
      caseTitle: "Brain MRI - Stroke",
      studentId: "emma.wilson",
      status: "submitted",
      score: 7,
      feedback: "",
      published: false,
      updatedAt: "2025-10-11T08:00:00Z",
    },
    {
      id: "sub-3",
      caseId: "case-2",
      caseTitle: "Chest X-Ray Analysis",
      studentId: "james.lee",
      status: "graded",
      score: 9,
      feedback: "Good job. Consider boundary precision.",
      published: true,
      publishedAt: "2025-10-12T12:30:00Z",
      updatedAt: "2025-10-12T12:00:00Z",
    },
  ]);

  const [mode, setMode] = useState<Mode>("one");
  const [query, setQuery] = useState("");
  const [activeIds, setActiveIds] = useState<string[]>([]);

  // instructor text boxes (return answer)
  const [draftFeedback, setDraftFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // ==== Derived lists ====
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return submissions.filter(
      (s) => s.studentId.toLowerCase().includes(q) || s.caseTitle.toLowerCase().includes(q)
    );
  }, [query, submissions]);

  const selected = useMemo(
    () => filtered.find((s) => s.id === (activeIds[0] ?? "")) ?? filtered[0],
    [filtered, activeIds]
  );

  const activeGroup = useMemo(
    () => filtered.filter((s) => activeIds.includes(s.id)).slice(0, 4),
    [filtered, activeIds]
  );

  const onPick = (id: string) =>
    setActiveIds((prev) =>
      mode === "one" ? [id] : prev.includes(id) ? prev : [...prev, id].slice(-4)
    );

  // avgScore for Homework Builder
  const avgScore =
    submissions.length === 0
      ? 0
      : Math.round(
          (submissions.reduce((a, b) => a + (b.score ?? 0), 0) / submissions.length) * 10
        ) / 10;

  // ===== FIX hooks: call useAnnotation unconditionally (1–1 mode) =====
  const selectedCaseId = selected?.caseId ?? "case-1";
  const selectedStudentId = selected?.studentId ?? "unknown";
  const selectedCase = mockCases.find((c) => c.id === selectedCaseId);
  const selectedAnn = useAnnotation(selectedCaseId, selectedStudentId);

  // when switching selected submission, sync draftFeedback
  useEffect(() => {
    setDraftFeedback(selected?.feedback ?? "");
  }, [selected?.id]);

  // ==== EFFECTS ====
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, activeView);
  }, [activeView]);

  useEffect(() => {
    const handleClick = () => setShowProfileMenu(false);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowProfileMenu(false);
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // guard route
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "instructor")) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  // load submissions from backend
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/instructor/submissions`);
        if (!res.ok) {
          console.error("Failed to load submissions", await res.text());
          return;
        }
        const data = await res.json();

        const mapped: Submission[] = (data ?? []).map((s: any) => ({
          id: s.id,
          caseId: s.case_id,
          caseTitle: s.case_title ?? "Unknown case",
          studentId: s.student_id,
          status: (s.status as SubmissionStatus) ?? "submitted",
          score: s.score ?? undefined,
          feedback: s.feedback ?? "",
          rubric: s.rubric ?? [],
          modelAnswers: s.model_answers ?? [],
          published: Boolean(s.published),
          publishedAt: s.published_at ?? undefined,
          updatedAt: s.updated_at ?? "",
        }));

        if (mapped.length) setSubmissions(mapped);
      } catch (err) {
        console.error("Error loading submissions", err);
      }
    };
    load();
  }, []);

  // ==== API actions ====

  // 1) Save draft grade + feedback (NOT published)
  const saveDraft = async (subId: string, score: number) => {
    setIsSaving(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/submissions/${encodeURIComponent(subId)}/grade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score,
            rubric: [], // TODO: map rubric rows nếu bạn muốn
            feedback: draftFeedback ?? "",
            published: false,
          }),
        }
      );

      if (!res.ok) {
        console.error("Failed to save grade", await res.text());
        alert("Failed to save grade");
        return;
      }

      const data = await res.json();
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === subId
            ? {
                ...s,
                score: data.score ?? score,
                status: "graded",
                feedback: data.feedback ?? draftFeedback,
                published: false,
                publishedAt: undefined,
              }
            : s
        )
      );
    } catch (err) {
      console.error("Error saving grade", err);
      alert("Error saving grade");
    } finally {
      setIsSaving(false);
    }
  };

  // 2) Publish marks & answers (students can view AFTER this)
  const publish = async (subId: string) => {
    setIsPublishing(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/submissions/${encodeURIComponent(subId)}/publish`,
        { method: "POST" }
      );

      if (!res.ok) {
        console.error("Failed to publish", await res.text());
        alert("Failed to publish");
        return;
      }

      const data = await res.json(); // expect { published:true, published_at:"..." }
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === subId
            ? {
                ...s,
                published: true,
                publishedAt: data.published_at ?? new Date().toISOString(),
              }
            : s
        )
      );
    } catch (err) {
      console.error("Error publishing", err);
      alert("Error publishing");
    } finally {
      setIsPublishing(false);
    }
  };

  // 3) Return answer to student (optional endpoint)
  // Nếu BE chưa có endpoint riêng, bạn có thể bỏ nút này,
  // hoặc dùng luôn saveDraft + publish để coi như "return".
  const returnToStudent = async (subId: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/submissions/${encodeURIComponent(subId)}/return`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback: draftFeedback ?? "" }),
        }
      );

      if (!res.ok) {
        // fallback: nếu BE chưa có /return → vẫn không crash
        console.warn("Return endpoint not available. Falling back to draft save.");
        alert("Return API not found. Ask BE to add /return or use Publish instead.");
        return;
      }

      alert("Returned to student successfully");
    } catch (err) {
      console.error("Error returning to student", err);
      alert("Error returning to student");
    }
  };

  // ==== UI ====
  if (isLoading) return <div>Loading...</div>;
  if (!user) return null;

  const navItems = [
    { id: "overview", label: t("overview"), icon: Gauge },
    { id: "students", label: t("studentWork"), icon: GraduationCap },
    { id: "grading", label: t("grading"), icon: ClipboardCheck },
    { id: "analytics", label: t("homeworkBuilder"), icon: LineChart },
    { id: "cases", label: t("caseManagement"), icon: FolderOpen },
  ];

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background" data-testid="instructor-dashboard">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 h-16 flex items-center sticky top-0 z-40">
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => setLocation("/home")}
            className="flex items-center space-x-4 focus:outline-none hover:opacity-80 transition"
          >
            <Presentation className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold">{t("instructorDashboard")}</h1>
          </button>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full pulse-dot"></div>
              <span className="text-sm text-muted-foreground">15 students online</span>
            </div>

            <div className="flex items-center space-x-2 relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu((v) => !v);
                }}
                className="focus:outline-none"
              >
                <img
                  src="https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40"
                  alt="Instructor Avatar"
                  className="w-8 h-8 rounded-full border-2 border-primary"
                />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu((v) => !v);
                }}
                className="text-sm font-medium hover:underline focus:outline-none"
                aria-haspopup="menu"
                aria-expanded={showProfileMenu}
              >
                Dr. {user.lastName}
              </button>

              {showProfileMenu && (
                <div onClick={(e) => e.stopPropagation()}>
                  <ProfileMenu />
                  <div className="p-2">
                    <Button variant="outline" className="w-full" onClick={handleLogout}>
                      Logout
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="group/sidebar w-16 hover:w-64 transition-all duration-300 bg-card border-r border-border sticky top-16 h-[calc(100vh-4rem)] overflow-hidden hover:overflow-auto">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === (item.id as InstructorView);
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`w-full justify-start hover:bg-transparent ${
                    isActive ? "text-primary" : "text-foreground"
                  }`}
                  onClick={() => setActiveView(item.id as InstructorView)}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  <span className="ml-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                    {item.label}
                  </span>
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto">
          {/* OVERVIEW */}
          {activeView === "overview" && (
            <div className="p-6" data-testid="view-overview">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Welcome, Dr. {user.lastName}!</h2>
                <p className="text-muted-foreground">Monitor student progress and provide feedback</p>
              </div>

              <Card className="mb-8">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                      At-Risk Student Alerts
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {mockAtRiskStudents.length} students need attention
                    </span>
                  </div>

                  <div className="space-y-4">
                    {mockAtRiskStudents.map((student) => (
                      <div
                        key={student.id}
                        className="p-4 border border-red-500/30 rounded-lg hover:bg-muted transition"
                      >
                        <div className="flex items-start space-x-4">
                          <img
                            src={student.avatar}
                            alt={student.name}
                            className="w-12 h-12 rounded-full"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium">{student.name}</p>
                              <div className="flex items-center space-x-2">
                                {student.trend === "declining" && (
                                  <span className="flex items-center text-xs text-red-500">
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                    Declining
                                  </span>
                                )}
                                <span className="text-sm font-semibold text-red-500">
                                  Score: {student.score}%
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{student.issue}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                Last active: {student.lastActive}
                              </span>
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline" className="h-7 text-xs">
                                  <Mail className="h-3 w-3 mr-1" />
                                  Contact
                                </Button>
                                <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* GRADING */}
          {activeView === "grading" && (
            <div className="p-6" data-testid="view-grading">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Grading</h2>
                <div className="flex gap-2">
                  <Button variant={mode === "one" ? "default" : "secondary"} onClick={() => setMode("one")}>
                    1–1
                  </Button>
                  <Button variant={mode === "group" ? "default" : "secondary"} onClick={() => setMode("group")}>
                    Group
                  </Button>
                </div>
              </div>

              {/* Submissions list */}
              <Card className="mb-4">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Submissions</h3>
                    <Input
                      placeholder="Search by student/case…"
                      className="max-w-xs"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[240px] overflow-auto">
                    {filtered.map((s) => (
                      <Button
                        key={s.id}
                        variant={activeIds.includes(s.id) ? "default" : "ghost"}
                        className="justify-start"
                        onClick={() => onPick(s.id)}
                      >
                        {s.studentId} — {s.caseTitle}{" "}
                        {s.score != null ? `(Score ${s.score})` : `(${s.status})`}
                        {s.published ? " • Published" : ""}
                      </Button>
                    ))}

                    {filtered.length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">No submissions</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ONE-ON-ONE */}
              {mode === "one" && selected && (
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="md:col-span-2">
                    <CardContent className="p-4 space-y-2">
                      <div className="text-sm text-muted-foreground">
                        {selected.studentId} • {selected.caseTitle}
                      </div>

                        <AnnotationCanvas
                          imageUrl={selectedCase?.imageUrl ?? ""}
                          annotation={selectedAnn}
                          peerAnnotations={selectedAnn.peerAnnotations}
                        />
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    {/* Rubric Panel (score input) */}
                    <RubricPanel
                      onSubmit={(score: number) => saveDraft(selected.id, score)}
                    />

                    {/* Return answer to student (feedback/model answer) */}
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Return answer / Feedback</h3>
                          <span className="text-xs text-muted-foreground">
                            {selected.published ? "Published" : "Draft"}
                          </span>
                        </div>

                        <Textarea
                          value={draftFeedback}
                          onChange={(e) => setDraftFeedback(e.target.value)}
                          placeholder="Write instructor feedback / model answer for the student..."
                          className="min-h-[120px]"
                        />

                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              // Save draft without changing score: keep existing score or 0
                              const scoreToSave = selected.score ?? 0;
                              saveDraft(selected.id, scoreToSave);
                            }}
                            disabled={isSaving}
                          >
                            {isSaving ? "Saving..." : "Save Draft"}
                          </Button>

                          <Button
                            onClick={() => publish(selected.id)}
                            disabled={isPublishing || selected.status !== "graded" || selected.published}
                          >
                            {selected.published ? "Published" : isPublishing ? "Publishing..." : "Publish marks & answers"}
                          </Button>
                        </div>

                        {/* optional: notify student (needs BE endpoint) */}
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => returnToStudent(selected.id)}
                        >
                          Notify / Return to student
                        </Button>

                        <div className="text-xs text-muted-foreground">
                          Publish is only enabled after grading is saved (status = graded).
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* GROUP COMPARE */}
              {mode === "group" && (
                <div className="grid md:grid-cols-2 gap-4">
                  {activeGroup.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Select 2–4 submissions from the list to compare.
                    </div>
                  ) : (
                    activeGroup.map((s) => <GroupCompareCard key={s.id} submission={s} />)
                  )}
                </div>
              )}
            </div>
          )}

          {/* HOMEWORK BUILDER */}
          {activeView === "analytics" && (
            <div className="p-6 space-y-6" data-testid="view-analytics">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Homework Builder</h2>
                <span className="text-muted-foreground text-sm">
                  Analyze class results and create personalized homework.
                </span>
              </div>

              <HomeworkPrepPanel
                cases={mockCases.map((c) => ({ id: c.id, title: c.title }))}
                stats={{
                  avgScore,
                  commonMistakes: ["Overlapping regions", "Incorrect boundary", "Missed edema area"],
                  skillGaps: ["Anatomical localization", "Contrast handling", "Annotation labeling"],
                }}
                onPublish={async (payload) => {
                  try {
                    const res = await fetch(`${API_BASE}/api/instructor/homeworks`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        case_id: payload.caseId,
                        due_at: payload.dueAtISO,
                        audience: payload.audience,
                        group_name: payload.groupName ?? null,
                        student_ids: payload.studentIds ?? null,
                        instructions: payload.instructions ?? null,
                        checklist: payload.autoChecklist,
                        uploads: payload.uploads,
                        questions: payload.questions,
                      }),
                    });

                    if (!res.ok) {
                      console.error("Failed to publish homework", await res.text());
                      alert("Failed to publish homework");
                      return;
                    }

                    const data = await res.json();
                    alert(`Homework published with id ${data.homework_id}`);
                  } catch (err) {
                    console.error("Error publishing homework", err);
                    alert("Error publishing homework");
                  }
                }}
              />
            </div>
          )}

          {/* CASE MANAGEMENT VIEW */}
          {activeView === "cases" && (
            <div className="p-6 space-y-6" data-testid="view-cases">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Case Management</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowCreateClassModal(true)}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    Create Class
                  </Button>
                  <Button
                    onClick={() => setShowAddStudentModal(true)}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Add People to Class
                  </Button>
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-primary text-primary-foreground hover:opacity-90"
                  >
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Upload Case
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockCases.map((case_) => (
                  <Card
                    key={case_.id}
                    className="border border-border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setLocation(`/annotation/${case_.id}`)}
                  >
                    <img src={case_.imageUrl} alt={case_.title} className="w-full h-48 object-cover" />
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">{case_.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{case_.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {case_.category}
                        </span>
                        <span className="text-xs text-muted-foreground">12 annotations</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <UploadModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} />

              {/* Create Class Modal */}
              {showCreateClassModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-md">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="text-lg font-semibold">Create New Class</h3>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Class Name</label>
                        <Input
                          value={newClassName}
                          onChange={(e) => setNewClassName(e.target.value)}
                          placeholder="e.g., Class A, Period 1, etc."
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => {
                            setShowCreateClassModal(false);
                            setNewClassName("");
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={async () => {
                            if (!newClassName.trim()) return;
                            try {
                              const res = await fetch(`${API_BASE}/api/classroom/create`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: newClassName.trim() }),
                              });
                              if (!res.ok) {
                                const err = await res.json();
                                throw new Error(err.detail || "Failed to create class");
                              }
                              const d = await res.json();
                              // refresh classroom list
                              setClassrooms((prev) => Array.from(new Set([...prev, newClassName.trim()])));
                              alert(`Class "${newClassName}" created successfully!`);
                              setShowCreateClassModal(false);
                              setNewClassName("");
                            } catch (e: any) {
                              alert(e.message || "Error creating class");
                            }
                          }}
                          className="bg-green-600 text-white hover:bg-green-700"
                        >
                          Create
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Add Student to Class Modal */}
              {showAddStudentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-md max-h-96 overflow-y-auto">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="text-lg font-semibold">Add Student to Class</h3>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Select Class</label>
                        <select
                          value={selectedClassroom}
                          onChange={(e) => setSelectedClassroom(e.target.value)}
                          className="w-full border rounded px-3 py-2"
                        >
                          <option value="">Choose a class...</option>
                          {classrooms.map((cls) => (
                            <option key={cls} value={cls}>
                              {cls}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Select Students</label>
                        <div className="border rounded p-3 space-y-2 max-h-40 overflow-y-auto">
                          {availableStudents.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No students available. Create students first.
                            </p>
                          ) : (
                            availableStudents.map((student) => (
                              <label key={student.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedStudents.includes(student.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedStudents([...selectedStudents, student.id]);
                                    } else {
                                      setSelectedStudents(
                                        selectedStudents.filter((id) => id !== student.id)
                                      );
                                    }
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm">
                                  {student.firstName} {student.lastName}
                                </span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => {
                            setShowAddStudentModal(false);
                            setSelectedClassroom("");
                            setSelectedStudents([]);
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={async () => {
                            if (!selectedClassroom || selectedStudents.length === 0) return;
                            try {
                              // add each selected student
                              await Promise.all(
                                selectedStudents.map((sid) =>
                                  fetch(`${API_BASE}/api/classroom/add-student`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ student_id: sid, classroom_name: selectedClassroom }),
                                  })
                                )
                              );

                              // refresh students and classrooms
                              const resS = await fetch(`${API_BASE}/api/classroom/students-all`);
                              if (resS.ok) {
                                const d = await resS.json();
                                setAvailableStudents(d.students.map((s: any) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName })));
                              }
                              const resC = await fetch(`${API_BASE}/api/classroom/all`);
                              if (resC.ok) {
                                const data = await resC.json();
                                setClassrooms(data.classrooms.map((c: any) => c.name));
                              }

                              alert(`Added ${selectedStudents.length} student(s) to ${selectedClassroom}`);
                              setShowAddStudentModal(false);
                              setSelectedClassroom("");
                              setSelectedStudents([]);
                            } catch (e: any) {
                              alert(e.message || "Failed to add students to class");
                            }
                          }}
                          className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Add to Class
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {activeView === "settings" && (
            <div className="p-6 space-y-6" data-testid="view-settings">
              <h2 className="text-2xl font-bold mb-4">Account Settings</h2>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Manage instructor profile, theme, and preferences.
                  </p>
                  <Button onClick={() => setLocation("/settings")} className="w-full">
                    Open Settings Page
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


