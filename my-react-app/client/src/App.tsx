import React from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import StudentDashboard from "@/pages/student-dashboard";
import InstructorDashboard from "@/pages/instructor-dashboard";
import AnnotationView from "@/pages/annotation-view";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Home from "@/pages/home";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  [key: string]: any; 
}

function ProtectedRoute({ component: Component, ...rest }: ProtectedRouteProps) {
  const { user } = useAuth();

  // If an instructor is not approved, redirect them to the home page
  if (user?.role === "instructor" && user?.approval_status !== "approved") {
    // Allow access only to the home page
    if (rest.path !== "/" && rest.path !== "/home") {
      return <Redirect to="/home" />;
    }
  }

  return <Route {...rest} component={Component} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/home" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <ProtectedRoute path="/student" component={StudentDashboard} />
      <ProtectedRoute path="/instructor" component={InstructorDashboard} />
      <ProtectedRoute path="/annotation/:caseId" component={AnnotationView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;