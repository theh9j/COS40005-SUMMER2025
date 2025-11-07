import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Row = { id: string; title: string; max: number; points: number };

export default function RubricPanel({
  onSubmit,
}: {
  onSubmit: (total: number, rows: { id: string; points: number }[], feedback?: string) => void;
}) {
  const [rows, setRows] = useState<Row[]>([
    { id: "crit-1", title: "Correctness",  max: 5, points: 0 },
    { id: "crit-2", title: "Completeness", max: 3, points: 0 },
    { id: "crit-3", title: "Presentation", max: 2, points: 0 },
  ]);
  const [feedback, setFeedback] = useState("");
  const total = useMemo(() => rows.reduce((a,b)=>a+(b.points||0),0), [rows]);
  const max   = useMemo(() => rows.reduce((a,b)=>a+b.max,0), [rows]);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold">Rubric</h3>
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="flex items-center gap-2">
              <div className="flex-1 text-sm">{r.title} <span className="text-muted-foreground">(max {r.max})</span></div>
              <Input
                type="number"
                className="w-24"
                value={r.points}
                onChange={e => {
                  const v = Math.max(0, Math.min(r.max, Number(e.target.value)));
                  setRows(s => s.map(x => x.id === r.id ? { ...x, points: v } : x));
                }}
              />
            </div>
          ))}
        </div>
        <div className="text-sm">Total: <b>{total}</b> / {max}</div>
        <div>
          <label className="block text-sm font-medium mb-1">Feedback</label>
          <Textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Overall comments…" />
        </div>
        <Button onClick={() => onSubmit(total, rows.map(({id,points})=>({id,points})), feedback)}>
          Save grade
        </Button>
      </CardContent>
    </Card>
  );
}
