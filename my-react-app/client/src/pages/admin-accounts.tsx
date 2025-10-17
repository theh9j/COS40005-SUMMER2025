import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useHeartbeat } from "@/hooks/use-auth";
import { Search, ShieldCheck, UserCog, UserX, RefreshCw, CheckCircle2, XCircle, UserPlus2 } from "lucide-react";

type Role = "student" | "instructor" | "admin";

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  instructorVerified?: boolean | null;
  active: boolean;
};

const ROLE_OPTIONS: Role[] = ["student", "instructor", "admin"];
const API_URL = "http://127.0.0.1:8000/api/admin";

export default function AdminAccounts() {
  const { user, isLoading } = useAuth();
  useHeartbeat(user?.user_id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [onlyPendingInstructor, setOnlyPendingInstructor] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Gatekeeping: only admins
  useEffect(() => {
    if (!isLoading) {
      if (!user) setLocation("/login");
      else if (user.role !== "admin") setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  // ✅ Fetch all users from backend
  useEffect(() => {
    let cancelled = false;
    async function fetchUsers() {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/users`);
        if (!res.ok) throw new Error(String(res.status));
        const data: AdminUser[] = await res.json();
        if (!cancelled) setUsers(data);
      } catch (err) {
        console.error("Failed to load users:", err);
        if (!cancelled) {
          toast({
            title: "Backend unavailable",
            description: "Using mock data as fallback.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // ✅ Filters for search and role
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQ = !q || [u.firstName, u.lastName, u.email].some((v) => v.toLowerCase().includes(q));
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesPending = !onlyPendingInstructor || (u.role === "instructor" && !u.instructorVerified);
      return matchesQ && matchesRole && matchesPending;
    });
  }, [users, query, roleFilter, onlyPendingInstructor]);

  // ✅ Optimistic UI updater
  const setUserPartial = (id: string, patch: Partial<AdminUser>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  // ✅ Verify or revoke instructor
  const verifyInstructor = async (id: string, next: boolean) => {
    try {
      setUserPartial(id, { instructorVerified: next });
      const res = await fetch(`${API_URL}/users/${id}/verify-instructor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: next }),
      });
      if (!res.ok) throw new Error("Failed to verify instructor");
      toast({
        title: next ? "Instructor verified" : "Verification revoked",
        description: next ? "This instructor is now verified." : "Verification has been revoked.",
      });
    } catch (err) {
      console.error(err);
      setUserPartial(id, { instructorVerified: !next });
      toast({ title: "Failed", description: "Could not update instructor verification.", variant: "destructive" });
    }
  };

  // ✅ Change user role
  const changeRole = async (id: string, role: Role) => {
    const prev = users.find((u) => u.id === id)?.role;
    try {
      setUserPartial(id, { role });
      const res = await fetch(`${API_URL}/users/${id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      toast({ title: "Role updated", description: `User is now ${role}.` });
    } catch (err) {
      console.error(err);
      if (prev) setUserPartial(id, { role: prev });
      toast({ title: "Failed", description: "Could not change user role.", variant: "destructive" });
    }
  };

  // ✅ Activate or deactivate account
  const setActive = async (id: string, next: boolean) => {
    try {
      setUserPartial(id, { active: next });
      const res = await fetch(`${API_URL}/users/${id}/active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      if (!res.ok) throw new Error("Failed to update account state");
      toast({
        title: next ? "Account reactivated" : "Account deactivated",
        description: next ? "The user account is now active." : "The user account has been suspended.",
      });
    } catch (err) {
      console.error(err);
      setUserPartial(id, { active: !next });
      toast({ title: "Failed", description: "Could not update account status.", variant: "destructive" });
    }
  };

  // ✅ Refresh manually
  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/users`);
      if (!res.ok) throw new Error(String(res.status));
      const data: AdminUser[] = await res.json();
      setUsers(data);
      toast({ title: "User list refreshed" });
    } catch {
      toast({ title: "Refresh failed", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ Render
  if (isLoading || loading) return <div className="p-6">Loading...</div>;
  if (!user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background" data-testid="admin-accounts">
      <header className="bg-card border-b border-border px-6 h-16 flex items-center sticky top-0 z-40">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <UserCog className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Admin · Account Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={refresh} disabled={refreshing}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name or email…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | "all")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Role filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="onlyPending"
                  type="checkbox"
                  checked={onlyPendingInstructor}
                  onChange={(e) => setOnlyPendingInstructor(e.target.checked)}
                />
                <label htmlFor="onlyPending" className="text-sm">
                  Show only unverified instructors
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/40">
                <tr className="text-left">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Instructor Verified</th>
                  <th className="py-3 px-4">Active</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="py-3 px-4 font-medium">{u.firstName} {u.lastName}</td>
                    <td className="py-3 px-4 text-muted-foreground">{u.id}</td>
                    <td className="py-3 px-4">
                      <Select value={u.role} onValueChange={(v) => changeRole(u.id, v as Role)}>
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-4">
                      {u.role === "instructor" ? (
                        <div className="flex items-center gap-2">
                          {u.instructorVerified ? (
                            <span className="inline-flex items-center gap-1 text-green-700">
                              <CheckCircle2 className="h-4 w-4" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-yellow-700">
                              <XCircle className="h-4 w-4" /> Pending
                            </span>
                          )}
                          <Button
                            variant={u.instructorVerified ? "secondary" : "default"}
                            size="sm"
                            onClick={() => verifyInstructor(u.id, !u.instructorVerified)}
                          >
                            <ShieldCheck className="h-4 w-4 mr-1" />
                            {u.instructorVerified ? "Revoke" : "Verify"}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={u.active ? "text-green-700" : "text-red-700"}>
                        {u.active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        {u.active ? (
                          <Button variant="secondary" size="sm" onClick={() => setActive(u.id, false)}>
                            <UserX className="h-4 w-4 mr-1" /> Deactivate
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => setActive(u.id, true)}>
                            <UserPlus2 className="h-4 w-4 mr-1" /> Reactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 px-4 text-center text-muted-foreground">
                      No users match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}