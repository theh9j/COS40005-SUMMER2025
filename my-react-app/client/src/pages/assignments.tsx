import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Assignment = { id: string; title: string; dueAt: string; description?: string };

const mockAssignments: Assignment[] = [
  { id: "asg-1", title: "Homework 1: Basic Annotation", dueAt: new Date(Date.now()+86400000).toISOString(), description: "Annotate 3 findings." },
  { id: "asg-2", title: "Homework 2: Compare & Reflect", dueAt: new Date(Date.now()+3*86400000).toISOString(), description: "Compare with a peer and reflect." },
];

export default function AssignmentsPage() {
  const [items, setItems] = useState<Assignment[]>([]);
  useEffect(() => { setItems(mockAssignments); }, []);

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assignments</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map(a => (
          <Card key={a.id}>
            <CardContent className="p-6 space-y-2">
              <h3 className="text-lg font-semibold">{a.title}</h3>
              <p className="text-sm text-muted-foreground">Due: {new Date(a.dueAt).toLocaleString()}</p>
              {a.description && <p className="text-sm">{a.description}</p>}
              <div className="flex gap-2 pt-2">
                <Link href={`/assignments/${a.id}/submit`}><Button size="sm">Submit / Update</Button></Link>
                <Link href={`/assignments/${a.id}/review`}><Button size="sm" variant="secondary">Review (Teacher)</Button></Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
