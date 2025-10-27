import { useEffect, useState, useCallback } from "react";
import type { Version } from "@/types/collab";
import { useAuth } from "@/hooks/use-auth";

export function useVersions(caseId: string) {
  const [mine, setMine] = useState<Version[]>([]);
  const [peers, setPeers] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const load = useCallback(async () => {
    if (!user) return; 

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/version/${caseId}`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch versions: ${response.status} ${response.statusText}`,
        );
      }
      const allVersions: Version[] = await response.json();

      const myVersions: Version[] = [];
      const peerVersions: Version[] = [];

      allVersions.forEach((v) => {
        if (v.authorId === user?.user_id) {
          myVersions.push(v);
        } else {
          peerVersions.push(v);
        }
      });

      setMine(myVersions);
      setPeers(peerVersions);
    } catch (e: any) {
      console.error("useVersions load error:", e?.message);
      setError(
        e?.message ?? "An unknown error occurred while loading versions.",
      );
      setMine([]);
      setPeers([]);
    } finally {
      setLoading(false);
    }
  }, [caseId, user]); 

  const create = useCallback(
    async (data: Version["data"]) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/version/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data, caseId }),
        });

        if (!response.ok) {
          const errorText =
            (await response.text().catch(() => "Unknown error"));
          throw new Error(
            `Failed to create version: ${response.status} ${errorText}`,
          );
        }

        await load();
      } catch (e: any) {
        console.error("useVersions create error:", e?.message);
        setError(
          e?.message ??
            "An unknown error occurred while creating the version.",
        );
        setLoading(false);
      }
    },
    [caseId, load],
  );

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  return { mine, peers, loading, error, create, reload: load };
}