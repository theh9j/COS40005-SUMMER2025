import React from "react";
import type { Presence } from "@/types/collab";

export default function PresenceBar({ presence }: { presence: Presence | null }) {
  if (!presence) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-gray-600">
      <span className="font-medium">Online:</span>
      <div className="flex -space-x-2">
        {presence.users.map((u) => (
          <div key={u.id}
               title={`${u.name} (${u.role})`}
               className="w-6 h-6 rounded-full bg-gray-200 grid place-items-center border border-white text-[11px] font-semibold">
            {u.name[0]?.toUpperCase()}
          </div>
        ))}
      </div>
      <span className="ml-auto">
        Updated {new Date(presence.updatedAt).toLocaleTimeString()}
      </span>
    </div>
  );
}
