import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import {
  Presentation,
  Gauge,
  GraduationCap,
  ClipboardCheck,
  ChartBar,
  FolderOpen,
  Settings,
  LogOut,
  Clock,
  ChartLine,
  Check,
  Edit,
} from "lucide-react";

type InstructorView = "overview" | "students" | "grading" | "analytics" | "cases" | "settings";

export default function InstructorDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<InstructorView>("overview");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!user || user.role !== "instructor") {
      setLocation("/login");
    }
  }, [user, setLocation]);

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

  return (
    <div className="min-h-screen bg-background" data-testid="instructor-dashboard">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Presentation className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold">Instructor Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full pulse-dot"></div>
              <span className="text-sm text-muted-foreground">15 students online</span>
            </div>
            <div className="flex items-center space-x-2">
              <img 
                src="https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40" 
                alt="Instructor Avatar" 
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm font-medium" data-testid="text-username">
                Dr. {user.lastName}
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
                  onClick={() => setActiveView(item.id as InstructorView)}
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
                <h2 className="text-2xl font-bold mb-2">Welcome, Dr. {user.lastName}!</h2>
                <p className="text-muted-foreground">Monitor student progress and provide feedback</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Students</p>
                        <p className="text-2xl font-bold text-primary" data-testid="stat-active-students">24</p>
                      </div>
                      <GraduationCap className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Reviews</p>
                        <p className="text-2xl font-bold text-orange-500" data-testid="stat-pending-reviews">8</p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Cases Assigned</p>
                        <p className="text-2xl font-bold text-green-500" data-testid="stat-cases-assigned">15</p>
                      </div>
                      <FolderOpen className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg. Score</p>
                        <p className="text-2xl font-bold text-accent" data-testid="stat-avg-score">87%</p>
                      </div>
                      <ChartLine className="h-8 w-8 text-accent" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Student Activity</h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-secondary">
                        <img 
                          src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40" 
                          alt="Sarah Chen" 
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1">
                          <p className="font-medium">Sarah Chen</p>
                          <p className="text-sm text-muted-foreground">Completed Brain MRI annotation</p>
                        </div>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">95%</span>
                      </div>
                      <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-secondary">
                        <img 
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40" 
                          alt="Mike Johnson" 
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1">
                          <p className="font-medium">Mike Johnson</p>
                          <p className="text-sm text-muted-foreground">Submitted Chest X-ray case</p>
                        </div>
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Pending</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Grading Queue</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">Cardiac CT - CAD Case</p>
                          <span className="text-xs text-muted-foreground">2 hours ago</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">3 students submitted</p>
                        <Button 
                          size="sm"
                          onClick={() => setActiveView("grading")}
                          data-testid="button-review-cardiac"
                        >
                          Review
                        </Button>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">Brain MRI - Stroke</p>
                          <span className="text-xs text-muted-foreground">5 hours ago</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">5 students submitted</p>
                        <Button 
                          size="sm"
                          onClick={() => setActiveView("grading")}
                          data-testid="button-review-brain"
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeView === "grading" && (
            <div className="p-6" data-testid="view-grading">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Student Work Review</h2>
                <div className="flex space-x-2">
                  <Button className="bg-green-500 text-white hover:bg-green-600" data-testid="button-approve">
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button className="bg-yellow-500 text-white hover:bg-yellow-600" data-testid="button-request-changes">
                    <Edit className="h-4 w-4 mr-2" />
                    Request Changes
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Sarah Chen - Brain MRI Annotation</h3>
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">In Review</span>
                      </div>
                      <div className="relative bg-gray-100 rounded-lg h-96 mb-4">
                        <img 
                          src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
                          alt="Brain MRI with annotations" 
                          className="w-full h-full object-cover rounded-lg"
                        />
                        {/* Mock annotation overlays */}
                        <div className="absolute top-1/4 left-1/3 w-16 h-16 border-2 border-red-500 rounded-full bg-red-500 bg-opacity-20"></div>
                        <div className="absolute top-1/2 right-1/4 w-12 h-8 border-2 border-blue-500 bg-blue-500 bg-opacity-20"></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Accuracy</p>
                          <p className="text-lg font-bold text-green-600" data-testid="accuracy-score">95%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Completeness</p>
                          <p className="text-lg font-bold text-blue-600" data-testid="completeness-score">88%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Time Taken</p>
                          <p className="text-lg font-bold text-orange-600" data-testid="time-taken">45 min</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-3">Feedback & Notes</h4>
                      <Textarea
                        placeholder="Enter your feedback here..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="h-32 resize-none"
                        data-testid="textarea-feedback"
                      />
                      <Button className="mt-3 w-full" data-testid="button-save-feedback">
                        Save Feedback
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-3">Grading Rubric</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Anatomical Accuracy</span>
                            <span>9/10</span>
                          </div>
                          <Progress value={90} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Annotation Quality</span>
                            <span>8/10</span>
                          </div>
                          <Progress value={80} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Clinical Reasoning</span>
                            <span>9/10</span>
                          </div>
                          <Progress value={90} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-3">Student Progress</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Cases Completed</span>
                          <span data-testid="student-cases-completed">12/15</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Average Score</span>
                          <span data-testid="student-avg-score">87%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Improvement</span>
                          <span className="text-green-600" data-testid="student-improvement">+5%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
