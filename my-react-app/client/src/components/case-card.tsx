import { Card, CardContent } from "@/components/ui/card";
import { MedicalCase } from "@shared/schema";

interface CaseCardProps {
  case: MedicalCase;
  onClick: () => void;
}

export default function CaseCard({ case: medicalCase, onClick }: CaseCardProps) {
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
          <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(medicalCase.category)}`}>
            {medicalCase.category}
          </span>
          <span className="text-xs text-muted-foreground">
            12 annotations
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
