import React from "react";
import type { CaseItem } from "@/types/collab";
import { Link } from "wouter";

export default function CaseCard({ c }: { c: CaseItem }) {
  return (
    <div className="border rounded p-3 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{c.title}</div>
        <span className="text-xs text-gray-500">{c.modality}</span>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Owner: {c.ownerName} • Updated {new Date(c.updatedAt).toLocaleString()}
      </div>
      <Link href={`/annotation/${c.id}`}>
        <a className="inline-block mt-2 text-sm underline">Open</a>
      </Link>
    </div>
  );
}
