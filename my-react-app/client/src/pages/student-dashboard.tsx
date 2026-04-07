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
import { mockCases } from "@/lib/mock-data";
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

const API_BASE = "http://127.0.0.1:8000";

type CaseFromApi = {
  case_id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  created_at?: string | null;
  case_type?: string | null;
  homework_type?: "Q&A" | "Annotate" | null;
  homework_audience?: string | null;
  visibility?: "public" | "private" | null;
};

type RemoteHomeworkMeta = {
  homeworkId?: string;
  assigned: boolean;
  dueAt?: string;
  closed: boolean;
  homeworkType?: "Q&A" | "Annotate";
  totalQuestions?: number;
};

const daysLeft = (iso?: string) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};


type StudentView = "overview" | "cases" | "annotations" | "collaboration" | "progress" | "settings";
type CaseLibrarySort = "newest" | "oldest" | "az" | "za";

type SubmissionRecord = {
  id: string;
  homework_id: string;
  case_id: string;
  case_title: string;
  student_id: string;
  status: "none" | "submitted" | "grading" | "graded";
  score?: number;
  max_points?: number;
  published?: boolean;
  published_at?: string;
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
    if (activeView === "cases" || activeView === "annotations" || activeView === "overview") {
      loadCases();
    }
  }, [activeView]);

  useEffect(() => {
    if (!["annotations", "overview", "cases"].includes(activeView) || !user?.user_id) return;

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
                  homeworkId: hw?._id || hw?.homework_id || hw?.homeworkId || hw?.id,
                  assigned: Boolean(data?.assigned),
                  dueAt: hw?.due_at,
                  closed: hw ? hw.status !== "active" : false,
                  homeworkType: hw?.homework_type,
                  totalQuestions:
                    Number(data?.qna?.total_questions) ||
                    (Array.isArray(data?.qna?.questions) ? data.qna.questions.length : undefined),
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

  const getHomeworkType = (caseItem: { id: string; homeworkType?: "Q&A" | "Annotate" | null }) =>
    remoteHomeworkByCase[caseItem.id]?.homeworkType || caseItem.homeworkType || "Annotate";

  const allCases = useMemo(() => {
    return casesFromApi
      .filter((c) => String(c.visibility || "public").toLowerCase() !== "private")
      .map((c) => ({
        id: c.case_id,
        title: c.title,
        description: c.description || "No description",
        category: c.case_type || "General",
        imageUrl: c.image_url || "",
        createdBy: null,
        createdAt: c.created_at ? new Date(c.created_at) : null,
        homeworkType: c.homework_type || undefined,
        homeworkAudience: c.homework_audience || undefined,
      }));
  }, [casesFromApi]);

  const caseLibraryCases = useMemo(() => {
    const dbCases = allCases.filter((c) => c.homeworkAudience !== "Classrooms");

    const placeholderCases = mockCases
      .filter((m) => !dbCases.some((d) => d.id === m.id))
      .map((m) => ({
        ...m,
        // Keep placeholders at the bottom when sorting by newest.
        createdAt: new Date("1970-01-01T00:00:00.000Z"),
      }));

    return [...dbCases, ...placeholderCases];
  }, [allCases]);

  const assignedCases = useMemo(() => {
    return allCases.filter((c) => remoteHomeworkByCase[c.id]?.assigned);
  }, [allCases, remoteHomeworkByCase]);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [caseLibraryFilter, setCaseLibraryFilter] = useState<"all" | "Annotate" | "Q&A">("all");
  const [caseLibrarySearch, setCaseLibrarySearch] = useState("");
  const [caseLibrarySort, setCaseLibrarySort] = useState<CaseLibrarySort>("newest");
  const [myHomeworkFilter, setMyHomeworkFilter] = useState<"all" | "Annotate" | "Q&A">("all");
  const [myHomeworkSearch, setMyHomeworkSearch] = useState("");
  const [myHomeworkSort, setMyHomeworkSort] = useState<CaseLibrarySort>("newest");
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [studentSubmissions, setStudentSubmissions] = useState<SubmissionRecord[]>([]);
  const [forumContributionCount, setForumContributionCount] = useState<number>(0);

  const submissionByCase = useMemo(() => {
    const map: Record<string, SubmissionRecord> = {};
    for (const submission of studentSubmissions) {
      const current = map[submission.case_id];
      const currentTs = new Date(current?.updated_at ?? current?.created_at ?? 0).getTime();
      const nextTs = new Date(submission.updated_at ?? submission.created_at ?? 0).getTime();
      if (!current || nextTs >= currentTs) {
        map[submission.case_id] = submission;
      }
    }
    return map;
  }, [studentSubmissions]);

  const getCurrentSubmissionForCase = (caseId: string) => {
    const currentHomeworkId = remoteHomeworkByCase[caseId]?.homeworkId;

    const scoped = currentHomeworkId
      ? studentSubmissions.filter((s) => s.case_id === caseId && s.homework_id === currentHomeworkId)
      : studentSubmissions.filter((s) => s.case_id === caseId);

    if (scoped.length === 0) return undefined;

    return scoped.reduce((latest, next) => {
      const latestTs = new Date(latest.updated_at ?? latest.created_at ?? 0).getTime();
      const nextTs = new Date(next.updated_at ?? next.created_at ?? 0).getTime();
      return nextTs >= latestTs ? next : latest;
    });
  };

  const getStudentQnAStats = (caseId: string) => {
    const currentHomeworkId = remoteHomeworkByCase[caseId]?.homeworkId;
    const caseSubmissions = currentHomeworkId
      ? studentSubmissions.filter((s) => s.case_id === caseId && s.homework_id === currentHomeworkId)
      : studentSubmissions.filter((s) => s.case_id === caseId);
    const currentSubmission = getCurrentSubmissionForCase(caseId);
    const gradedScores = caseSubmissions
      .filter((s) => s.status === "graded" && s.score != null)
      .map((s) => Number(s.score));
    const bestScore = gradedScores.length > 0 ? Math.max(...gradedScores) : null;

    return {
      attempts: caseSubmissions.length,
      bestScorePct: bestScore,
      latestStatus: currentSubmission?.status ?? "none",
      latestScore: currentSubmission?.score ?? null,
      latestMaxPoints: currentSubmission?.max_points ?? null,
      questions: remoteHomeworkByCase[caseId]?.totalQuestions ?? 0,
    };
  };

  const upcomingHomework = useMemo(() => {
    return caseLibraryCases
      .filter((caseItem) => {
        const hw = remoteHomeworkByCase[caseItem.id];
        return hw?.assigned && !hw.closed;
      })
      .map((caseItem) => ({
        id: caseItem.id,
        title: caseItem.title,
        category: caseItem.category,
        dueAt: remoteHomeworkByCase[caseItem.id]?.dueAt,
      }))
      .sort((left, right) => {
        const l = new Date(left.dueAt ?? "9999-12-31").getTime();
        const r = new Date(right.dueAt ?? "9999-12-31").getTime();
        return l - r;
      })
      .slice(0, 4);
  }, [caseLibraryCases, remoteHomeworkByCase]);

  const recentFeedbackItems = useMemo(() => {
    return studentSubmissions
      .filter((submission) => Boolean(submission.feedback || submission.notes))
      .sort((left, right) => {
        const l = new Date(left.updated_at ?? left.created_at ?? 0).getTime();
        const r = new Date(right.updated_at ?? right.created_at ?? 0).getTime();
        return r - l;
      })
      .slice(0, 4);
  }, [studentSubmissions]);

  const performanceTrend = useMemo(() => {
    const graded = studentSubmissions
      .filter((submission) => submission.status === "graded" && submission.score != null)
      .sort((left, right) => {
        const l = new Date(left.updated_at ?? left.created_at ?? 0).getTime();
        const r = new Date(right.updated_at ?? right.created_at ?? 0).getTime();
        return l - r;
      })
      .slice(-8);

    if (graded.length === 0) {
      return [{ point: "Start", score: 0 }];
    }

    return graded.map((submission, index) => ({
      point: `S${index + 1}`,
      score: Number(submission.score ?? 0),
    }));
  }, [studentSubmissions]);

  const overviewMetrics = useMemo(() => {
    const assignedCount = Object.values(remoteHomeworkByCase).filter((hw) => hw.assigned).length;
    const pendingReviews = studentSubmissions.filter((submission) => submission.status === "submitted" || submission.status === "grading").length;
    const graded = studentSubmissions.filter((submission) => submission.status === "graded").length;
    const completionRate = assignedCount === 0 ? 0 : Math.round((graded / assignedCount) * 100);

    return {
      assignedCount,
      pendingReviews,
      graded,
      completionRate,
    };
  }, [remoteHomeworkByCase, studentSubmissions]);

  const caseLibraryVisibleCases = useMemo(() => {
    const q = caseLibrarySearch.trim().toLowerCase();

    let list = caseLibraryCases;
    if (caseLibraryFilter !== "all") {
      list = list.filter((c) => {
        const hwType = getHomeworkType(c as any);
        return hwType === caseLibraryFilter;
      });
    }

    if (q) {
      list = list.filter((c) => {
        const hwType = getHomeworkType(c as any);
        const haystack = `${c.title} ${c.description} ${c.category} ${hwType}`.toLowerCase();
        return haystack.includes(q);
      });
    }

    const parseTime = (s?: string | null) => {
      if (!s) return 0;
      const t = Date.parse(s);
      return Number.isFinite(t) ? t : 0;
    };

    return [...list].sort((a, b) => {
      if (caseLibrarySort === "az") return a.title.localeCompare(b.title);
      if (caseLibrarySort === "za") return b.title.localeCompare(a.title);

      const ta = parseTime(a.createdAt as string | null | undefined);
      const tb = parseTime(b.createdAt as string | null | undefined);
      if (caseLibrarySort === "oldest") return ta - tb;
      return tb - ta;
    });
  }, [caseLibraryCases, caseLibraryFilter, caseLibrarySearch, caseLibrarySort]);

  const myHomeworkVisibleCases = useMemo(() => {
    const q = myHomeworkSearch.trim().toLowerCase();
    const assigned = assignedCases;

    let list = assigned;
    if (myHomeworkFilter !== "all") {
      list = list.filter((c) => {
        const hwType = getHomeworkType(c as any);
        return hwType === myHomeworkFilter;
      });
    }

    if (q) {
      list = list.filter((c) => {
        const hwType = getHomeworkType(c as any);
        const haystack = `${c.title} ${c.description} ${c.category} ${hwType}`.toLowerCase();
        return haystack.includes(q);
      });
    }

    const parseTime = (s?: string | null) => {
      if (!s) return 0;
      const t = Date.parse(s);
      return Number.isFinite(t) ? t : 0;
    };

    return [...list].sort((a, b) => {
      if (myHomeworkSort === "az") return a.title.localeCompare(b.title);
      if (myHomeworkSort === "za") return b.title.localeCompare(a.title);

      const ta = parseTime(a.createdAt as string | null | undefined);
      const tb = parseTime(b.createdAt as string | null | undefined);
      if (myHomeworkSort === "oldest") return ta - tb;
      return tb - ta;
    });
  }, [caseLibraryCases, remoteHomeworkByCase, myHomeworkFilter, myHomeworkSearch, myHomeworkSort]);

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

  useEffect(() => {
    const loadProgress = async () => {
      if (!user?.user_id) return;
      try {
        setStatsError(null);
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
        setStatsError("Unable to refresh live progress data right now. Showing the latest loaded values.");
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

  const liveProgressSnapshot = useMemo(() => {
    const totalSubmissions = studentSubmissions.length;
    const gradedCount = studentSubmissions.filter((entry) => entry.status === "graded").length;
    const pendingCount = studentSubmissions.filter((entry) => entry.status === "submitted" || entry.status === "grading").length;
    const gradedWithScore = studentSubmissions.filter((entry) => entry.status === "graded" && entry.score != null);
    const averageScore = gradedWithScore.length
      ? Math.round((gradedWithScore.reduce((sum, entry) => sum + Number(entry.score ?? 0), 0) / gradedWithScore.length) * 10) / 10
      : 0;
    const lastUpdatedAt = studentSubmissions
      .map((entry) => new Date(entry.updated_at ?? entry.created_at ?? 0).getTime())
      .filter((ts) => Number.isFinite(ts) && ts > 0)
      .sort((left, right) => right - left)[0];

    return {
      totalSubmissions,
      gradedCount,
      pendingCount,
      averageScore,
      lastUpdatedLabel: lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : "No submissions yet",
    };
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

  const dashboardBoxClass = "rounded-3xl border border-slate-300/70 bg-slate-100/80 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70";
  const instructorMetricBoxClass = "rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950";

  const StatCard = ({
    label,
    value,
    icon: Icon,
    valueClass = "",
    testId,
  }: {
    label: string; value: string | number; icon: any; valueClass?: string; testId: string;
  }) => (
    <Card className={dashboardBoxClass}>
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
    <div className="min-h-screen silver-ambient" data-testid="student-dashboard">
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

      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside
          className="group/sidebar w-16 hover:w-64 transition-all duration-300 bg-card border-r border-border self-stretch overflow-hidden hover:overflow-auto"
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

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <Card className={instructorMetricBoxClass}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <p className="text-lg font-medium text-slate-700 dark:text-slate-200">Assigned Homework</p>
                      <FolderOpen className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="mt-8 text-4xl font-bold tracking-tight">{overviewMetrics.assignedCount}</p>
                    <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{upcomingHomework.length} active due items</p>
                  </CardContent>
                </Card>

                <Card className={instructorMetricBoxClass}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <p className="text-lg font-medium text-slate-700 dark:text-slate-200">Pending Reviews</p>
                      <MessageCircle className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="mt-8 text-4xl font-bold tracking-tight">{overviewMetrics.pendingReviews}</p>
                    <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">Waiting for instructor feedback</p>
                  </CardContent>
                </Card>

                <Card className={instructorMetricBoxClass}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <p className="text-lg font-medium text-slate-700 dark:text-slate-200">Completion Rate</p>
                      <CheckCircle className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="mt-8 text-4xl font-bold tracking-tight">{overviewMetrics.completionRate}%</p>
                    <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{overviewMetrics.graded} graded submissions</p>
                  </CardContent>
                </Card>

                <Card className={instructorMetricBoxClass}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <p className="text-lg font-medium text-slate-700 dark:text-slate-200">Average Score</p>
                      <ChartLine className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="mt-8 text-4xl font-bold tracking-tight">{Math.round(stats.annotationAccuracyPct)}%</p>
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Based on graded work</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                <Card className={`xl:col-span-2 ${dashboardBoxClass}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Upcoming Homework</h3>
                      <Button variant="outline" size="sm" onClick={() => setActiveView("annotations")}>Open My Homework</Button>
                    </div>
                    <div className="space-y-3">
                      {upcomingHomework.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-muted-foreground dark:border-slate-700">
                          No active homework deadlines right now.
                        </div>
                      ) : (
                        upcomingHomework.map((item) => {
                          const dl = Math.max(0, daysLeft(item.dueAt) ?? 0);
                          return (
                            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium">{item.title}</p>
                                  <p className="text-sm text-muted-foreground">{item.category}</p>
                                </div>
                                <Badge variant={dl <= 2 ? "destructive" : "secondary"}>Due in {dl} days</Badge>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className={dashboardBoxClass}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Quick Actions</h3>
                      <Flame className="h-4 w-4 text-primary" />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <Button className="justify-start" onClick={() => setActiveView("annotations")}>My Homework</Button>
                      <Button variant="outline" className="justify-start" onClick={() => setActiveView("cases")}>Case Library</Button>
                      <Button variant="outline" className="justify-start" onClick={() => setActiveView("progress")}>Progress Analytics</Button>
                      <Button variant="outline" className="justify-start" onClick={() => setActiveView("collaboration")}>Open Forums</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className={dashboardBoxClass}>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Performance Trend</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={performanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="point" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className={dashboardBoxClass}>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Activity & Feedback</h3>
                    <div className="space-y-3">
                      {recentActivities.slice(0, 3).map((item, index) => (
                        <div key={`act-${index}`} className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-900/60">
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="text-muted-foreground">{item.detail}</p>
                          <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
                        </div>
                      ))}
                      {recentFeedbackItems.length > 0 && (
                        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm">
                          <p className="font-medium">Latest Instructor Note</p>
                          <p className="text-muted-foreground mt-1">
                            {recentFeedbackItems[0]?.feedback || recentFeedbackItems[0]?.notes}
                          </p>
                        </div>
                      )}
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
              ) : myHomeworkVisibleCases.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No assigned homework right now.
                </div>
              ) : (
                <>
                  <Card className="mb-6">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Search homework by title/description..."
                          value={myHomeworkSearch}
                          onChange={(e) => setMyHomeworkSearch(e.target.value)}
                          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                        />
                        <select
                          value={myHomeworkFilter}
                          onChange={(e) => setMyHomeworkFilter(e.target.value as "all" | "Annotate" | "Q&A")}
                          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                          title="Filter my homework by type"
                        >
                          <option value="all">All Homework Types</option>
                          <option value="Annotate">Annotate</option>
                          <option value="Q&A">Q&amp;A</option>
                        </select>
                        <select
                          value={myHomeworkSort}
                          onChange={(e) => setMyHomeworkSort(e.target.value as CaseLibrarySort)}
                          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                          title="Sort my homework"
                        >
                          <option value="newest">Sort: Newest</option>
                          <option value="oldest">Sort: Oldest</option>
                          <option value="az">Sort: A → Z</option>
                          <option value="za">Sort: Z → A</option>
                        </select>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <div>
                          Showing <span className="font-medium">{myHomeworkVisibleCases.length}</span> homework
                          {myHomeworkFilter !== "all" ? ` • Type: ${myHomeworkFilter}` : ""}
                          {myHomeworkSearch.trim() ? ` • Search: "${myHomeworkSearch.trim()}"` : ""}
                        </div>
                        <button
                          className="hover:underline"
                          onClick={() => {
                            setMyHomeworkSearch("");
                            setMyHomeworkFilter("all");
                            setMyHomeworkSort("newest");
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    </CardContent>
                  </Card>

                  {(() => {
                    const renderGrid = (cases: typeof myHomeworkVisibleCases) => (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                        {cases.map((annot) => {
                          const hw = remoteHomeworkByCase[annot.id];
                          const submission = getCurrentSubmissionForCase(annot.id);
                          const dl = hw?.dueAt ? Math.max(0, daysLeft(hw.dueAt) ?? 0) : null;

                          return (
                            <div key={annot.id} className="space-y-2">
                              <CaseCard
                                case={annot as any}
                                onClick={() => setLocation(`/annotation/${annot.id}`)}
                                homework={hw?.dueAt ? { dueAt: hw.dueAt, closed: hw.closed } : undefined}
                                daysLeft={dl ?? undefined}
                                homeworkType={getHomeworkType(annot as any)}
                                qnaStats={getHomeworkType(annot as any) === "Q&A" ? getStudentQnAStats(annot.id) : undefined}
                              />
                              <div className="flex items-center px-1">
                                <div className="flex items-center gap-2">
                                  <Badge>{t("homework")}</Badge>
                                  {submission?.status === "submitted" && (
                                    <Badge variant="secondary">Submitted</Badge>
                                  )}
                                  {submission?.status === "grading" && (
                                    <Badge variant="outline">Under review</Badge>
                                  )}
                                  {submission?.status === "graded" && submission?.published && (
                                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-700 dark:text-emerald-50">
                                      Published Grade: {submission.score ?? 0}/{submission.max_points ?? 100}
                                    </Badge>
                                  )}
                                  {submission?.status === "graded" && (
                                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-700 dark:text-emerald-50">
                                      Marked: {submission.score ?? 0}/{submission.max_points ?? 100}
                                    </Badge>
                                  )}
                                  {hw?.closed && <Badge variant="destructive">{t("closed")}</Badge>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );

                    return renderGrid(myHomeworkVisibleCases);
                  })()}
                </>
              )}
            </div>
          )}


          {activeView === "cases" && (
            <div className="p-6" data-testid="view-cases">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{t("caseLibrary")}</h2>
              </div>

              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Search cases by title/description..."
                      value={caseLibrarySearch}
                      onChange={(e) => setCaseLibrarySearch(e.target.value)}
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    />
                    <select
                      value={caseLibraryFilter}
                      onChange={(e) => setCaseLibraryFilter(e.target.value as "all" | "Annotate" | "Q&A")}
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                      title="Filter by homework type"
                    >
                      <option value="all">All Homework Types</option>
                      <option value="Annotate">Annotate</option>
                      <option value="Q&A">Q&amp;A</option>
                    </select>
                    <select
                      value={caseLibrarySort}
                      onChange={(e) => setCaseLibrarySort(e.target.value as CaseLibrarySort)}
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                      title="Sort case library"
                    >
                      <option value="newest">Sort: Newest</option>
                      <option value="oldest">Sort: Oldest</option>
                      <option value="az">Sort: A → Z</option>
                      <option value="za">Sort: Z → A</option>
                    </select>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      Showing <span className="font-medium">{caseLibraryVisibleCases.length}</span> cases
                      {caseLibraryFilter !== "all" ? ` • Type: ${caseLibraryFilter}` : ""}
                      {caseLibrarySearch.trim() ? ` • Search: "${caseLibrarySearch.trim()}"` : ""}
                    </div>
                    <button
                      className="hover:underline"
                      onClick={() => {
                        setCaseLibrarySearch("");
                        setCaseLibraryFilter("all");
                        setCaseLibrarySort("newest");
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </CardContent>
              </Card>

              {caseLibraryVisibleCases.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matches. Try another keyword or reset filters.</p>
              ) : (
                (() => {
                  const renderGrid = (cases: typeof caseLibraryVisibleCases) => (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                      {cases.map((case_) => {
                        const hw = remoteHomeworkByCase[case_.id];
                        const submission = getCurrentSubmissionForCase(case_.id);
                        const dl = hw?.dueAt ? Math.max(0, daysLeft(hw.dueAt) ?? 0) : null;
                        const hwType = getHomeworkType(case_ as any);
                        return (
                          <div key={case_.id} className="space-y-2">
                            <CaseCard
                              case={case_ as any}
                              onClick={() => setLocation(`/annotation/${case_.id}`)}
                              homework={hw?.dueAt ? { dueAt: hw.dueAt, closed: hw.closed } : undefined}
                              daysLeft={dl ?? undefined}
                              homeworkType={hwType}
                              qnaStats={hwType === "Q&A" ? getStudentQnAStats(case_.id) : undefined}
                            />
                            <div className="flex items-center px-1">
                              <div className="flex items-center gap-2">
                                {hw?.assigned && <Badge>{t("homework")}</Badge>}
                                {submission?.status === "submitted" && (
                                  <Badge variant="secondary">Submitted</Badge>
                                )}
                                {submission?.status === "grading" && (
                                  <Badge variant="outline">Under review</Badge>
                                )}
                                {submission?.status === "graded" && (
                                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-700 dark:text-emerald-50">
                                    Marked: {submission?.score ?? 0}/{submission?.max_points ?? 100}
                                  </Badge>
                                )}
                                {hw?.assigned && hw?.closed && <Badge variant="destructive">{t("closed")}</Badge>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );

                  return renderGrid(caseLibraryVisibleCases);
                })()
              )}
            </div>
          )}

          {activeView === "progress" && stats && (
            <div className="p-6" data-testid="view-progress">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-2xl font-bold">{t("learningProgress")}</h2>
                  <p className="text-sm text-muted-foreground">Live update: {liveProgressSnapshot.lastUpdatedLabel}</p>
                </div>
                <Button onClick={exportStudentProgressCSV}>{t("exportCSV")}</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <Card className={dashboardBoxClass}>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Live submissions</p>
                    <p className="text-2xl font-bold mt-1">{liveProgressSnapshot.totalSubmissions}</p>
                  </CardContent>
                </Card>
                <Card className={dashboardBoxClass}>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Graded</p>
                    <p className="text-2xl font-bold mt-1">{liveProgressSnapshot.gradedCount}</p>
                  </CardContent>
                </Card>
                <Card className={dashboardBoxClass}>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending review</p>
                    <p className="text-2xl font-bold mt-1">{liveProgressSnapshot.pendingCount}</p>
                  </CardContent>
                </Card>
                <Card className={dashboardBoxClass}>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Average grade</p>
                    <p className="text-2xl font-bold mt-1">{liveProgressSnapshot.averageScore}%</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Cases Completed" value={stats.casesCompleted} icon={FolderOpen} testId="stat-cases-completed" />
                <StatCard label="Active Annotations" value={stats.activeAnnotations} icon={Edit} testId="stat-active-annotations" />
                <StatCard label="Study Streak" value={`${stats.studyStreakDays} days`} icon={Calendar} testId="stat-study-streak" />
                <StatCard label="Collaboration" value={`${stats.collaborationScorePct}%`} icon={Users} testId="stat-collaboration" />
              </div>

              <Card className={`${dashboardBoxClass} mb-6`}>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Live grading trend</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="point" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${dashboardBoxClass} mb-6`}>
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

              <Card className={`${dashboardBoxClass} mb-6`}>
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

              <Card className={dashboardBoxClass}>
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
