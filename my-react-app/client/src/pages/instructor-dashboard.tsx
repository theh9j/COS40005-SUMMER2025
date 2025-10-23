import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import ProfileMenu from "@/components/profile-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useAuth, useHeartbeat } from "@/hooks/use-auth";
import { mockAtRiskStudents } from "@/lib/mock-data";
import UploadModal from "@/components/upload-modal";
import { mockCases } from "@/lib/mock-data";
import {
  Presentation, Gauge, GraduationCap, ClipboardCheck, ChartBar,
  FolderOpen, Settings, LogOut, Clock, ChartLine, Check, Edit, Upload, AlertTriangle, TrendingDown, Mail
} from "lucide-react";

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

export default function InstructorDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout, isLoading } = useAuth();
  useHeartbeat(user?.user_id);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeView, setActiveView] = useState<InstructorView>(() => {
    const saved = (localStorage.getItem(VIEW_STORAGE_KEY) || "") as InstructorView;
    return VALID_TABS.includes(saved) ? saved : "overview";
  });
  const [feedback, setFeedback] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    console.log("Current user in dashboard:", user);
    if (!isLoading && (!user || user.role !== "instructor")) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

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

  if (isLoading) return <div>Loading...</div>;
  if (!user) return null;

  const navItems = [
    { id: "overview", label: "Overview", icon: Gauge },
    { id: "students", label: "Student Work", icon: GraduationCap },
    { id: "grading", label: "Grading", icon: ClipboardCheck },
    { id: "analytics", label: "Analytics", icon: ChartBar },
    { id: "cases", label: "Case Management", icon: FolderOpen },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const exportClassAnalyticsCSV = () => {
    const classRows = [
      ["Student", "Cases Completed", "Avg Score (%)", "Accuracy (%)", "Time Spent (min)"],
      ["Sarah Chen", "12", "91", "95", "540"],
      ["Mike Johnson", "9", "83", "88", "420"],
      ["Aisha Rahman", "15", "92", "93", "600"],
      ["David Tran", "11", "85", "86", "505"],
    ];
    const csv = classRows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `class_analytics_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            <h1 className="text-xl font-semibold">Instructor Dashboard</h1>
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
              <span className="text-sm font-medium">Dr. {user.lastName}</span>
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
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border sticky top-16 h-[calc(100vh-4rem)] overflow-auto">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === (item.id as InstructorView);
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary text-foreground"
                  }`}
                  onClick={() => setActiveView(item.id as InstructorView)}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto">
          {/* Overview, Grading, Analytics... */}
          {activeView === "overview" && (
            <div className="p-6" data-testid="view-overview">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Welcome, Dr. {user.lastName}!</h2>
                <p className="text-muted-foreground">Monitor student progress and provide feedback</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active Students</p><p className="text-2xl font-bold text-primary" data-testid="stat-active-students">24</p></div><GraduationCap className="h-8 w-8 text-primary" /></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pending Reviews</p><p className="text-2xl font-bold text-orange-500" data-testid="stat-pending-reviews">8</p></div><Clock className="h-8 w-8 text-orange-500" /></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Cases Assigned</p><p className="text-2xl font-bold text-green-500" data-testid="stat-cases-assigned">15</p></div><FolderOpen className="h-8 w-8 text-green-500" /></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Avg. Score</p><p className="text-2xl font-bold text-accent" data-testid="stat-avg-score">87%</p></div><ChartLine className="h-8 w-8 text-accent" /></div></CardContent></Card>
              </div>

              <Card className="mb-8">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                      At-Risk Student Alerts
                    </h3>
                    <span className="text-sm text-muted-foreground">{mockAtRiskStudents.length} students need attention</span>
                  </div>
                  <div className="space-y-4">
                    {mockAtRiskStudents.map((student) => (
                      <div key={student.id} className="p-4 border border-red-200 bg-red-50 rounded-lg">
                        <div className="flex items-start space-x-4">
                          <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-full" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium">{student.name}</p>
                              <div className="flex items-center space-x-2">
                                {student.trend === 'declining' && (
                                  <span className="flex items-center text-xs text-red-600">
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                    Declining
                                  </span>
                                )}
                                <span className="text-sm font-semibold text-red-600">Score: {student.score}%</span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{student.issue}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Last active: {student.lastActive}</span>
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
          {/* ———————————————————————————— */}

          {/* CASE MANAGEMENT VIEW */}
          {activeView === "cases" && (
            <div className="p-6 space-y-6" data-testid="view-cases">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Case Management</h2>
                <Button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-primary text-primary-foreground hover:opacity-90"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Case
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockCases.map((case_) => (
                  <Card
                    key={case_.id}
                    className="border border-border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setLocation(`/annotation/${case_.id}`)}
                  >
                    <img
                      src={case_.imageUrl}
                      alt={case_.title}
                      className="w-full h-48 object-cover"
                    />
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">{case_.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {case_.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {case_.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          12 annotations
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <UploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
