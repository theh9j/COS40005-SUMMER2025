import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Palette, UserRound } from "lucide-react";

export default function ProfileMenu() {
  const { user, logout, isLoading } = useAuth();

  if (!user) return null;

  return (
    <div className="absolute right-4 top-16 w-72 bg-card border border-border rounded-xl shadow-lg z-50">
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserRound className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-border" />

          {/* Menu */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm"
              onClick={() => alert('Profile settings')}
            >
              <Settings className="h-4 w-4 mr-2" /> Account settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm"
              onClick={() => alert('Theme switcher')}
            >
              <Palette className="h-4 w-4 mr-2" /> Theme
            </Button>
          </div>

          {/* Footer */}
          <hr className="border-border" />
          <Button
            variant="secondary"
            className="w-full text-sm"
            onClick={logout}
            disabled={isLoading}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}