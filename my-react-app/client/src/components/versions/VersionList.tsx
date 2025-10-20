import React from "react";
import type { Version } from "@/types/collab";

export default function VersionList({
  title, items, onSelect,
}: { title: string; items: Version[]; onSelect: (v: Version) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">{title}</h4>
        <span className="text-xs text-gray-500">{items.length}</span>
      </div>
      <div className="space-y-1">
        {items.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelect(v)}
            className="w-full text-left border rounded px-2 py-1 hover:bg-gray-50"
          >
            <div className="text-sm font-medium">{v.authorName}</div>
            <div className="text-xs text-gray-500">
              {new Date(v.createdAt).toLocaleString()}
            </div>
          </button>
        ))}
        {items.length === 0 && <div className="text-xs text-gray-500">No versions</div>}
      </div>
    </div>
  );
}
