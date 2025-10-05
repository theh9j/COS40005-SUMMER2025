import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { mockCases } from "@/lib/mock-data";
import CaseCard from "@/components/case-card";
import UploadModal from "@/components/upload-modal";
import {
  UserRound,
  Gauge,
  FolderOpen,
  Edit,
  Users,
  ChartLine,
  Settings,
  CheckCircle,
  MessageCircle,
  Flame,
  LogOut,
  Upload,
  Trophy,
  Target,
  UsersRound,
} from "lucide-react";

type StudentView = "overview" | "cases" | "annotations" | "collaboration" | "progress" | "settings";

export default function StudentDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<StudentView>("overview");
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "student") {
      setLocation("/login");
    }
  }, [user, setLocation]);

  if (!user) return null;

  const navItems = [
    { id: "overview", label: "Overview", icon: Gauge },
    { id: "cases", label: "Case Library", icon: FolderOpen },
    { id: "annotations", label: "My Annotations", icon: Edit },
    { id: "collaboration", label: "Collaboration", icon: Users },
    { id: "progress", label: "Progress", icon: ChartLine },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background" data-testid="student-dashboard">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <UserRound className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold">Medical Imaging Platform</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full pulse-dot"></div>
              <span className="text-sm text-muted-foreground">3 users online</span>
            </div>
            <div className="flex items-center space-x-2">
              <img 
                src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40" 
                alt="Student Avatar" 
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm font-medium" data-testid="text-username">
                {user.firstName} {user.lastName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-secondary text-foreground"
                  }`}
                  onClick={() => setActiveView(item.id as StudentView)}
                  data-testid={`nav-${item.id}`}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {activeView === "overview" && (
            <div className="p-6" data-testid="view-overview">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Welcome back, {user.firstName}!</h2>
                <p className="text-muted-foreground">Continue your medical imaging studies</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Cases Completed</p>
                        <p className="text-2xl font-bold text-primary" data-testid="stat-cases-completed">12</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Annotations</p>
                        <p className="text-2xl font-bold text-accent" data-testid="stat-active-annotations">8</p>
                      </div>
                      <Edit className="h-8 w-8 text-accent" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Feedback Received</p>
                        <p className="text-2xl font-bold text-yellow-500" data-testid="stat-feedback-received">5</p>
                      </div>
                      <MessageCircle className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Study Streak</p>
                        <p className="text-2xl font-bold text-orange-500" data-testid="stat-study-streak">7 days</p>
                      </div>
                      <Flame className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Cases</h3>
                    <div className="space-y-4">
                      {mockCases.slice(0, 2).map((case_) => (
                        <div 
                          key={case_.id}
                          className="flex items-center space-x-4 p-3 rounded-lg hover:bg-secondary cursor-pointer"
                          onClick={() => setLocation(`/annotation/${case_.id}`)}
                          data-testid={`recent-case-${case_.id}`}
                        >
                          <img 
                            src={case_.imageUrl} 
                            alt={case_.title}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{case_.title}</p>
                            <p className="text-sm text-muted-foreground">Last reviewed 2 hours ago</p>
                          </div>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Completed
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Feedback</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <div className="flex items-start space-x-3">
                          <img 
                            src="https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40" 
                            alt="Dr. Smith" 
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <p className="font-medium text-sm">Dr. Smith</p>
                            <p className="text-sm text-muted-foreground">
                              Great work on identifying the lesion. Consider the surrounding tissue changes.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                        <div className="flex items-start space-x-3">
                          <img 
                            src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40" 
                            alt="Dr. Johnson" 
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <p className="font-medium text-sm">Dr. Johnson</p>
                            <p className="text-sm text-muted-foreground">
                              Excellent annotation accuracy. Your diagnostic skills are improving!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeView === "cases" && (
            <div className="p-6" data-testid="view-cases">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Case Library</h2>
                <Button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-primary text-primary-foreground hover:opacity-90"
                  data-testid="button-upload-case"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Case
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockCases.map((case_) => (
                  <CaseCard
                    key={case_.id}
                    case={case_}
                    onClick={() => setLocation(`/annotation/${case_.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {activeView === "progress" && (
            <div className="p-6" data-testid="view-progress">
              <h2 className="text-2xl font-bold mb-6">Learning Progress</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Overall Performance</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Annotation Accuracy</span>
                          <span data-testid="accuracy-percentage">85%</span>
                        </div>
                        <Progress value={85} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Case Completion Rate</span>
                          <span data-testid="completion-percentage">92%</span>
                        </div>
                        <Progress value={92} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Collaboration Score</span>
                          <span data-testid="collaboration-percentage">78%</span>
                        </div>
                        <Progress value={78} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Achievements</h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                        <div>
                          <p className="font-medium">Case Master</p>
                          <p className="text-sm text-muted-foreground">Completed 10 cases this week</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Target className="h-6 w-6 text-green-500" />
                        <div>
                          <p className="font-medium">Perfect Annotation</p>
                          <p className="text-sm text-muted-foreground">100% accuracy on stroke case</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <UsersRound className="h-6 w-6 text-blue-500" />
                        <div>
                          <p className="font-medium">Team Player</p>
                          <p className="text-sm text-muted-foreground">Helped 5 peers this month</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Study Timeline</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 p-3 border-l-4 border-green-500 bg-green-50">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Completed Brain MRI Case</p>
                        <p className="text-sm text-muted-foreground">2 hours ago - Score: 95%</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 p-3 border-l-4 border-blue-500 bg-blue-50">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                          <MessageCircle className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Received Feedback</p>
                        <p className="text-sm text-muted-foreground">4 hours ago - Dr. Smith reviewed your work</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />
    </div>
  );
}
