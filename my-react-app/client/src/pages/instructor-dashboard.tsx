import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import ProfileMenu from "@/components/profile-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, useHeartbeat } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { mockAtRiskStudents, mockCases } from "@/lib/mock-data";
import {
  Presentation,
  Gauge,
  GraduationCap,
  ClipboardCheck,
  FolderOpen,
  AlertTriangle,
  TrendingDown,
  Mail,
  LineChart,
  Users,
  UserPlus,
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
  | "class"
  | "settings";

const VIEW_STORAGE_KEY = "instructor.activeView";
const VALID_TABS: InstructorView[] = [
  "overview",
  "students",
  "grading",
  "analytics",
  "cases",
  "class",
  "settings",
];

// ====== API base ======
const API_BASE = "http://127.0.0.1:8000";

// ===== Types =====
type SubmissionStatus = "submitted" | "graded" | "grading";

type Submission = {
  id: string;
  caseId: string;
  caseTitle: string;
  studentId: string;

  status: SubmissionStatus;

  score?: number;
  feedback?: string;
  rubric?: any[];
  modelAnswers?: any[];

  published?: boolean;
  publishedAt?: string;

  updatedAt: string;
};

type Mode = "one" | "group";

// ===== Case Management types =====
type CaseFromApi = {
  case_id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  created_at?: string;
};

type CaseCard = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  source: "db" | "mock";
  createdAt?: string;
};

type CaseFilter = "all" | "db" | "mock";
type CaseSort = "newest" | "oldest" | "az" | "za";

// ===== Class types =====
type StudentLite = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  classroom?: string | null;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "S";
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

