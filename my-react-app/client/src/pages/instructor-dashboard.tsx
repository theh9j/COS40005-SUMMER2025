import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import ProfileMenu from "@/components/profile-menu";
import Avatar from "@/components/Avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth, useHeartbeat } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { mockCases } from "@/lib/mock-data";
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
  MessageCircle,
  Users,
  UserPlus,
  Plus,
  Trash2,
} from "lucide-react";

import DiscussionThread from "@/components/discussion/DiscussionThread";

import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import AnnotationCanvas from "@/components/annotation-canvas";
import { useAnnotation } from "@/hooks/use-annotation";
import RubricPanel, { buildDefaultCriteria } from "@/components/grading/RubricPanel";
import HomeworkPrepPanel from "@/components/grading/HomeworkPrepPanel";

// ✅ added
import AnnotationToolbar from "@/components/annotation-toolbar";
import AnnotationInspector from "@/components/grading/AnnotationInspector";
import GradingHub from "@/components/grading/GradingHub";

// ✅ AI Grading
import AIGradingPanel from "@/components/grading/AIGradingPanel";
import BatchGradingDialog from "@/components/grading/BatchGradingDialog";
import { useAIGrading } from "@/hooks/use-ai-grading";
import { Sparkles } from "lucide-react";

type InstructorView =
  | "overview"
  | "students"
  | "grading"
  | "analytics"
  | "cases"
  | "collaboration"  // forums
  | "class"
  | "settings";

const VIEW_STORAGE_KEY = "instructor.activeView";
const INSTRUCTOR_NOTES_STORAGE_KEY = "instructor.overviewNotes";
const VALID_TABS: InstructorView[] = [
  "overview",
  "students",
  "grading",
  "analytics",
  "cases",
  "collaboration",
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
  caseImageUrl?: string;
  maxPoints?: number;
  studentId: string;
  studentName?: string;
  classId?: string;
  className?: string;
  year?: string;
  classroom?: string;

  status: SubmissionStatus;

  score?: number;
  feedback?: string;
  rubric?: any[];
  modelAnswers?: any[];
  answers?: Array<{ index: number; value: any }>;
  notes?: string;
  homeworkType?: "Q&A" | "Annotate";

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
  case_type?: string | null;
  homework_type?: string;
  homework_audience?: string | null;
  class_info?: { name?: string; year?: string };
  class_infos?: Array<{ name?: string; year?: string | null }>;
  visibility?: "public" | "private" | string | null;
};

type CaseCard = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  source: "db" | "mock";
  homeworkType?: "Q&A" | "Annotate";
  caseType?: string;
  homeworkAudience?: string;
  classInfo?: { name?: string; year?: string };
  classInfos?: Array<{ name?: string; year?: string | null }>;
  visibility?: "public" | "private";
  createdAt?: string;
};

type CaseSort = "newest" | "oldest" | "az" | "za";

// ===== Class types =====
type StudentLite = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  classroom?: string | null;
};

