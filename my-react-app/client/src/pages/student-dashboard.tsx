// src/pages/student-dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import ProfileMenu from "@/components/profile-menu";
import Avatar from "@/components/Avatar";
import { useI18n } from "@/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth, useHeartbeat } from "@/hooks/use-auth";
import { mockCases, mockPerformanceData, mockUpcomingAssignments } from "@/lib/mock-data";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import CaseCard from "@/components/case-card";
import {
  UserRound, Gauge, FolderOpen, Edit, Users, ChartLine, Settings,
  CheckCircle, MessageCircle, Flame, LogOut, Calendar, AlertCircle
} from "lucide-react";

// discussion 
import DiscussionThread from "@/components/discussion/DiscussionThread";

// icon Assignments
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

const API_BASE = "http://127.0.0.1:8000";

type CaseFromApi = {
  case_id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  case_type?: string | null;
  homework_type?: "Q&A" | "Annotate" | null;
};

type RemoteHomeworkMeta = {
  assigned: boolean;
  dueAt?: string;
  closed: boolean;
  homeworkType?: "Q&A" | "Annotate";
};


// === Homework metadata 
type HomeworkMeta = { dueAt: string; closed: boolean };
const homeworkByCase: Record<string, HomeworkMeta> = {
  "case-1": { dueAt: new Date(Date.now() + 2 * 86400000).toISOString(), closed: false },
  "case-2": { dueAt: new Date(Date.now() + 5 * 86400000).toISOString(), closed: false },
  "case-3": { dueAt: new Date(Date.now() + 7 * 86400000).toISOString(), closed: true },
};

const homeworkTypeByCase: Record<string, "Q&A" | "Annotate"> = {
  "case-1": "Annotate",
  "case-2": "Annotate",
  "case-3": "Q&A",
};

// === Trạng thái bài nộp của riêng học sinh 
type MySubmissionStatus = { score?: number; status: "grading" | "graded" | "none" };
const mySubmissionByCase: Record<string, MySubmissionStatus> = {
  "case-1": { status: "grading" },          // đã nộp, đang chấm
  "case-2": { status: "none" },             // chưa nộp
  "case-3": { status: "graded", score: 9 }, // đã chấm
};

const daysLeft = (iso?: string) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

// === Danh sách "My Annotations" 
const myAnnotations = mockCases
  .filter(c => (mySubmissionByCase[c.id]?.status ?? "none") !== "none")
  .map(c => ({
    caseId: c.id,
    caseTitle: c.title,
    updatedAgo: "today",
  }));


type StudentView = "overview" | "cases" | "annotations" | "collaboration" | "progress" | "settings";

type SubmissionRecord = {
  id: string;
  homework_id: string;
  case_id: string;
  case_title: string;
  student_id: string;
  status: "none" | "submitted" | "grading" | "graded";
  score?: number;
  feedback?: string;
  notes?: string;
  updated_at?: string;
  created_at?: string;
};

type StudentStats = {
  casesCompleted: number;
  activeAnnotations: number;
  feedbackReceived: number;
  studyStreakDays: number;
  annotationAccuracyPct: number;
  completionRatePct: number;
  collaborationScorePct: number;
};

const VALID_TABS: StudentView[] = ["overview", "cases", "annotations", "collaboration", "progress", "settings"];
const VIEW_STORAGE_KEY = "student.activeView";

