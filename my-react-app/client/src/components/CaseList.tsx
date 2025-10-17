import React, { useEffect, useState } from "react";
import type { CaseItem } from "@/types/collab";
import CaseCard from "./CaseCard";

export default function CaseList() {
  const [items, setItems] = useState<CaseItem[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch(`/api/cases?scope=my&search=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, [q]);

  return (
    <div className="space-y-3">
      <input
        className="w-full border rounded p-2"
        placeholder="Search my cases…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="grid gap-3">
        {items.map((c) => <CaseCard key={c.id} c={c} />)}
        {items.length === 0 && <div className="text-sm text-gray-500">No cases</div>}
      </div>
    </div>
  );
}
