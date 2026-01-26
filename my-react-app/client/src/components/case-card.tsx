import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { MedicalCase } from "@shared/schema";

interface CaseCardProps {
  case: MedicalCase;
  onClick: () => void;
}

export default function CaseCard({ case: medicalCase, onClick }: CaseCardProps) {
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

  return (
    <Card 
      className="border border-border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
      data-testid={`case-card-${medicalCase.id}`}
    >
      <img 
        src={medicalCase.imageUrl} 
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

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                if (isCreating) return;
                if (!user || !user.user_id) {
                  toast({ title: "Not signed in", description: "Please sign in to create a discussion.", variant: 'destructive' });
                  return;
                }

                const prefill = {
                  title: medicalCase.title,
                  message: medicalCase.description || "",
                  tags: [medicalCase.category].filter(Boolean),
                  caseId: medicalCase.id,
                };
                try {
                  sessionStorage.setItem("discussionPrefill", JSON.stringify(prefill));
                  try {
                    window.dispatchEvent(new CustomEvent('discussion-prefill', { detail: prefill }));
                  } catch (e) {}
                  setLocation("/student");
                } catch (err) {
                  console.error("Could not open discussion prefill", err);
                  toast({ title: 'Error', description: 'Unable to open discussion composer', variant: 'destructive' });
                }
              }}
            >
              Create Discussion
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