export default function StudentDashboard() {
  const { t } = useI18n();

  const [onlineCount, setOnlineCount] = useState<number>(0);

  useEffect(() => {
    async function fetchOnlineUsers() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/admin/users");
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

  const [location, setLocation] = useLocation();
  const { user, logout, isLoading } = useAuth();
  useHeartbeat(user?.user_id);

  // Persist the active sub-view so reloads restore it
  const [activeView, setActiveView] = useState<StudentView>(() => {
    const saved = (localStorage.getItem(VIEW_STORAGE_KEY) || "") as StudentView;
    return VALID_TABS.includes(saved) ? saved : "overview";
  });
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, activeView);
  }, [activeView]);

  const [casesFromApi, setCasesFromApi] = useState<CaseFromApi[]>([]);
  const [remoteHomeworkByCase, setRemoteHomeworkByCase] = useState<Record<string, RemoteHomeworkMeta>>({});
  const [loadingMyHomework, setLoadingMyHomework] = useState(false);

  const loadCases = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/instructor/cases`);
      if (!res.ok) {
        setCasesFromApi([]);
        return;
      }
      const data = await res.json();
      setCasesFromApi(Array.isArray(data) ? data : []);
    } catch {
      setCasesFromApi([]);
    }
  };

  useEffect(() => {
    if (activeView === "cases" || activeView === "annotations") {
      loadCases();
    }
  }, [activeView]);

  useEffect(() => {
    if (activeView !== "annotations" || !user?.user_id) return;

    let cancelled = false;

    const loadHomework = async () => {
      try {
        setLoadingMyHomework(true);

        if (casesFromApi.length === 0) {
          setRemoteHomeworkByCase({});
          return;
        }

        const entries = await Promise.all(
          casesFromApi.map(async (c) => {
            try {
              const res = await fetch(
                `${API_BASE}/api/instructor/homeworks/by-case?caseId=${encodeURIComponent(c.case_id)}&userId=${encodeURIComponent(user.user_id || "")}`
              );
              if (!res.ok) {
                return [c.case_id, { assigned: false, closed: false } as RemoteHomeworkMeta] as const;
              }

              const data = await res.json();
              const hw = data?.homework;
              return [
                c.case_id,
                {
                  assigned: Boolean(data?.assigned),
                  dueAt: hw?.due_at,
                  closed: hw ? hw.status !== "active" : false,
                  homeworkType: hw?.homework_type,
                } as RemoteHomeworkMeta,
              ] as const;
            } catch {
              return [c.case_id, { assigned: false, closed: false } as RemoteHomeworkMeta] as const;
            }
          })
        );

        if (!cancelled) {
          setRemoteHomeworkByCase(Object.fromEntries(entries));
        }
      } finally {
        if (!cancelled) setLoadingMyHomework(false);
      }
    };

    loadHomework();

    return () => {
      cancelled = true;
    };
  }, [activeView, casesFromApi, user?.user_id]);

  const caseLibraryCases = useMemo(() => {
    const dbCases = casesFromApi.map((c) => ({
      id: c.case_id,
      title: c.title,
      description: c.description || "No description",
      category: c.case_type || "General",
      imageUrl: c.image_url || "",
      createdBy: null,
      createdAt: null,
      homeworkType: c.homework_type || undefined,
    }));

    return [...dbCases, ...mockCases.filter((m) => !dbCases.some((d) => d.id === m.id))];
  }, [casesFromApi]);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [caseLibraryFilter, setCaseLibraryFilter] = useState<"all" | "Annotate" | "Q&A">("all");

  // Close profile menu on outside click or Escape
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

  // One source of truth for stats (cards + CSV both consume this)
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [studentSubmissions, setStudentSubmissions] = useState<SubmissionRecord[]>([]);
  const [forumContributionCount, setForumContributionCount] = useState<number>(0);

  useEffect(() => {
    const loadProgress = async () => {
      if (!user?.user_id) return;
      try {
        const submissionsRes = await fetch(`${API_BASE}/api/instructor/submissions`);
        if (!submissionsRes.ok) throw new Error("Submissions load failed");
        const rawSubmissions: SubmissionRecord[] = await submissionsRes.json();
        const mine = rawSubmissions.filter((sub) => sub.student_id === user.user_id);
        setStudentSubmissions(mine);

        const forumRes = await fetch(`${API_BASE}/forum`);
        if (forumRes.ok) {
          const threads = await forumRes.json();
          const contributions = (threads || []).filter((thread: any) => thread.author?.user_id === user.user_id).length;
          setForumContributionCount(contributions);
        }
      } catch (e) {
        console.warn("Unable to load live student progress", e);
      }
    };
    loadProgress();
  }, [user?.user_id]);

  useEffect(() => {
    const getDayKey = (iso?: string) => {
      if (!iso) return null;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return null;
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    };

    const computeStats = () => {
      const submissions = studentSubmissions;
      const totalCases = Math.max(caseLibraryCases.length, 1);
      const graded = submissions.filter((s) => s.status === "graded");
      const active = submissions.filter((s) => s.status === "submitted" || s.status === "grading");
      const daysWithActivity = new Set(
        submissions
          .map((s) => getDayKey(s.updated_at ?? s.created_at))
          .filter((d): d is string => Boolean(d))
      );

      let streak = 0;
      const today = new Date();
      while (true) {
        const dayKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
        if (!daysWithActivity.has(dayKey)) break;
        streak += 1;
        today.setDate(today.getDate() - 1);
      }

      const accuracy = graded.length
        ? Math.round(graded.reduce((acc, cur) => acc + (cur.score ?? 0), 0) / graded.length)
        : 75;

      const casesCompleted = new Set(graded.map((s) => s.case_id)).size;
      const completionRate = Math.min(100, Math.max(0, Math.round((casesCompleted / totalCases) * 100)));
      const collab = Math.min(100, 40 + forumContributionCount * 5 + Math.round((submissions.length / totalCases) * 50));

      setStats({
        casesCompleted,
        activeAnnotations: active.length,
        feedbackReceived: submissions.filter((s) => !!s.feedback || !!s.notes).length,
        studyStreakDays: streak,
        annotationAccuracyPct: accuracy,
        completionRatePct: completionRate,
        collaborationScorePct: collab,
      });
    };

    computeStats();
  }, [studentSubmissions, caseLibraryCases.length, forumContributionCount]);

  const recentActivities = useMemo(() => {
    return studentSubmissions
      .slice() // keep original as-is
      .sort((a, b) => {
        const aDate = new Date(a.updated_at ?? a.created_at ?? "").getTime();
        const bDate = new Date(b.updated_at ?? b.created_at ?? "").getTime();
        return bDate - aDate;
      })
      .slice(0, 5)
      .map((entry) => {
        const at = new Date(entry.updated_at ?? entry.created_at ?? Date.now());
        return {
          title:
            entry.status === "graded"
              ? `Graded: ${entry.case_title}`
              : entry.status === "submitted"
              ? `Submitted: ${entry.case_title}`
              : `In progress: ${entry.case_title}`,
          detail:
            entry.score != null
              ? `Score ${entry.score}%` // assuming 0-100
              : entry.feedback
              ? "Feedback available"
              : "Awaiting review",
          date: at.toLocaleString(),
        };
      });
  }, [studentSubmissions]);

  useEffect(() => {
    console.log("Current user in dashboard:", user);
    // guard: only redirect if we definitely know the user isn't a student
    // sometimes the token returned after an update may temporarily omit the
    // role field; the auth hook fixes that, but we don't want the UI to flip
    // out if `user.role` is undefined for a moment.
    const noUser = !user;
    const wrongRole = user?.role !== undefined && user?.role !== "student";
    if (!isLoading && (noUser || wrongRole)) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  const [discussionPrefill, setDiscussionPrefill] = useState<null | { title?: string; message?: string; tags?: string[]; caseId?: string }>(null);
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
  }, [location]);

  useEffect(() => {
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

  // Fetch from your API (fallback to mock if API missing/failed)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setStatsError(null);
        // Adjust the endpoint to your backend. Expect a shape compatible with StudentStats.
        const res = await fetch("/api/student/overview", { credentials: "include" });
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        const data = await res.json();

        // Defensive mapping to our local type (rename keys if your API differs)
        const next: StudentStats = {
          casesCompleted: Number(data?.casesCompleted ?? 0),
          activeAnnotations: Number(data?.activeAnnotations ?? 0),
          feedbackReceived: Number(data?.feedbackReceived ?? 0),
          studyStreakDays: Number(data?.studyStreakDays ?? 0),
          annotationAccuracyPct: Number(data?.annotationAccuracyPct ?? 0),
          completionRatePct: Number(data?.completionRatePct ?? 0),
          collaborationScorePct: Number(data?.collaborationScorePct ?? 0),
        };
        if (!cancelled) setStats(next);
      } catch (e) {
        // Fallback mock so the UI still works on dev
        if (!cancelled) {
          setStats({
            casesCompleted: 12,
            activeAnnotations: 8,
            feedbackReceived: 5,
            studyStreakDays: 21,
            annotationAccuracyPct: 85,
            completionRatePct: 92,
            collaborationScorePct: 78,
          });
        }
      }
    }
    load();

    return () => { cancelled = true; };
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (!user) return null;

  const navItems = [
    { id: "overview", label: "Overview", icon: Gauge },
    { id: "cases", label: "Case Library", icon: FolderOpen },
    { id: "annotations", label: "My Homework", icon: Edit },
    { id: "collaboration", label: "Forums", icon: Users },
    { id: "progress", label: "Progress", icon: ChartLine },
  ] as const;

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const exportStudentProgressCSV = () => {
    if (!stats) return;
    const rows = [
      ["Student", `${user.firstName} ${user.lastName}`],
      ["Email", user.email],
      [],
      ["Metric", "Value"],
      ["Cases Completed", String(stats.casesCompleted)],
      ["Active Annotations", String(stats.activeAnnotations)],
      ["Feedback Received", String(stats.feedbackReceived)],
      ["Study Streak (days)", String(stats.studyStreakDays)],
      ["Annotation Accuracy (%)", String(stats.annotationAccuracyPct)],
      ["Case Completion Rate (%)", String(stats.completionRatePct)],
      ["Collaboration Score (%)", String(stats.collaborationScorePct)],
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `progress_${user.lastName}_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const StatCard = ({
    label,
    value,
    icon: Icon,
    valueClass = "",
    testId,
  }: {
    label: string; value: string | number; icon: any; valueClass?: string; testId: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${valueClass}`} data-testid={testId}>
              {value}
            </p>
          </div>
          <Icon className={`h-8 w-8 ${valueClass || "text-primary"}`} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background" data-testid="student-dashboard">
      {/* Sticky Header */}
      <header className="bg-card border-b border-border px-6 h-16 flex items-center sticky top-0 z-40">
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => setLocation("/home")}
            className="flex items-center space-x-4 focus:outline-none hover:opacity-80 transition"
          >
            <UserRound className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold">{t("medicalImagingPlatform")}</h1>
          </button>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${onlineCount > 0 ? "bg-green-500" : "bg-gray-400"} animate-pulse`}></div>
              <span className="text-sm text-muted-foreground">
                {onlineCount} {onlineCount === 1 ? t("userOnline") : t("usersOnline")}
              </span>
            </div>

            {/* Avatar + Name + ProfileMenu */}
            <div className="flex items-center space-x-2 relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu((v) => !v);
                }}
                className="flex items-center space-x-2 focus:outline-none hover:opacity-80 transition"
                aria-haspopup="menu"
                aria-expanded={showProfileMenu}
              >
                <Avatar size={32} className="border-2 border-primary" />
                <span className="text-sm font-medium" data-testid="text-username">
                  {user.firstName} {user.lastName}
                </span>
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

      <div className="flex">
        <aside
          className="group/sidebar w-16 hover:w-64 transition-all duration-300 bg-card border-r border-border sticky top-16 h-[calc(100vh-4rem)] overflow-hidden hover:overflow-auto"
        >
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`w-full justify-start hover:bg-transparent ${isActive
                    ? "text-primary hover:text-primary"
                    : "text-foreground hover:text-foreground"
                    }`}
                  onClick={() => {
                    {
                      setActiveView(item.id);
                    }
                  }}
                  data-testid={`nav-${item.id}`}
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
          {statsError && (
            <div className="mx-6 mt-4 p-3 text-sm rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
              {statsError}
            </div>
          )}

          {activeView === "overview" && stats && (
            <div className="p-6" data-testid="view-overview">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Welcome back, {user.firstName}!</h2>
                <p className="text-muted-foreground">Continue your medical imaging studies</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard label="Cases Completed" value={stats.casesCompleted} icon={CheckCircle} valueClass="text-primary" testId="stat-cases-completed" />
                <StatCard label="Active Annotations" value={stats.activeAnnotations} icon={Edit} valueClass="text-accent" testId="stat-active-annotations" />
                <StatCard label="Feedback Received" value={stats.feedbackReceived} icon={MessageCircle} valueClass="text-yellow-500" testId="stat-feedback-received" />
                <StatCard label="Average Score" value={`${Math.round(stats.annotationAccuracyPct)}%`} icon={ChartLine} valueClass="text-accent" testId="stat-average-score" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Performance Trend</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={mockPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-sm text-muted-foreground mt-2">{t("yourPerformanceImproved")}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-primary" />
                      {t("upcomingAssignments")}
                    </h3>
                    <div className="space-y-3">
                      {mockUpcomingAssignments.map((assignment) => {
                        const daysUntilDue = Math.ceil((assignment.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        const isUrgent = daysUntilDue <= 2;
                        return (
                          <div key={assignment.id} className={`p-3 rounded-lg border ${isUrgent ? 'border-destructive/30 bg-destructive/10' : 'border-border bg-muted'}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{assignment.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">{assignment.category}</p>
                              </div>
                              {isUrgent && <AlertCircle className="h-4 w-4 text-red-500" />}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className={`text-xs px-2 py-1 rounded ${assignment.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {assignment.priority}
                              </span>
                              <span className="text-xs text-muted-foreground">Due in {daysUntilDue} days</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">{t("recentCases")}</h3>
                    <div className="space-y-4">
                      {mockCases.slice(0, 2).map((case_) => (
                        <div
                          key={case_.id}
                          className="flex items-center space-x-4 p-3 rounded-lg hover:bg-secondary cursor-pointer"
                          onClick={() => setLocation(`/annotation/${case_.id}`)}
                          data-testid={`recent-case-${case_.id}`}
                        >
                          <img src={case_.imageUrl} alt={case_.title} className="w-12 h-12 rounded object-cover" />
                          <div className="flex-1">
                            <p className="font-medium">{case_.title}</p>
                            <p className="text-sm text-muted-foreground">{t("lastReviewedHoursAgo")}</p>
                          </div>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{t("completed")}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">{t("recentFeedback")}</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-primary/10 rounded-lg border-l-4 border-primary hover:bg-secondary cursor-pointer">
                        <div className="flex items-start space-x-3">
                          <Avatar src="https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40" size={32} />
                          <div><p className="font-medium text-sm">Dr. Smith</p><p className="text-sm text-muted-foreground">Great work on identifying the lesion. Consider the surrounding tissue changes.</p></div>
                        </div>
                      </div>
                      <div className="p-4 bg-primary/10 rounded-lg border-l-4 border-primary hover:bg-secondary cursor-pointer">
                        <div className="flex items-start space-x-3">
                          <Avatar src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40" size={32} />
                          <div><p className="font-medium text-sm">Dr. Johnson</p><p className="text-sm text-muted-foreground">Excellent annotation accuracy. Your diagnostic skills are improving!</p></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeView === "collaboration" && (
            <div className="p-6" data-testid="view-collaboration">
              <DiscussionThread initialPost={discussionPrefill || undefined} />
            </div>
          )}

          {activeView === "annotations" && (
            <div className="p-6" data-testid="view-annotations">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">My Homework</h2>
              </div>

              {loadingMyHomework ? (
                <div className="text-sm text-muted-foreground">Loading homework...</div>
              ) : caseLibraryCases.filter((c) => remoteHomeworkByCase[c.id]?.assigned).length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No assigned homework right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {caseLibraryCases
                    .filter((c) => remoteHomeworkByCase[c.id]?.assigned)
                    .map((annot) => {
                    const hw = remoteHomeworkByCase[annot.id];
                    const dl = hw?.dueAt ? Math.max(0, daysLeft(hw.dueAt) ?? 0) : null;

                    return (
                      <div key={annot.id} className="space-y-2">
                        <CaseCard
                          case={annot}
                          onClick={() => setLocation(`/annotation/${annot.id}`)}
                          homeworkType={hw?.homeworkType}
                        />
                        <div className="flex items-center px-1">
                          <div className="flex items-center gap-2">
                            <Badge>{t("homework")}</Badge>
                            {hw?.closed ? (
                              <Badge variant="destructive">{t("closed")}</Badge>
                            ) : (
                              dl !== null && (
                                <Badge variant="secondary">{t("dueInDays").replace("{{days}}", String(dl))}</Badge>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}


          {activeView === "cases" && (
            <div className="p-6" data-testid="view-cases">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{t("caseLibrary")}</h2>
              </div>

              {/* Filter dropdown */}
              <div className="mb-6">
                <select
                  value={caseLibraryFilter}
                  onChange={(e) => setCaseLibraryFilter(e.target.value as "all" | "Annotate" | "Q&A")}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                  title="Filter by homework type"
                >
                  <option value="all">All Types</option>
                  <option value="Annotate">Annotate</option>
                  <option value="Q&A">Q&amp;A</option>
                </select>
              </div>

              {(() => {
                const renderGrid = (cases: typeof caseLibraryCases) => (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cases.map((case_) => {
                      const hw = homeworkByCase[case_.id];
                      const dl = hw ? Math.max(0, daysLeft(hw?.dueAt) ?? 0) : null;
                      const hwType = homeworkTypeByCase[case_.id] || (case_ as any).homeworkType;
                      return (
                        <div key={case_.id} className="space-y-2">
                          <CaseCard
                            case={case_}
                            onClick={() => setLocation(`/annotation/${case_.id}`)}
                            homeworkType={hwType}
                          />
                          <div className="flex items-center px-1">
                            <div className="flex items-center gap-2">
                              {hw && <Badge>{t("homework")}</Badge>}
                              {hw ? (
                                hw.closed ? (
                                  <Badge variant="destructive">{t("closed")}</Badge>
                                ) : (
                                  <Badge variant="secondary">{t("dueInDays").replace("{{days}}", String(dl))}</Badge>
                                )
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );

                const annotateCases = caseLibraryCases.filter((c) => {
                  const hwType = homeworkTypeByCase[c.id] || (c as any).homeworkType;
                  return !hwType || hwType === "Annotate";
                });
                const qaCases = caseLibraryCases.filter((c) => {
                  const hwType = homeworkTypeByCase[c.id] || (c as any).homeworkType;
                  return hwType === "Q&A";
                });

                if (caseLibraryFilter === "Annotate") {
                  return annotateCases.length === 0
                    ? <p className="text-sm text-muted-foreground">No Annotate cases.</p>
                    : renderGrid(annotateCases);
                }
                if (caseLibraryFilter === "Q&A") {
                  return qaCases.length === 0
                    ? <p className="text-sm text-muted-foreground">No Q&A cases.</p>
                    : renderGrid(qaCases);
                }

                // "all" — show sectioned
                return (
                  <div className="space-y-8">
                    {annotateCases.length > 0 && (
                      <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 p-5">
                        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-sm">Annotate</span>
                        </h3>
                        {renderGrid(annotateCases)}
                      </div>
                    )}
                    {qaCases.length > 0 && (
                      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-5">
                        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-sm">Q&amp;A</span>
                        </h3>
                        {renderGrid(qaCases)}
                      </div>
                    )}
                    {annotateCases.length === 0 && qaCases.length === 0 && (
                      <p className="text-sm text-muted-foreground">No cases available.</p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {activeView === "progress" && stats && (
            <div className="p-6" data-testid="view-progress">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-2xl font-bold">{t("learningProgress")}</h2>
                  <p className="text-sm text-muted-foreground">Updated {new Date().toLocaleString()}</p>
                </div>
                <Button onClick={exportStudentProgressCSV}>{t("exportCSV")}</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Cases Completed" value={stats.casesCompleted} icon={FolderOpen} testId="stat-cases-completed" />
                <StatCard label="Active Annotations" value={stats.activeAnnotations} icon={Edit} testId="stat-active-annotations" />
                <StatCard label="Study Streak" value={`${stats.studyStreakDays} days`} icon={Calendar} testId="stat-study-streak" />
                <StatCard label="Collaboration" value={`${stats.collaborationScorePct}%`} icon={Users} testId="stat-collaboration" />
              </div>

              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Performance Progress</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1"><span>Annotation Accuracy</span><span data-testid="accuracy-percentage">{stats.annotationAccuracyPct}%</span></div>
                      <Progress value={stats.annotationAccuracyPct} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1"><span>Case Completion</span><span data-testid="completion-percentage">{stats.completionRatePct}%</span></div>
                      <Progress value={stats.completionRatePct} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1"><span>Collaboration Impact</span><span data-testid="collaboration-percentage">{stats.collaborationScorePct}%</span></div>
                      <Progress value={stats.collaborationScorePct} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Recent activity</h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {recentActivities.length === 0 && <li>No activity yet. Start your first assignment to activate progress updates.</li>}
                    {recentActivities.map((item, index) => (
                      <li key={index} className="rounded-lg bg-slate-100 dark:bg-slate-800 p-3">
                        <div className="font-medium text-sm text-foreground">{item.title}</div>
                        <div>{item.detail}</div>
                        <small className="text-xs text-muted-foreground">{item.date}</small>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Milestones</h3>
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <div>🔥 {stats.casesCompleted >= 1 ? "First case complete" : "Complete your first case"}</div>
                    <div>🎯 {stats.completionRatePct >= 80 ? "On track for course mastery" : "Focus on finishing pending assessments"}</div>
                    <div>👥 {forumContributionCount >= 1 ? `${forumContributionCount} forum contributions` : "Engage in forums to increase collaboration score"}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {activeView === "settings" && (
            <div className="p-6 space-y-6" data-testid="view-settings">
              <h2 className="text-2xl font-bold mb-4">{t("accountSettings")}</h2>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("manageYourProfile")}</p>
                  </div>
                  <Button onClick={() => setLocation("/settings")} className="w-full">
                    {t("openSettingsPage")}
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
