import { useEffect, useState } from "react";
import type { Presence } from "@/types/collab";

export function usePresence(caseId: string, userId: string) {
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => {
    let active = true;

    async function tick() {
      try {
        // Heartbeat (backend có thể ghi nhận ai đang xem)
        await fetch(`/api/presence/${caseId}/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, status: "viewing" }),
        });
        const p: Presence = await fetch(`/api/presence/${caseId}`).then(r => r.json());
        if (active) setPresence(p);
      } catch {
        // fallback mock để FE vẫn test được
        if (active) {
          setPresence({
            caseId,
            users: [
              { id: userId, name: "You", role: "Student" },
              { id: "inst1", name: "Instructor A", role: "Instructor" },
            ],
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    tick();
    const t = setInterval(tick, 8000);
    return () => { active = false; clearInterval(t); };
  }, [caseId, userId]);

  return presence;
}