// ===== Helpers: hook-safe components =====
function GroupCompareCard({ submission }: { submission: Submission }) {
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
  const [onlineCount, setOnlineCount] = useState<number>(0);

  useEffect(() => {
    async function fetchOnlineUsers() {
      try {
        const res = await fetch(`${API_BASE}/api/admin/users`);
        if (!res.ok) throw new Error("Failed to load users");
        const data = await res.json();
        const online = data.filter((u: any) => u.online).length;
        setOnlineCount(online);
      } catch {
        setOnlineCount(0);
      }
    }

    fetchOnlineUsers();
  }, []);

  // ==== Auth / routing ====
  const [, setLocation] = useLocation();
  const { user, logout, isLoading } = useAuth();
  const { t } = useI18n();
  useHeartbeat(user?.user_id);
  const { toast } = useToast();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [activeView, setActiveView] = useState<InstructorView>(() => {
    const saved = (localStorage.getItem(VIEW_STORAGE_KEY) || "") as InstructorView;
    return VALID_TABS.includes(saved) ? saved : "overview";
  });

  // ==== Class state (used in Class tab) ====
  type Classroom = {
    id: string;
    name: string;
    year: string;
    display: string;
    members_count: number;
  };

  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassYear, setNewClassYear] = useState("");
  const [editClassData, setEditClassData] = useState<null | Classroom>(null);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");

  const [availableStudents, setAvailableStudents] = useState<StudentLite[]>([]);
  const [classroomStudents, setClassroomStudents] = useState<StudentLite[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]); // used for adding
  const [isAddingToClass, setIsAddingToClass] = useState(false);

  const loadClassrooms = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/classroom/all`);
      if (res.ok) {
        const data = await res.json();
        setClassrooms(data.classrooms ?? []);
      }
    } catch (e) {
      console.error("Failed to load classrooms", e);
    }
  };

  const loadAvailableStudents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/classroom/students-all`);
      if (res.ok) {
        const d = await res.json();
        setAvailableStudents(
          (d.students ?? []).map((s: any) => ({
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email ?? null,
            classroom: s.classroom ?? "Unassigned",
          }))
        );
      }
    } catch (e) {
      console.error("Failed to load available students", e);
    }
  };

  const loadClassroomStudents = async (classroomId: string) => {
    if (!classroomId) return;
    try {
      const res = await fetch(`${API_BASE}/api/classroom/students/${classroomId}`);
      if (res.ok) {
        const d = await res.json();
        setClassroomStudents(
          (d.students ?? []).map((s: any) => ({
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email ?? null,
            classroom: d.classroom,
          }))
        );
      }
    } catch (e) {
      console.error("Failed to load classroom students", e);
    }
  };

  useEffect(() => {
    loadClassrooms();
    loadAvailableStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedClassroomId) {
      loadClassroomStudents(selectedClassroomId);
    } else {
      setClassroomStudents([]);
    }
  }, [selectedClassroomId]);


  const visibleStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    let list = availableStudents;
    // when a class is selected, filter out students already in that class (so we only add new ones)
    if (selectedClassroomId) {
      const memberIds = new Set(classroomStudents.map((s) => s.id));
      list = list.filter((s) => !memberIds.has(s.id));
    }
    if (!q) return list;

    return list.filter((s) => {
      const name = `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim().toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      const id = (s.id ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || id.includes(q);
    });
  }, [availableStudents, studentSearch, selectedClassroomId, classroomStudents]);

  const toggleSelectStudent = (sid: string) => {
    setSelectedStudents((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    );
  };

  const clearSelection = () => setSelectedStudents([]);

  const addSelectedToClass = async () => {
    if (!selectedClassroomId || selectedStudents.length === 0) return;

    setIsAddingToClass(true);
    try {
      await Promise.all(
        selectedStudents.map((sid) =>
          fetch(`${API_BASE}/api/classroom/add-student`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id: sid, classroom_id: selectedClassroomId }),
          })
        )
      );

      const display = classrooms.find((c) => c.id === selectedClassroomId)?.display;
      toast({
        title: `Added ${selectedStudents.length} student(s) to ${display}`,
      });
      setSelectedStudents([]);
      await loadClassroomStudents(selectedClassroomId);
      await loadAvailableStudents();
    } catch (e) {
      console.error(e);
      toast({
        title: "Failed to add selected students to class",
        variant: "destructive",
      });
    } finally {
      setIsAddingToClass(false);
    }
  };

  // ==== Case Management state (DB cases + merge mock) ====
  const [casesFromApi, setCasesFromApi] = useState<CaseFromApi[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);

  const [caseSearch, setCaseSearch] = useState("");
  const [caseFilter, setCaseFilter] = useState<CaseFilter>("all");
  const [caseSort, setCaseSort] = useState<CaseSort>("newest");

  const loadCases = async () => {
    setLoadingCases(true);
    try {
      const res = await fetch(`${API_BASE}/api/instructor/cases`);
      if (!res.ok) {
        console.error("Failed to load cases", await res.text());
        setCasesFromApi([]);
        return;
      }
      const data = await res.json();
      setCasesFromApi(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading cases", e);
      setCasesFromApi([]);
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    if (activeView === "cases") loadCases();
    if (activeView === "class") {
      loadClassrooms();
      loadAvailableStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  const mergedCases: CaseCard[] = useMemo(() => {
    const dbCases: CaseCard[] = casesFromApi.map((c) => ({
      id: c.case_id,
      title: c.title,
      description: (c.description as string) ?? "No description",
      imageUrl: c.image_url ?? "",
      source: "db",
      createdAt: c.created_at,
    }));

    const demoCases: CaseCard[] = mockCases.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description ?? "No description",
      imageUrl: c.imageUrl,
      source: "mock",
      createdAt: undefined,
    }));

    return [...dbCases, ...demoCases];
  }, [casesFromApi]);

  const visibleCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase();

    let list = mergedCases;

    if (caseFilter !== "all") {
      list = list.filter((c) => c.source === caseFilter);
    }

    if (q) {
      list = list.filter((c) => {
        const hay = `${c.title} ${c.description}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const parseTime = (s?: string) => {
      if (!s) return 0;
      const t = Date.parse(s);
      return Number.isFinite(t) ? t : 0;
    };

    list = [...list].sort((a, b) => {
      if (caseSort === "az") return a.title.localeCompare(b.title);
      if (caseSort === "za") return b.title.localeCompare(a.title);

      const ta = parseTime(a.createdAt);
      const tb = parseTime(b.createdAt);
      if (caseSort === "oldest") return ta - tb;
      return tb - ta;
    });

    return list;
  }, [mergedCases, caseSearch, caseFilter, caseSort]);

  const deleteDbCase = async (caseId: string, title: string) => {
    const yes = window.confirm(`Delete case "${title}"?\nThis cannot be undone.`);
    if (!yes) return;

    try {
      const res = await fetch(`${API_BASE}/api/instructor/cases/${caseId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error("Delete case failed", await res.text());
        alert("Delete failed. Check backend DELETE /api/instructor/cases/{case_id}");
        return;
      }

      await loadCases();
    } catch (e) {
      console.error(e);
      alert("Delete error");
    }
  };

  // ==== Grading state ====
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

  const [draftFeedback, setDraftFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

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

  const avgScore =
    submissions.length === 0
      ? 0
      : Math.round(
          (submissions.reduce((a, b) => a + (b.score ?? 0), 0) / submissions.length) * 10
        ) / 10;

  const selectedCaseId = selected?.caseId ?? "case-1";
  const selectedStudentId = selected?.studentId ?? "unknown";
  const selectedCase = mockCases.find((c) => c.id === selectedCaseId);
  const selectedAnn = useAnnotation(selectedCaseId, selectedStudentId);

  useEffect(() => {
    setDraftFeedback(selected?.feedback ?? "");
  }, [selected?.id]);

  // ==== Effects ====
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
  const saveDraft = async (subId: string, score: number) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/submissions/${encodeURIComponent(subId)}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          rubric: [],
          feedback: draftFeedback ?? "",
          published: false,
        }),
      });

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

  const publish = async (subId: string) => {
    setIsPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/api/submissions/${encodeURIComponent(subId)}/publish`, {
        method: "POST",
      });

      if (!res.ok) {
        console.error("Failed to publish", await res.text());
        alert("Failed to publish");
        return;
      }

      const data = await res.json();
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

  const returnToStudent = async (subId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/submissions/${encodeURIComponent(subId)}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: draftFeedback ?? "" }),
      });

      if (!res.ok) {
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
    { id: "class", label: "Class", icon: Users },
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
              <div
                className={`w-2 h-2 rounded-full ${
                  onlineCount > 0 ? "bg-green-500" : "bg-gray-400"
                } animate-pulse`}
              />
              <span className="text-sm text-muted-foreground">
                {onlineCount} {onlineCount === 1 ? t("userOnline") : t("usersOnline")}
              </span>
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
                          <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-full" />
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
                        {s.studentId} — {s.caseTitle} {s.score != null ? `(Score ${s.score})` : `(${s.status})`}
                        {s.published ? " • Published" : ""}
                      </Button>
                    ))}

                    {filtered.length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">No submissions</div>
                    )}
                  </div>
                </CardContent>
              </Card>

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
                    <RubricPanel onSubmit={(score: number) => saveDraft(selected.id, score)} />

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

                        <Button variant="outline" className="w-full" onClick={() => returnToStudent(selected.id)}>
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
                stats={{
                  avgScore,
                  commonMistakes: ["Overlapping regions", "Incorrect boundary", "Missed edema area"],
                  skillGaps: ["Anatomical localization", "Contrast handling", "Annotation labeling"],
                }}
                onPublish={async (payload: any) => {
                  try {
                    // Case A: payload có newCase (bản bạn làm mới)
                    if (payload?.newCase?.title && payload?.newCase?.imageFile) {
                      const fd = new FormData();
                      fd.append("title", payload.newCase.title);
                      if (payload.newCase.description) fd.append("description", payload.newCase.description);
                      fd.append("image", payload.newCase.imageFile);

                      const createRes = await fetch(`${API_BASE}/api/instructor/cases`, {
                        method: "POST",
                        body: fd,
                      });

                      if (!createRes.ok) {
                        console.error("Create case failed", await createRes.text());
                        alert("Cannot create case. Check backend /api/instructor/cases");
                        return;
                      }

                      const caseData = await createRes.json();
                      const createdCaseId = caseData.case_id ?? caseData.id;

                      const res = await fetch(`${API_BASE}/api/instructor/homeworks`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          case_id: createdCaseId,
                          due_at: payload.dueAtISO,
                          audience: payload.audience,
                          group_name: payload.groupName ?? null,
                          student_ids: payload.studentIds ?? null,
                          instructions: payload.instructions ?? null,
                          checklist: payload.autoChecklist,
                          uploads: payload.referenceUploads ?? payload.uploads ?? [],
                          questions: payload.questions ?? [],
                          requirement_id: payload.requirementId,
                          class_name: payload.className,
                          year: payload.year,
                        }),
                      });

                      if (!res.ok) {
                        console.error("Failed to publish homework", await res.text());
                        alert("Failed to publish homework");
                        return;
                      }

                      const data = await res.json();
                      alert(`Homework published with id ${data.homework_id}`);

                      setActiveView("cases");
                      await loadCases();
                      return;
                    }

                    // Case B: payload kiểu cũ
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
                        uploads: payload.uploads ?? [],
                        questions: payload.questions ?? [],
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

          {/* CASE MANAGEMENT */}
          {activeView === "cases" && (
            <div className="p-6 space-y-6" data-testid="view-cases">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Case Management</h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={loadCases}>
                    Refresh
                  </Button>

                  {/* Upload removed for case management */}
                </div>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      placeholder="Search cases by title/description..."
                      value={caseSearch}
                      onChange={(e) => setCaseSearch(e.target.value)}
                    />

                    <select
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                      value={caseFilter}
                      onChange={(e) => setCaseFilter(e.target.value as CaseFilter)}
                    >
                      <option value="all">All</option>
                      <option value="db">NEW (DB)</option>
                      <option value="mock">DEMO (Mock)</option>
                    </select>

                    <select
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                      value={caseSort}
                      onChange={(e) => setCaseSort(e.target.value as CaseSort)}
                    >
                      <option value="newest">Sort: Newest</option>
                      <option value="oldest">Sort: Oldest</option>
                      <option value="az">Sort: A → Z</option>
                      <option value="za">Sort: Z → A</option>
                    </select>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      Showing <span className="font-medium">{visibleCases.length}</span> cases
                      {caseFilter !== "all" ? ` • Filter: ${caseFilter}` : ""}
                      {caseSearch.trim() ? ` • Search: "${caseSearch.trim()}"` : ""}
                    </div>
                    <button
                      className="hover:underline"
                      onClick={() => {
                        setCaseSearch("");
                        setCaseFilter("all");
                        setCaseSort("newest");
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingCases ? (
                  <div className="text-sm text-muted-foreground">Loading cases…</div>
                ) : visibleCases.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No matches. Try another keyword or reset filters.
                  </div>
                ) : (
                  visibleCases.map((c) => (
                    <Card
                      key={`${c.source}-${c.id}`}
                      className="border border-border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setLocation(`/annotation/${c.id}`)}
                    >
                      <div className="relative">
                        <img
                          src={c.imageUrl}
                          alt={c.title}
                          className="w-full h-48 object-cover bg-muted"
                        />
                        {c.source === "db" && (
                          <button
                            className="absolute top-2 right-2 text-xs px-2 py-1 rounded-md border bg-background/90 hover:bg-background"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDbCase(c.id, c.title);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>

                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold mb-1 truncate">{c.title}</h3>
                          <span className="text-[10px] px-2 py-1 rounded-full border border-border text-muted-foreground shrink-0">
                            {c.source === "db" ? "NEW" : "DEMO"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Upload modal removed for instructors in case management */}
            </div>
          )}

          {/* CLASS (NEW TAB) */}
          {activeView === "class" && (
            <div className="p-6 space-y-6" data-testid="view-class">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Classes</h2>
                  <p className="text-muted-foreground">Create, edit, delete classes. Click a class to manage students.</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowCreateClassModal(true);
                      setNewClassName("");
                      setNewClassYear("");
                    }}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    Create Class
                  </Button>
                </div>
              </div>

              {/* Class list */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classrooms.map((cls) => (
                  <Card
                    key={cls.id}
                    className="border cursor-pointer hover:shadow"
                    onClick={() => setSelectedClassroomId(cls.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{cls.display}</div>
                          <div className="text-xs text-muted-foreground">
                            {cls.members_count} student{cls.members_count === 1 ? "" : "s"}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditClassData(cls);
                              setShowEditClassModal(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const yes = window.confirm(`Delete ${cls.display}?`);
                              if (!yes) return;
                              try {
                                const res = await fetch(`${API_BASE}/api/classroom/${cls.id}`, { method: "DELETE" });
                                if (!res.ok) throw new Error(await res.text());
                                await loadClassrooms();
                                if (selectedClassroomId === cls.id) setSelectedClassroomId("");
                              } catch (err) {
                                console.error(err);
                                toast({ title: "Failed to delete class", variant: "destructive" });
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {classrooms.length === 0 && (
                  <div className="text-sm text-muted-foreground">No classes created yet.</div>
                )}
              </div>

              {/* Selected class details */}
              {selectedClassroomId && (
                <div className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">
                      Students in {classrooms.find((c) => c.id === selectedClassroomId)?.display}
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedClassroomId("")}
                    >
                      Back to classes
                    </Button>
                  </div>

                  {/* add students section */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Search student</label>
                          <Input
                            placeholder="name / email / id..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                          />
                        </div>

                        <div className="flex justify-end">
                          <div className="text-sm text-muted-foreground">
                            Selected: <span className="font-medium">{selectedStudents.length}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleStudents.map((s) => {
                      const fullName = `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() || "Student";
                      const initials = getInitials(fullName);
                      const isSel = selectedStudents.includes(s.id);

                      return (
                        <Card key={s.id} className="border border-border">
                          <CardContent className="p-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-semibold">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold truncate">{fullName}</div>
                                <div className="text-xs text-muted-foreground">
                                  <div className="truncate">Email: {s.email ? s.email : "No email"}</div>
                                  <div className="truncate">ID: {s.id}</div>
                                </div>
                              </div>
                            </div>

                            <Button
                              variant={isSel ? "default" : "outline"}
                              onClick={() => toggleSelectStudent(s.id)}
                            >
                              {isSel ? "Selected" : "Select"}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {visibleStudents.length === 0 && (
                      <div className="text-sm text-muted-foreground">No students found.</div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={clearSelection}
                      disabled={selectedStudents.length === 0}
                      className="min-w-[140px]"
                    >
                      Clear selection
                    </Button>

                    <Button
                      onClick={addSelectedToClass}
                      disabled={
                        !selectedClassroomId || selectedStudents.length === 0 || isAddingToClass
                      }
                      className="bg-blue-600 text-white hover:bg-blue-700 min-w-[220px]"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {isAddingToClass ? "Adding..." : "Add selected to class"}
                    </Button>
                  </div>

                  {/* list current members */}
                  <div className="pt-4">
                    <h4 className="font-semibold">Current members</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                      {classroomStudents.map((s) => {
                        const fullName = `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() || "Student";
                        const initials = getInitials(fullName);
                        return (
                          <Card key={s.id} className="border border-border">
                            <CardContent className="p-4 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-semibold">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">{fullName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    <div className="truncate">Email: {s.email ? s.email : "No email"}</div>
                                    <div className="truncate">ID: {s.id}</div>
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  try {
                                    await fetch(`${API_BASE}/api/classroom/remove-student`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ student_id: s.id, classroom_id: selectedClassroomId }),
                                    });
                                    await loadClassroomStudents(selectedClassroomId);
                                    await loadAvailableStudents();
                                  } catch (err) {
                                    console.error(err);
                                    toast({ title: "Failed to remove student", variant: "destructive" });
                                  }
                                }}
                              >
                                Remove
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {classroomStudents.length === 0 && (
                        <div className="text-sm text-muted-foreground">No students in this class.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                          placeholder="e.g., COS40005, Class A, Period 1..."
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Year</label>
                        <Input
                          value={newClassYear}
                          onChange={(e) => setNewClassYear(e.target.value)}
                          placeholder="e.g., 2025"
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => {
                            setShowCreateClassModal(false);
                            setNewClassName("");
                            setNewClassYear("");
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>

                        <Button
                          onClick={async () => {
                            if (!newClassName.trim() || !newClassYear.trim()) return;
                            try {
                              const res = await fetch(`${API_BASE}/api/classroom/create`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: newClassName.trim(), year: newClassYear.trim() }),
                              });

                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}));
                                throw new Error(err.detail || "Failed to create class");
                              }

                              await loadClassrooms();
                              setShowCreateClassModal(false);
                              setNewClassName("");
                              setNewClassYear("");
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

              {/* Edit Class Modal */}
              {showEditClassModal && editClassData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-md">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="text-lg font-semibold">Edit Class</h3>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Class Name</label>
                        <Input
                          value={editClassData.name}
                          onChange={(e) =>
                            setEditClassData({ ...editClassData, name: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Year</label>
                        <Input
                          value={editClassData.year}
                          onChange={(e) =>
                            setEditClassData({ ...editClassData, year: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => {
                            setShowEditClassModal(false);
                            setEditClassData(null);
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>

                        <Button
                          onClick={async () => {
                            if (!editClassData) return;
                            try {
                              const res = await fetch(
                                `${API_BASE}/api/classroom/update/${editClassData.id}`,
                                {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    name: editClassData.name.trim(),
                                    year: editClassData.year.trim(),
                                  }),
                                }
                              );

                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}));
                                throw new Error(err.detail || "Failed to update class");
                              }

                              await loadClassrooms();
                              setShowEditClassModal(false);
                              setEditClassData(null);
                            } catch (e: any) {
                              alert(e.message || "Error updating class");
                            }
                          }}
                          className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Save
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