type AtRiskStudent = {
  studentId: string;
  studentName: string;
  email?: string | null;
  issue: string;
  score: number;
  trend: "declining" | "stable";
  lastActive: string;
  riskWeight: number;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "S";
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

// ===== Helpers: hook-safe components =====
function GroupCompareCard({ submission, studentName }: { submission: Submission; studentName: string }) {
  const caseObj = mockCases.find((c) => c.id === submission.caseId);
  const ann = useAnnotation(submission.caseId, submission.studentId);

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{studentName}</div>
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

function getHomeworkTypeColor(type: "Q&A" | "Annotate" = "Annotate") {
  switch (type) {
    case "Annotate":
      return "text-purple-700 dark:text-purple-300";
    case "Q&A":
      return "text-amber-700 dark:text-amber-300";
    default:
      return "text-muted-foreground";
  }
}

function getCaseTypeColor(caseType?: string) {
  switch (caseType?.toLowerCase()) {
    case "neurology":
      return "text-blue-700 dark:text-blue-300";
    case "pulmonology":
      return "text-green-700 dark:text-green-300";
    case "cardiology":
      return "text-red-700 dark:text-red-300";
    case "gastroenterology":
      return "text-orange-700 dark:text-orange-300";
    case "oncology":
      return "text-rose-700 dark:text-rose-300";
    case "radiology":
      return "text-indigo-700 dark:text-indigo-300";
    case "orthopedics":
      return "text-cyan-700 dark:text-cyan-300";
    default:
      return "text-muted-foreground";
  }
}

function OverviewMetricCard({
  title,
  value,
  detail,
  detailClassName,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  detail: string;
  detailClassName: string;
  icon: any;
}) {
  return (
    <Card className="rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-200">{title}</p>
          </div>
          <div className="rounded-full border border-slate-200 p-2 text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-8 text-4xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</div>
        <p className={`mt-3 text-sm ${detailClassName}`}>{detail}</p>
      </CardContent>
    </Card>
  );
}

export default function InstructorDashboard() {
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [studentNameMap, setStudentNameMap] = useState<Record<string, string>>({});

  // handle discussion prefill from outside events or query params
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('openDiscussion')) {
        const raw = sessionStorage.getItem('discussionPrefill');
        if (raw) {
          setDiscussionPrefill(JSON.parse(raw));
          setActiveView('collaboration');
          params.delete('openDiscussion');
          const qs = params.toString();
          const newPath = window.location.pathname + (qs ? `?${qs}` : '');
          window.history.replaceState({}, '', newPath);
        }
      }
    } catch (err) {
      console.error('Error reading discussion prefill', err);
    }

    const handler = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent)?.detail;
        const prefill = detail || JSON.parse(sessionStorage.getItem('discussionPrefill') || 'null');
        if (prefill) {
          setDiscussionPrefill(prefill);
          setActiveView('collaboration');
        }
      } catch (e) {
        console.error('discussion-prefill handler error', e);
      }
    };
    window.addEventListener('discussion-prefill', handler as EventListener);
    return () => window.removeEventListener('discussion-prefill', handler as EventListener);
  }, []);

  // periodically fetch online user count for header badge
  useEffect(() => {
    async function fetchOnlineUsers() {
      try {
        const res = await fetch(`${API_BASE}/api/admin/users`);
        if (!res.ok) throw new Error("Failed to load users");
        const data = await res.json();
        const online = data.filter((u: any) => u.online).length;
        setOnlineCount(online);

        const nextMap: Record<string, string> = {};
        for (const entry of Array.isArray(data) ? data : []) {
          const id = String(entry.user_id ?? entry.id ?? "").trim();
          if (!id) continue;
          const first = String(entry.firstName ?? entry.first_name ?? "").trim();
          const last = String(entry.lastName ?? entry.last_name ?? "").trim();
          const full = `${first} ${last}`.trim();
          if (full) nextMap[id] = full;
        }
        setStudentNameMap(nextMap);
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
  const [noteDraft, setNoteDraft] = useState("");
  const [instructorNotes, setInstructorNotes] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(INSTRUCTOR_NOTES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  });

  const [discussionPrefill, setDiscussionPrefill] = useState<null | { title?: string; message?: string; tags?: string[]; caseId?: string }>(null);

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
  const [caseFilterHomeworkType, setCaseFilterHomeworkType] = useState("");
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
    if (activeView === "overview") {
      loadClassrooms();
      loadAvailableStudents();
      loadCases();
    }
    if (activeView === "cases") loadCases();
    if (activeView === "class") {
      loadClassrooms();
      loadAvailableStudents();
    }
    if (activeView === "grading") {
      loadClassrooms();
      loadCases();
    }
    if (activeView === "analytics") {
      loadClassrooms();
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
      homeworkType: c.homework_type as "Q&A" | "Annotate" | undefined,
      caseType: c.case_type ?? undefined,
      homeworkAudience: c.homework_audience ?? undefined,
      classInfo: c.class_info,
      classInfos: c.class_infos ?? (c.class_info ? [c.class_info] : []),
      visibility: String(c.visibility || "public").toLowerCase() === "private" ? "private" : "public",
      createdAt: c.created_at,
    }));

    const demoCases: CaseCard[] = mockCases.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description ?? "No description",
      imageUrl: c.imageUrl,
      source: "mock",
      caseType: c.category,
      createdAt: undefined,
    }));

    return [...dbCases, ...demoCases];
  }, [casesFromApi]);

  const visibleCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase();

    let list = mergedCases;

    if (caseFilterHomeworkType) {
      list = list.filter((c) => c.homeworkType === caseFilterHomeworkType);
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
  }, [mergedCases, caseSearch, caseFilterHomeworkType, caseSort]);

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
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [mode, setMode] = useState<Mode>("one");
  const [query, setQuery] = useState("");
  const [activeIds, setActiveIds] = useState<string[]>([]);

  const [draftFeedback, setDraftFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // ✅ AI Grading
  const aiGrading = useAIGrading();
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [applyAiTrigger, setApplyAiTrigger] = useState(0);

  // ✅ Grading hub state
  const [gradingCaseId, setGradingCaseId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let list = submissions;

    if (gradingCaseId) {
      list = list.filter((s) => s.caseId === gradingCaseId);
    }

    return list.filter((s) => {
      const displayName = getStudentDisplayName(s.studentId).toLowerCase();
      return (
        displayName.includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.caseTitle.toLowerCase().includes(q)
      );
    });
  }, [query, submissions, gradingCaseId, studentNameMap, availableStudents, classroomStudents]);

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

  const overviewMetrics = useMemo(() => {
    const totalStudents =
      availableStudents.length || classrooms.reduce((sum, classroom) => sum + (classroom.members_count || 0), 0);
    const activeAssignments =
      new Set(submissions.map((submission) => submission.caseId)).size || casesFromApi.length || mergedCases.length;
    const pendingReviews = submissions.filter((submission) => submission.status !== "graded").length;
    const gradingInProgress = submissions.filter((submission) => submission.status === "grading").length;
    const gradedCount = submissions.filter((submission) => submission.status === "graded").length;
    const completionRate = submissions.length === 0 ? 0 : Math.round((gradedCount / submissions.length) * 100);

    return {
      totalStudents,
      activeAssignments,
      pendingReviews,
      gradingInProgress,
      gradedCount,
      completionRate,
    };
  }, [availableStudents.length, classrooms, submissions, casesFromApi.length, mergedCases.length]);

  const reviewQueue = useMemo(
    () => submissions.filter((submission) => submission.status !== "graded").slice(0, 5),
    [submissions]
  );

  const classSnapshot = useMemo(
    () => [...classrooms].sort((left, right) => right.members_count - left.members_count).slice(0, 4),
    [classrooms]
  );

  const assignmentMix = useMemo(() => {
    const annotateCount = mergedCases.filter((caseItem) => (caseItem.homeworkType || "Annotate") === "Annotate").length;
    const qaCount = mergedCases.filter((caseItem) => caseItem.homeworkType === "Q&A").length;
    const total = Math.max(overviewMetrics.activeAssignments || 1, 1);
    return [
      {
        label: "Annotate cases",
        value: annotateCount,
        progressValue: Math.min(100, (annotateCount / total) * 100),
      },
      {
        label: "Q&A cases",
        value: qaCount,
        progressValue: Math.min(100, (qaCount / total) * 100),
      },
      {
        label: "Average score",
        value: avgScore,
        progressValue: Math.min(100, Number(avgScore)),
      },
    ];
  }, [mergedCases, avgScore, overviewMetrics.activeAssignments]);

  const atRiskStudents = useMemo<AtRiskStudent[]>(() => {
    if (submissions.length === 0) return [];

    const byStudent = new Map<string, Submission[]>();
    for (const submission of submissions) {
      const list = byStudent.get(submission.studentId) ?? [];
      list.push(submission);
      byStudent.set(submission.studentId, list);
    }

    const now = Date.now();
    const dayMs = 1000 * 60 * 60 * 24;
    const lookbackMs = 21 * dayMs;

    const parseTs = (iso?: string) => {
      if (!iso) return 0;
      const ts = Date.parse(iso);
      return Number.isFinite(ts) ? ts : 0;
    };

    const humanizeLastActive = (ts: number) => {
      if (!ts) return "No recent activity";
      const days = Math.floor((now - ts) / dayMs);
      if (days <= 0) return "today";
      if (days === 1) return "1 day ago";
      return `${days} days ago`;
    };

    const alerts: AtRiskStudent[] = [];

    for (const [studentId, studentSubs] of byStudent.entries()) {
      const withScore = studentSubs.filter((item) => item.score != null);
      const avg = withScore.length
        ? Math.round((withScore.reduce((sum, item) => sum + Number(item.score ?? 0), 0) / withScore.length) * 10) / 10
        : 0;

      const pendingCount = studentSubs.filter((item) => item.status === "submitted" || item.status === "grading").length;
      const lastSubmissionTs = studentSubs.reduce((maxTs, item) => Math.max(maxTs, parseTs(item.updatedAt)), 0);
      const inactivityDays = lastSubmissionTs ? Math.floor((now - lastSubmissionTs) / dayMs) : 999;

      const recentScored = withScore
        .filter((item) => {
          const ts = parseTs(item.updatedAt);
          return ts && now - ts <= lookbackMs;
        })
        .sort((left, right) => parseTs(left.updatedAt) - parseTs(right.updatedAt));

      let trend: "declining" | "stable" = "stable";
      if (recentScored.length >= 2) {
        const first = Number(recentScored[0].score ?? avg);
        const last = Number(recentScored[recentScored.length - 1].score ?? avg);
        if (first - last >= 8) trend = "declining";
      }

      const issues: string[] = [];
      let riskWeight = 0;

      if (withScore.length > 0 && avg < 70) {
        issues.push(`Average score is low (${avg}%)`);
        riskWeight += 2;
      }
      if (trend === "declining") {
        issues.push("Recent performance trend is declining");
        riskWeight += 2;
      }
      if (pendingCount >= 3) {
        issues.push(`${pendingCount} submissions are still pending review`);
        riskWeight += 1;
      }
      if (inactivityDays >= 5) {
        issues.push(`No activity for ${inactivityDays} days`);
        riskWeight += 1;
      }

      if (issues.length === 0) continue;

      alerts.push({
        studentId,
        studentName: getStudentDisplayName(studentId),
        email: getStudentEmail(studentId),
        issue: issues[0],
        score: avg,
        trend,
        lastActive: humanizeLastActive(lastSubmissionTs),
        riskWeight,
      });
    }

    return alerts
      .sort((left, right) => {
        if (right.riskWeight !== left.riskWeight) return right.riskWeight - left.riskWeight;
        return left.score - right.score;
      })
      .slice(0, 6);
  }, [submissions, studentNameMap, availableStudents, classroomStudents]);

  const addInstructorNote = () => {
    const next = noteDraft.trim();
    if (!next) return;
    setInstructorNotes((prev) => [next, ...prev]);
    setNoteDraft("");
  };

  const deleteInstructorNote = (index: number) => {
    setInstructorNotes((prev) => prev.filter((_, noteIndex) => noteIndex !== index));
  };

  const selectedCaseId = selected?.caseId ?? "case-1";
  const selectedStudentId = selected?.studentId ?? "unknown";
  const selectedStudentName = selected ? getStudentDisplayName(selected.studentId) : "Unknown student";
  const selectedCase =
    mergedCases.find((c) => c.id === selectedCaseId) ??
    mockCases.find((c) => c.id === selectedCaseId);

  const selectedImageUrl =
    selected?.caseImageUrl ||
    selectedCase?.imageUrl ||
    "";

  const selectedAnn = useAnnotation(selectedCaseId, selectedStudentId);
  const selectedIsQnA = selected?.homeworkType === "Q&A";

  const selectedAnswerMap = useMemo(() => {
    const map = new Map<number, any>();
    for (const answer of selected?.answers ?? []) {
      if (typeof answer?.index === "number") {
        map.set(answer.index, answer.value);
      }
    }
    return map;
  }, [selected?.answers]);

  const selectedQnaQuestions = Array.isArray(selected?.modelAnswers) ? selected.modelAnswers : [];
  const selectedQnaHasEssay =
    selectedIsQnA && selectedQnaQuestions.some((question: any) => String(question?.type || "").toLowerCase() !== "mcq");
  const selectedQnaAllMcq = selectedIsQnA && selectedQnaQuestions.length > 0 && !selectedQnaHasEssay;

  const getMcqCorrectIndex = (question: any): number | null => {
    const candidate =
      question?.correctIndex ??
      question?.correct_index ??
      question?.correctOptionIndex ??
      question?.correct_option_index ??
      question?.answerIndex ??
      question?.answer_index;

    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;

    const direct = question?.correctAnswer ?? question?.correct_answer ?? question?.expectedAnswer ?? question?.expected_answer;
    if (typeof direct === "number" && Number.isFinite(direct)) return direct;

    if (typeof direct === "string" && Array.isArray(question?.options)) {
      const byText = question.options.findIndex((option: any) => String(option).trim().toLowerCase() === direct.trim().toLowerCase());
      if (byText >= 0) return byText;

      const asIndex = Number(direct);
      if (Number.isFinite(asIndex)) {
        if (asIndex >= 1 && asIndex <= question.options.length) return asIndex - 1;
        if (asIndex >= 0 && asIndex < question.options.length) return asIndex;
      }
    }

    return null;
  };

  const qnaAutoGradeSummary = useMemo(() => {
    if (!selectedQnaAllMcq) {
      return {
        totalPoints: 0,
        earnedPoints: 0,
        maxPoints: selected?.maxPoints || 100,
        computedScore: selected?.score ?? 0,
      };
    }

    const totalPoints = selectedQnaQuestions.reduce((sum: number, question: any) => sum + Number(question?.points || 0), 0);
    let earnedPoints = 0;

    selectedQnaQuestions.forEach((question: any, idx: number) => {
      const answerValue = selectedAnswerMap.get(Number(question?.index ?? idx));
      const selectedIndex = typeof answerValue === "string" ? Number(answerValue) : Number(answerValue);
      const correctIndex = getMcqCorrectIndex(question);

      if (Number.isFinite(selectedIndex) && correctIndex != null && selectedIndex === correctIndex) {
        earnedPoints += Number(question?.points || 0);
      }
    });

    const maxPoints = selected?.maxPoints || (totalPoints > 0 ? totalPoints : 100);
    const computedScore = totalPoints > 0
      ? Math.round(((earnedPoints / totalPoints) * maxPoints) * 10) / 10
      : (selected?.score ?? 0);

    return {
      totalPoints,
      earnedPoints,
      maxPoints,
      computedScore,
    };
  }, [selectedQnaAllMcq, selectedQnaQuestions, selectedAnswerMap, selected?.maxPoints, selected?.score]);

  const qnaAutoGradeBreakdown = useMemo(() => {
    if (!selectedQnaAllMcq) return [] as Array<{
      index: number;
      prompt: string;
      selectedLabel: string;
      correctLabel: string;
      isCorrect: boolean;
      points: number;
    }>;

    return selectedQnaQuestions.map((question: any, idx: number) => {
      const questionIndex = Number(question?.index ?? idx);
      const answerValue = selectedAnswerMap.get(questionIndex);
      const selectedIndex = Number(answerValue);
      const correctIndex = getMcqCorrectIndex(question);
      const options = Array.isArray(question?.options) ? question.options : [];

      const selectedLabel =
        Number.isFinite(selectedIndex) && selectedIndex >= 0 && selectedIndex < options.length
          ? String(options[selectedIndex])
          : "No answer";

      const correctLabel =
        correctIndex != null && correctIndex >= 0 && correctIndex < options.length
          ? String(options[correctIndex])
          : "Not configured";

      const isCorrect = Number.isFinite(selectedIndex) && correctIndex != null && selectedIndex === correctIndex;

      return {
        index: idx + 1,
        prompt: String(question?.prompt || ""),
        selectedLabel,
        correctLabel,
        isCorrect,
        points: Number(question?.points || 0),
      };
    });
  }, [selectedQnaAllMcq, selectedQnaQuestions, selectedAnswerMap]);

  const selectedSubmissionText = useMemo(() => {
    if (!selected) return "";
    if (!selectedIsQnA) return draftFeedback || selected.feedback || "";

    const lines = (selected.modelAnswers ?? []).map((question: any, idx: number) => {
      const answerValue = selectedAnswerMap.get(Number(question?.index ?? idx));
      const renderedAnswer =
        question?.type === "mcq" && Array.isArray(question?.options)
          ? question.options[Number(answerValue)] ?? String(answerValue ?? "")
          : String(answerValue ?? "");

      return `Q${idx + 1}: ${question?.prompt || ""}\nA: ${renderedAnswer}`;
    });

    if (selected.notes) {
      lines.push(`Additional notes: ${selected.notes}`);
    }

    return lines.join("\n\n").trim();
  }, [selected, selectedIsQnA, selectedAnswerMap, draftFeedback]);

  function getStudentDisplayName(studentId: string) {
    if (!studentId) return "Unknown student";
    if (studentNameMap[studentId]) return studentNameMap[studentId];

    const fromAvailable = availableStudents.find((student) => student.id === studentId);
    if (fromAvailable) {
      const full = `${fromAvailable.firstName ?? ""} ${fromAvailable.lastName ?? ""}`.trim();
      if (full) return full;
    }

    const fromClassroom = classroomStudents.find((student) => student.id === studentId);
    if (fromClassroom) {
      const full = `${fromClassroom.firstName ?? ""} ${fromClassroom.lastName ?? ""}`.trim();
      if (full) return full;
    }

    const fromSubmission = submissions.find((submission) => submission.studentId === studentId)?.studentName;
    return fromSubmission || studentId;
  }

  function getStudentEmail(studentId: string) {
    if (!studentId) return null;
    const fromAvailable = availableStudents.find((student) => student.id === studentId)?.email;
    if (fromAvailable) return fromAvailable;
    const fromClassroom = classroomStudents.find((student) => student.id === studentId)?.email;
    return fromClassroom ?? null;
  }



  useEffect(() => {
    setDraftFeedback(selected?.feedback ?? "");
  }, [selected?.id]);

  // ==== Effects ====
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, activeView);
  }, [activeView]);

  useEffect(() => {
    localStorage.setItem(INSTRUCTOR_NOTES_STORAGE_KEY, JSON.stringify(instructorNotes));
  }, [instructorNotes]);

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
    const noUser = !user;
    const wrongRole = user?.role !== undefined && user?.role !== "instructor";
    if (!isLoading && (noUser || wrongRole)) {
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
          caseImageUrl: s.case_image_url ?? "",
          maxPoints: Number(s.max_points) || 100,
          studentId: s.student_id,
          studentName: s.student_name ?? s.studentName ?? s.student_full_name ?? undefined,
          classId: s.class_id ?? undefined,
          className: s.class_name ?? undefined,
          year: s.year ?? undefined,
          classroom: s.classroom ?? undefined,
          status: (s.status as SubmissionStatus) ?? "submitted",
          score: s.score ?? undefined,
          feedback: s.feedback ?? "",
          rubric: s.rubric ?? [],
          modelAnswers: s.model_answers ?? [],
          answers: Array.isArray(s.answers) ? s.answers : [],
          notes: s.notes ?? "",
          homeworkType: (s.homework_type || "Annotate") as "Q&A" | "Annotate",
          published: Boolean(s.published),
          publishedAt: s.published_at ?? undefined,
          updatedAt: s.updated_at ?? "",
        }));

        setSubmissions(mapped);
      } catch (err) {
        console.error("Error loading submissions", err);
      }
    };
    load();
  }, []);

  // ==== API actions ====

  // ✅ UPDATED: saveDraft now supports rubric + updates updatedAt + keeps rubric in state
  const saveDraft = async (
    subId: string,
    score: number,
    rubric: { id: string; points: number; comment?: string }[] = []
  ) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/submissions/${encodeURIComponent(subId)}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          rubric, // ✅ keep rubric (not [])
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
      const nowIso = new Date().toISOString();

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === subId
            ? {
                ...s,
                score: data.score ?? score,
                status: "graded",
                feedback: data.feedback ?? draftFeedback,
                rubric: data.rubric ?? rubric,
                published: false,
                publishedAt: undefined,
                updatedAt: data.updated_at ?? nowIso,
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

      const data = await res.json();
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === subId
            ? {
                ...s,
                feedback: draftFeedback ?? s.feedback,
                updatedAt: data.updated_at ?? new Date().toISOString(),
              }
            : s
        )
      );

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
    { id: "grading", label: t("grading"), icon: ClipboardCheck },
    { id: "analytics", label: t("homeworkBuilder"), icon: LineChart },
    { id: "cases", label: t("caseManagement"), icon: FolderOpen },
    { id: "collaboration", label: "Forums", icon: MessageCircle },
    { id: "class", label: "Class", icon: Users },
  ];

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen silver-ambient" data-testid="instructor-dashboard">
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
                title="Open profile menu"
                aria-label="Open profile menu"
              >
                <Avatar size={32} className="border-2 border-primary" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu((v) => !v);
                }}
                className="text-sm font-medium hover:underline focus:outline-none"
                aria-haspopup="menu"
              >
                Dr. {user.lastName}
              </button>

              {showProfileMenu && (
                <div onClick={(e) => e.stopPropagation()}>
                  <ProfileMenu />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="group/sidebar w-16 hover:w-64 transition-all duration-300 bg-card border-r border-border self-stretch overflow-hidden hover:overflow-auto">
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

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <OverviewMetricCard
                  title="Total Students"
                  value={overviewMetrics.totalStudents}
                  detail={`${classrooms.length} classes currently active`}
                  detailClassName="text-emerald-600 dark:text-emerald-400"
                  icon={Users}
                />
                <OverviewMetricCard
                  title="Active Assignments"
                  value={overviewMetrics.activeAssignments}
                  detail={`${overviewMetrics.pendingReviews} pending reviews in queue`}
                  detailClassName="text-slate-500 dark:text-slate-400"
                  icon={ClipboardCheck}
                />
                <OverviewMetricCard
                  title="Pending Reviews"
                  value={overviewMetrics.pendingReviews}
                  detail={`${overviewMetrics.gradingInProgress} currently in grading`}
                  detailClassName="text-orange-600 dark:text-orange-400"
                  icon={MessageCircle}
                />
                <OverviewMetricCard
                  title="Completion Rate"
                  value={`${overviewMetrics.completionRate}%`}
                  detail={`${overviewMetrics.gradedCount} graded submissions so far`}
                  detailClassName="text-emerald-600 dark:text-emerald-400"
                  icon={LineChart}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                <Card className="xl:col-span-2 rounded-3xl border border-slate-300/70 bg-slate-100/80 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Review Queue</h3>
                      <Button variant="outline" size="sm" onClick={() => setActiveView("grading")}>
                        Open Grading Hub
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {reviewQueue.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-muted-foreground dark:border-slate-700">
                          No pending reviews right now.
                        </div>
                      ) : (
                        reviewQueue.map((submission) => (
                          <div
                            key={submission.id}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                          >
                            <div>
                              <p className="font-medium text-slate-900 dark:text-slate-100">{submission.caseTitle}</p>
                              <p className="text-sm text-muted-foreground">
                                {getStudentDisplayName(submission.studentId)}
                                {submission.classroom ? ` • ${submission.classroom}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${submission.status === "grading" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"}`}>
                                {submission.status}
                              </span>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setGradingCaseId(submission.caseId);
                                  setActiveIds([submission.id]);
                                  setMode("one");
                                  setActiveView("grading");
                                }}
                              >
                                Review
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-slate-300/70 bg-slate-100/80 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Quick Actions</h3>
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <Button className="justify-start" onClick={() => setActiveView("cases")}>
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Manage Cases
                      </Button>
                      <Button variant="outline" className="justify-start" onClick={() => setActiveView("class")}>
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Manage Classes
                      </Button>
                      <Button variant="outline" className="justify-start" onClick={() => setActiveView("grading")}>
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        Review Submissions
                      </Button>
                      <Button variant="outline" className="justify-start" onClick={() => setActiveView("collaboration")}>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Open Forums
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                <Card className="rounded-3xl border border-slate-300/70 bg-slate-100/80 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Class Snapshot</h3>
                      <Users className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="space-y-3">
                      {classSnapshot.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No classes available yet.</div>
                      ) : (
                        classSnapshot.map((classroom) => (
                          <div
                            key={classroom.id}
                            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50"
                          >
                            <div>
                              <p className="font-medium">{classroom.display}</p>
                              <p className="text-sm text-muted-foreground">{classroom.members_count} enrolled students</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setSelectedClassroomId(classroom.id);
                              setActiveView("class");
                            }}>
                              Open
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-slate-300/70 bg-slate-100/80 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Assignment Mix</h3>
                      <Presentation className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="space-y-4">
                      {assignmentMix.map((item) => (
                        <div key={item.label}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>{item.label}</span>
                            <span className="font-medium">{item.value}</span>
                          </div>
                          <Progress value={item.progressValue} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-slate-300/70 bg-slate-100/80 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Instructor Notes</h3>
                      <UserPlus className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                        <div className="flex gap-2">
                          <Textarea
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Add a short instructor note, reminder, or follow-up item..."
                            className="min-h-[88px] resize-none"
                          />
                          <Button className="shrink-0 self-start" onClick={addInstructorNote} title="Add instructor note">
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </div>
                      </div>
                      {instructorNotes.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-muted-foreground dark:border-slate-700">
                          No notes yet. Add reminders for grading, student follow-ups, or teaching adjustments here.
                        </div>
                      ) : (
                        instructorNotes.map((note, index) => (
                          <div
                            key={`${note}-${index}`}
                            className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60"
                          >
                            <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">{note}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => deleteInstructorNote(index)}
                              title="Delete note"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mb-8 rounded-3xl border border-slate-300/70 bg-slate-100/80 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                      At-Risk Student Alerts
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {atRiskStudents.length} students need attention
                    </span>
                  </div>

                  <div className="space-y-4">
                    {atRiskStudents.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-muted-foreground dark:border-slate-700">
                        No high-risk students detected from current live submission data.
                      </div>
                    )}
                    {atRiskStudents.map((student) => (
                      <div
                        key={student.studentId}
                        className="p-4 border border-red-500/30 rounded-2xl hover:bg-muted transition"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="h-12 w-12 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 flex items-center justify-center text-sm font-semibold">
                            {getInitials(student.studentName)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium">{student.studentName}</p>
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
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  disabled={!student.email}
                                  onClick={() => {
                                    if (!student.email) return;
                                    window.location.href = `mailto:${student.email}`;
                                  }}
                                >
                                  <Mail className="h-3 w-3 mr-1" />
                                  Contact
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                                  onClick={() => {
                                    setGradingCaseId(null);
                                    setMode("one");
                                    setActiveIds([]);
                                    setQuery(student.studentName);
                                    setActiveView("grading");
                                  }}
                                >
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
              {gradingCaseId === null ? (
                <GradingHub
                  submissions={submissions}
                  classrooms={classrooms}
                  onOpenCase={(caseId) => {
                    setGradingCaseId(caseId);
                    setActiveIds([]);
                    setQuery("");
                    setMode("one");
                  }}
                  onOpenCaseAtSubmission={(caseId, submissionId) => {
                    setGradingCaseId(caseId);
                    setActiveIds([submissionId]);
                    setQuery("");
                    setMode("one");
                  }}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setGradingCaseId(null);
                          setActiveIds([]);
                          setQuery("");
                        }}
                      >
                        ← Back to hub
                      </Button>
                      <h2 className="text-2xl font-bold">Grading</h2>
                    </div>

                    <div className="flex gap-2">
                      <Button variant={mode === "one" ? "default" : "secondary"} onClick={() => setMode("one")}>
                        1–1
                      </Button>
                      <Button variant={mode === "group" ? "default" : "secondary"} onClick={() => setMode("group")}>
                        Group
                      </Button>
                      <Button variant="outline" className="gap-2" onClick={() => setShowBatchDialog(true)}>
                        <Sparkles className="h-4 w-4" />
                        Batch AI Grade
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
                        {getStudentDisplayName(s.studentId)} — {s.caseTitle}{" "}
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

              {mode === "one" && selected && (
                <div className="grid md:grid-cols-3 gap-4">
                  {selectedIsQnA ? (
                    <Card className="md:col-span-2">
                      <CardContent className="p-0">
                        <div className="p-4 border-b">
                          <div className="text-sm text-muted-foreground">
                            {selectedStudentName} • {selected.caseTitle} • Q&A Submission
                          </div>
                          <div className="text-[12px] text-muted-foreground mt-1">
                            Grade by comparing each student answer with the question prompt and expected answer.
                          </div>
                        </div>

                        <div className="p-4 space-y-3 max-h-[720px] overflow-auto">
                          {(selected.modelAnswers ?? []).length === 0 ? (
                            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                              No Q&A questions found for this submission.
                            </div>
                          ) : (
                            (selected.modelAnswers ?? []).map((question: any, idx: number) => {
                              const answerValue = selectedAnswerMap.get(Number(question?.index ?? idx));
                              const points = Number(question?.points || 0);

                              return (
                                <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-medium">Question {idx + 1}</p>
                                      <p className="text-sm mt-1 whitespace-pre-wrap">{question?.prompt || ""}</p>
                                    </div>
                                    <Badge variant="secondary">{points} pts</Badge>
                                  </div>

                                  {question?.type === "mcq" && Array.isArray(question?.options) ? (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Options</p>
                                      {question.options.map((option: string, optionIndex: number) => (
                                        <div key={optionIndex} className="text-sm rounded-md border p-2">
                                          <span className="font-medium mr-2">{optionIndex + 1}.</span>
                                          <span>{option}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}

                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Student answer</p>
                                    <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                                      {question?.type === "mcq" && Array.isArray(question?.options)
                                        ? (question.options[Number(answerValue)] ?? (answerValue != null ? String(answerValue) : "No answer"))
                                        : (answerValue != null && String(answerValue).trim().length > 0 ? String(answerValue) : "No answer")}
                                    </div>
                                  </div>

                                  {(question?.expectedAnswer != null || (question?.type === "mcq" && typeof question?.correctIndex === "number")) && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Expected answer</p>
                                      <div className="rounded-md border bg-emerald-50 dark:bg-emerald-950/40 p-3 text-sm whitespace-pre-wrap">
                                        {question?.type === "mcq" && Array.isArray(question?.options) && typeof question?.correctIndex === "number"
                                          ? question.options[question.correctIndex] ?? `Option ${question.correctIndex + 1}`
                                          : String(question?.expectedAnswer ?? "")}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}

                          {selected.notes && (
                            <div className="rounded-lg border p-4 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Student additional notes</p>
                              <p className="text-sm whitespace-pre-wrap">{selected.notes}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="md:col-span-2">
                      <CardContent className="p-0">
                        <div className="p-4 border-b">
                          <div className="text-sm text-muted-foreground">
                            {selectedStudentName} • {selected.caseTitle}
                          </div>
                          <div className="text-[12px] text-muted-foreground mt-1">
                            Use toolbar to annotate • wheel/controls to zoom • select shapes to manage in list
                          </div>
                        </div>

                        <div className="px-4 pt-3">
                          <AnnotationToolbar annotation={selectedAnn} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 p-4">
                          <div className="min-h-[560px]">
                            <AnnotationCanvas
                              imageUrl={selectedImageUrl}
                              annotation={selectedAnn}
                              peerAnnotations={selectedAnn.peerAnnotations}
                            />
                          </div>

                          <div className="space-y-3">
                            <AnnotationInspector annotation={selectedAnn} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-3">
                    {selectedQnaAllMcq && (
                      <Card>
                        <CardContent className="p-4 space-y-2">
                          <h3 className="font-semibold">Q&A Auto Grading</h3>
                          <p className="text-xs text-muted-foreground">
                            This submission contains MCQ-only questions and is auto-graded. Manual rubric save is not required.
                          </p>
                          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                            <div className="flex items-center justify-between">
                              <span>Correct points</span>
                              <span className="font-medium">{qnaAutoGradeSummary.earnedPoints}/{qnaAutoGradeSummary.totalPoints || qnaAutoGradeSummary.maxPoints}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Computed score</span>
                              <span className="font-semibold">{qnaAutoGradeSummary.computedScore}/{qnaAutoGradeSummary.maxPoints}</span>
                            </div>
                          </div>

                          <div className="space-y-2 pt-1">
                            <p className="text-xs font-medium text-muted-foreground">Per-question result</p>
                            <div className="space-y-2 max-h-64 overflow-auto pr-1">
                              {qnaAutoGradeBreakdown.map((item) => (
                                <div key={`auto-q-${item.index}`} className="rounded-md border bg-card p-2 text-xs space-y-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium">Q{item.index}. {item.prompt || "Question"}</p>
                                    <span className={item.isCorrect ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                                      {item.isCorrect ? "Correct" : "Incorrect"}
                                    </span>
                                  </div>
                                  <p className="text-muted-foreground">Student: {item.selectedLabel}</p>
                                  <p className="text-muted-foreground">Expected: {item.correctLabel}</p>
                                  <p className="text-muted-foreground">Points: {item.isCorrect ? item.points : 0}/{item.points}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {!selectedQnaAllMcq && (
                      <>
                        {/* ✅ RubricPanel now saves rubric + comment */}
                        <RubricPanel
                          disabled={isSaving}
                          initialRubric={selected.rubric ?? []}
                          maxPoints={selected.maxPoints || 100}
                          lastSavedAt={selected.updatedAt}
                          onSubmit={(score: number, rubric: any[]) => saveDraft(selected.id, score, rubric)}
                          externalAiSuggestion={aiGrading.rubricSuggestion}
                          externalAiLoading={aiGrading.isAnalyzing}
                          applyAiTrigger={applyAiTrigger}
                          onRequestExternalAi={() => {
                            const rubricDef = buildDefaultCriteria(selected.maxPoints || 100).map((c) => ({
                              id: c.id,
                              title: c.title,
                              max: c.max,
                              levels: c.levels.map((l) => ({
                                key: l.key,
                                label: l.label,
                                points: l.points,
                                desc: l.desc,
                              })),
                            }));
                            aiGrading.analyzeSubmission(
                              selected.id,
                              selectedAnn.annotations ?? [],
                              selectedSubmissionText,
                              rubricDef,
                              selected.caseTitle
                            );
                          }}
                        />

                        {/* ✅ AI Grading Panel */}
                        <AIGradingPanel
                          isAnalyzing={aiGrading.isAnalyzing}
                          result={aiGrading.currentResult}
                          error={aiGrading.error}
                          disabled={isSaving}
                          onAnalyze={() => {
                            const rubricDef = buildDefaultCriteria().map((c) => ({
                              id: c.id,
                              title: c.title,
                              max: c.max,
                              levels: c.levels.map((l) => ({
                                key: l.key,
                                label: l.label,
                                points: l.points,
                                desc: l.desc,
                              })),
                            }));
                            aiGrading.analyzeSubmission(
                              selected.id,
                              selectedAnn.annotations ?? [],
                              selectedSubmissionText,
                              rubricDef,
                              selected.caseTitle
                            );
                          }}
                          onApplyScores={() => {
                            setApplyAiTrigger((n) => n + 1);
                          }}
                          onApplyFeedback={(feedback) => {
                            setDraftFeedback(feedback);
                          }}
                        />
                      </>
                    )}

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
                          {(!selectedIsQnA || selectedQnaHasEssay) && (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                const scoreToSave = selected.score ?? 0;
                                // ✅ don't wipe rubric on save
                                saveDraft(selected.id, scoreToSave, selected.rubric ?? []);
                              }}
                              disabled={isSaving}
                            >
                              {isSaving ? "Saving..." : "Save Draft"}
                            </Button>
                          )}

                          <Button
                            onClick={async () => {
                              if (selectedIsQnA && selectedQnaAllMcq && selected.status !== "graded") {
                                await saveDraft(selected.id, qnaAutoGradeSummary.computedScore, selected.rubric ?? []);
                              }
                              await publish(selected.id);
                            }}
                            disabled={isPublishing || ((!selectedQnaAllMcq && selected.status !== "graded") || selected.published)}
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
                    activeGroup.map((s) => (
                      <GroupCompareCard key={s.id} submission={s} studentName={getStudentDisplayName(s.studentId)} />
                    ))
                  )}
                </div>
              )}

              {/* ✅ Batch AI Grading Dialog */}
              <BatchGradingDialog
                open={showBatchDialog}
                onClose={() => setShowBatchDialog(false)}
                submissions={filtered.map((s) => ({
                  id: s.id,
                  caseTitle: s.caseTitle,
                  studentName: getStudentDisplayName(s.studentId),
                  status: s.status,
                  score: s.score,
                }))}
                batchJob={aiGrading.batchJob}
                onStartBatch={(ids) => {
                  const rubricDef = buildDefaultCriteria().map((c) => ({
                    id: c.id,
                    title: c.title,
                    max: c.max,
                    levels: c.levels.map((l) => ({
                      key: l.key,
                      label: l.label,
                      points: l.points,
                      desc: l.desc,
                    })),
                  }));
                  const subs = ids.map((id) => {
                    const sub = submissions.find((s) => s.id === id);
                    const caseObj = mergedCases.find((c) => c.id === sub?.caseId);
                    return {
                      id,
                      annotations: [],
                      studentAnswer: sub?.feedback,
                      caseTitle: sub?.caseTitle,
                      caseDescription: caseObj?.description,
                      imageUrl: sub?.caseImageUrl || caseObj?.imageUrl || undefined,
                      caseType: caseObj?.caseType,
                    };
                  });
                  aiGrading.startBatchGrading(subs, rubricDef);
                }}
                onCancelBatch={aiGrading.cancelBatchGrading}
                onApplyResult={(subId, result) => {
                  setSubmissions((prev) =>
                    prev.map((s) =>
                      s.id === subId
                        ? {
                            ...s,
                            score: result.totalScore,
                            status: "graded" as SubmissionStatus,
                            feedback: result.feedbackSuggestion,
                            updatedAt: new Date().toISOString(),
                          }
                        : s
                    )
                  );
                }}
                getBatchResult={aiGrading.getBatchResult}
              />
                </>
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
                classrooms={classrooms}
                stats={{
                  avgScore,
                  commonMistakes: ["Overlapping regions", "Incorrect boundary", "Missed edema area"],
                  skillGaps: ["Anatomical localization", "Contrast handling", "Annotation labeling"],
                }}
                onPublish={async (payload: any) => {
                  try {
                    // Map audience values: frontend sends "all"/"classroom", backend expects "All Students"/"Classrooms"
                    const audienceMap: Record<string, string> = {
                      "all": "All Students",
                      "classroom": "Classrooms"
                    };
                    const mappedAudience = audienceMap[payload.audience] || payload.audience;

                    const uploadImage = async (file: File, caseHint: string) => {
                      const formData = new FormData();
                      formData.append("file", file);

                      const uploadParams = new URLSearchParams({
                        caseId: caseHint || `temp-${Date.now()}`,
                        userId: user?.user_id || "",
                      });

                      const uploadRes = await fetch(`${API_BASE}/api/instructor/homeworks/upload?${uploadParams}`, {
                        method: "POST",
                        body: formData,
                      });

                      if (!uploadRes.ok) {
                        const txt = await uploadRes.text();
                        throw new Error(txt || "Image upload failed");
                      }

                      const uploadData = await uploadRes.json();
                      return uploadData.url || uploadData.filename || uploadData.path;
                    };

                    let imageUrl: string | undefined;
                    if (payload.newCase?.imageFile) {
                      imageUrl = await uploadImage(payload.newCase.imageFile, payload.newCase?.title || "temp");
                    }

                    const uploadedQuestions = await Promise.all(
                      (payload.questions || []).map(async (question: any) => {
                        if (question?.imageFile) {
                          const qUrl = await uploadImage(
                            question.imageFile,
                            `${payload.newCase?.title || "question"}-${Date.now()}`,
                          );
                          return {
                            ...question,
                            image_url: qUrl,
                            imageUrl: qUrl,
                            imageFile: undefined,
                            imagePreviewUrl: undefined,
                          };
                        }
                        return {
                          ...question,
                          image_url: question?.imageUrl || question?.image_url,
                          imageFile: undefined,
                          imagePreviewUrl: undefined,
                        };
                      })
                    );

                    // Build the homework payload with new simplified structure
                    const homeworkPayload = {
                      newCase: {
                        title: payload.newCase?.title,
                        description: payload.newCase?.description,
                        type: payload.newCase?.type,
                        imageFile: null, // Don't send the file object
                        imagePreviewUrl: imageUrl || payload.newCase?.imagePreviewUrl,
                      },
                      dueAtISO: payload.dueAtISO,
                      audience: mappedAudience,
                      visibility: payload.visibility || "public",
                      instructions: payload.instructions,
                      autoChecklist: payload.autoChecklist || [],
                      suggestedFocusTags: payload.suggestedFocusTags || [],
                      homeworkType: payload.homeworkType || "Q&A",
                      questions: uploadedQuestions,
                      password: payload.password || "",
                      classIds: payload.classIds || [],
                      classLabels: payload.classLabels || [],
                      maxPoints: payload.maxPoints || 100,
                    };

                    const res = await fetch(`${API_BASE}/api/instructor/homeworks`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(homeworkPayload),
                    });

                    if (!res.ok) {
                      const errorText = await res.text();
                      console.error("Failed to publish homework", errorText);
                      alert(`Failed to publish homework: ${res.status}`);
                      return;
                    }

                    const data = await res.json();
                    alert(`Homework published! Case: ${data.case_id}, Homework: ${data.homework_id}`);

                    setActiveView("cases");
                    await loadCases();
                  } catch (err) {
                    console.error("Error publishing homework", err);
                    alert(`Error publishing homework: ${err instanceof Error ? err.message : "Unknown error"}`);
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
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Input
                      placeholder="Search cases by title/description..."
                      value={caseSearch}
                      onChange={(e) => setCaseSearch(e.target.value)}
                    />

                    <select
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                      aria-label="Filter by homework type"
                      value={caseFilterHomeworkType}
                      onChange={(e) => setCaseFilterHomeworkType(e.target.value)}
                    >
                      <option value="">All Homework Types</option>
                      <option value="Annotate">Annotate</option>
                      <option value="Q&A">Q&A</option>
                    </select>

                    <select
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                      aria-label="Sort cases"
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
                      {caseFilterHomeworkType ? ` • Type: ${caseFilterHomeworkType}` : ""}
                      {caseSearch.trim() ? ` • Search: "${caseSearch.trim()}"` : ""}
                    </div>
                    <button
                      className="hover:underline"
                      onClick={() => {
                        setCaseSearch("");
                        setCaseFilterHomeworkType("");
                        setCaseSort("newest");
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </CardContent>
              </Card>

              {loadingCases ? (
                <div className="text-sm text-muted-foreground">Loading cases…</div>
              ) : visibleCases.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No matches. Try another keyword or reset filters.
                </div>
              ) : (
                (() => {
                  const renderCards = (cases: CaseCard[]) => (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {cases.map((c) => (
                        (() => {
                          const caseSubmissions = submissions.filter((s) => s.caseId === c.id);
                          const gradedSubmissions = caseSubmissions.filter((s) => s.score != null);
                          const avgScore = gradedSubmissions.length
                            ? gradedSubmissions.reduce((sum, s) => sum + Number(s.score ?? 0), 0) / gradedSubmissions.length
                            : null;
                          const questionsCount = caseSubmissions.reduce((max, s) => {
                            const count = Array.isArray(s.modelAnswers) ? s.modelAnswers.length : 0;
                            return Math.max(max, count);
                          }, 0);
                          const allKnownStudents = new Set(submissions.map((s) => s.studentId));
                          const submittersForCase = new Set(caseSubmissions.map((s) => s.studentId));
                          const notStartedCount = Math.max(allKnownStudents.size - submittersForCase.size, 0);

                          return (
                            <Card
                              key={`${c.source}-${c.id}`}
                              className="group border border-border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative h-full min-h-[360px]"
                              onClick={() => setLocation(`/annotation/${c.id}`)}
                            >
                              <div className="relative">
                                {(c.homeworkType !== "Q&A") && (
                                  <img
                                    src={c.imageUrl}
                                    alt={c.title}
                                    className="w-full h-44 object-cover bg-muted"
                                  />
                                )}
                              </div>

                              <CardContent className={`p-4 ${c.homeworkType === "Q&A" ? "h-full flex flex-col justify-between gap-3" : ""}`}>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <h3 className="font-semibold truncate">{c.title}</h3>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {c.source === "db" && (
                                      <button
                                        className="text-xs px-2 py-1 rounded-md border border-border text-foreground bg-white/90 hover:bg-white dark:bg-black/50 dark:hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteDbCase(c.id, c.title);
                                        }}
                                      >
                                        Delete
                                      </button>
                                    )}
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        c.homeworkType === "Q&A"
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                                          : "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200"
                                      }`}
                                    >
                                      {c.homeworkType || "Annotate"}
                                    </span>
                                  </div>
                                </div>
                                <p className={`text-sm text-muted-foreground ${c.homeworkType === "Q&A" ? "line-clamp-2" : "line-clamp-2 mb-3"}`}>
                                  {c.description}
                                </p>

                                {c.homeworkType === "Q&A" && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-lg border bg-muted/20 px-3 py-2">
                                      <div className="text-2xl font-semibold leading-none">{caseSubmissions.length}</div>
                                      <div className="text-xs text-muted-foreground mt-1">Submissions</div>
                                    </div>
                                    <div className="rounded-lg border bg-muted/20 px-3 py-2">
                                      <div className="text-2xl font-semibold leading-none">{avgScore != null ? `${Math.round(avgScore)}%` : "--"}</div>
                                      <div className="text-xs text-muted-foreground mt-1">Avg score</div>
                                    </div>
                                    <div className="rounded-lg border bg-muted/20 px-3 py-2">
                                      <div className="text-2xl font-semibold leading-none">{notStartedCount}</div>
                                      <div className="text-xs text-muted-foreground mt-1">Not started</div>
                                    </div>
                                    <div className="rounded-lg border bg-muted/20 px-3 py-2">
                                      <div className="text-2xl font-semibold leading-none">{questionsCount}</div>
                                      <div className="text-xs text-muted-foreground mt-1">Questions</div>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center gap-1 flex-wrap">
                                  {c.caseType && (
                                    <span className={`text-xs font-medium ${getCaseTypeColor(c.caseType)}`}>
                                      {c.caseType}
                                    </span>
                                  )}
                                  {c.visibility && (
                                    <span
                                      className={`text-xs px-2 py-1 rounded font-medium ${
                                        c.visibility === "private"
                                          ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100"
                                      }`}
                                    >
                                      {c.visibility === "private" ? "Private" : "Public"}
                                    </span>
                                  )}
                                  {c.homeworkAudience === "All Students" && (
                                    <span className="text-xs px-2 py-1 rounded font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
                                      All students
                                    </span>
                                  )}
                                  {(!c.classInfos || c.classInfos.length === 0) && c.classInfo && c.classInfo.name && (
                                    <span className="text-xs px-2 py-1 rounded font-medium bg-blue-100 text-blue-800">
                                      {c.classInfo.year ? `${c.classInfo.name} (${c.classInfo.year})` : c.classInfo.name}
                                    </span>
                                  )}
                                  {(c.classInfos ?? [])
                                    .filter((ci) => !!ci?.name)
                                    .map((ci, idx) => (
                                      <span
                                        key={`${ci.name}-${ci.year ?? ""}-${idx}`}
                                        className="text-xs px-2 py-1 rounded font-medium bg-blue-100 text-blue-800"
                                      >
                                        {ci.year ? `${ci.name} (${ci.year})` : ci.name}
                                      </span>
                                    ))}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })()
                      ))}
                    </div>
                  );

                  return renderCards(visibleCases);
                })()
              )}
            </div>
          )}

          {activeView === "collaboration" && (
            <div className="p-6" data-testid="view-collaboration">
              <DiscussionThread initialPost={discussionPrefill || undefined} />
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
