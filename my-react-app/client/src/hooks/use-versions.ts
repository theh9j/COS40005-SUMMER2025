import { useEffect, useState, useCallback } from "react";
import type { Version } from "@/types/collab";

export function useVersions(caseId: string) {
  const [mine, setMine] = useState<Version[]>([]);
  const [peers, setPeers] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Gọi API thật khi backend sẵn sàng
      const [vm, vp] = await Promise.all([
        fetch(`/api/cases/${caseId}/versions?scope=mine`).then(r => r.json()),
        fetch(`/api/cases/${caseId}/versions?scope=peers`).then(r => r.json()),
      ]);
      setMine(vm); setPeers(vp);
    } catch (e:any) {
      // fallback mock để FE vẫn test được
      console.warn("useVersions fallback mock:", e?.message);
      const now = new Date().toISOString();
      setMine([
        { id: "m1", caseId, authorId: "u1", authorName: "You", createdAt: now, data: { boxes: [], notes: "My v1" } },
      ]);
      setPeers([
        { id: "p1", caseId, authorId: "u2", authorName: "Student B", createdAt: now, data: { polygons: [], notes: "Peer v1" } },
      ]);
      setError(e?.message ?? null);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const create = useCallback(async (data: Version["data"]) => {
    // Ghi chú: thay bằng API thật
    try {
      await fetch(`/api/cases/${caseId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
    } catch {
      /* noop: mock */
    }
    await load();
  }, [caseId, load]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000); // polling để thấy bản của peers
    return () => clearInterval(t);
  }, [load]);

  return { mine, peers, loading, error, create, reload: load };
}

