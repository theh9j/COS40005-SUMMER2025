import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { MedicalCase } from "@shared/schema";

interface CaseCardProps {
  case: MedicalCase;
  onClick: () => void;
  homework?: { dueAt: string; closed: boolean };
  daysLeft?: number;
  homeworkType?: "Q&A" | "Annotate";
}

export default function CaseCard({ case: medicalCase, onClick, homework, daysLeft: daysLeftProp, homeworkType }: CaseCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = React.useState(false);
  const [location, setLocation] = useLocation();

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "neurology":
        return "bg-blue-100 text-blue-800";
      case "pulmonology":
        return "bg-green-100 text-green-800";
      case "cardiology":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getHomeworkTypeColor = (type: "Q&A" | "Annotate") => {
    switch (type) {
      case "Annotate":
        return "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200";
      case "Q&A":
        return "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const fallbackImage = homeworkType === "Q&A" ? "/images/default-qna-homework.svg" : "/images/default-annotation-homework.svg";

  return (
    <Card 
      className="border border-border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
      data-testid={`case-card-${medicalCase.id}`}
    >
      <img 
        src={medicalCase.imageUrl || fallbackImage} 
        alt={medicalCase.title}
        className="w-full h-48 object-cover"
      />
      <CardContent className="p-4">
        <h3 className="font-semibold mb-2">{medicalCase.title}</h3>
        <p className="text-sm text-muted-foreground mb-2">{medicalCase.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(medicalCase.category)}`}>
              {medicalCase.category}
            </span>
            <span className="text-xs text-muted-foreground">
              12 annotations
            </span>
          </div>
          {homeworkType && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${getHomeworkTypeColor(homeworkType)}`}>
              {homeworkType}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
