import React, { useState } from "react";
import type { Version } from "@/types/collab";

export default function CompareToggle({
  peers, onChange,
}: { peers: Version[]; onChange: (peer?: Version, alpha?: number) => void }) {
  const [peerId, setPeerId] = useState<string>("");
  const [alpha, setAlpha] = useState<number>(0.4);

  const apply = (id: string, a: number) => onChange(peers.find(p => p.id === id), a);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Compare with</label>
      <select
        className="w-full border rounded p-2"
        value={peerId}
        onChange={(e) => { const id = e.target.value; setPeerId(id); apply(id, alpha); }}
      >
        <option value="">— None —</option>
        {peers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.authorName} • {new Date(p.createdAt).toLocaleString()}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <input type="range" min={0} max={1} step={0.05}
          value={alpha}
          onChange={(e) => { const a = Number(e.target.value); setAlpha(a); apply(peerId, a); }} />
        <span className="text-xs w-10">{Math.round(alpha * 100)}%</span>
      </div>
    </div>
  );
}
