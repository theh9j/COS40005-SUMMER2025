import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { ArrowLeft, Save, Palette, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setAvatarPreview(user.avatar || null);
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      return toast({
        variant: "destructive",
        title: t("error"),
        description: t("firstLastCannotBeEmpty"),
      });
    }

    setSaving(true);
    try {
      if (avatarFile) {
        const formData = new FormData();
        formData.append("firstName", firstName);
        formData.append("lastName", lastName);
        formData.append("avatar", avatarFile);

        const res = await fetch(
          `http://127.0.0.1:8000/api/user/update?token=${user?.token}`,
          {
            method: "PATCH",
            body: formData,
          }
        );

        if (!res.ok) throw new Error();

        const { token: newToken } = await res.json();
        localStorage.setItem("session_token", newToken);
      } else {
        await updateUser({ firstName, lastName });
      }

      toast({
        title: t("profileUpdated"),
        description: t("yourInfoSaved"),
      });
    } catch {
      toast({
        variant: "destructive",
        title: t("updateFailed"),
        description: t("unableToSaveTryAgain"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border h-16 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/student")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
          <h1 className="text-xl font-semibold">{t("settings")}</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-lg shadow-md">
          <CardContent className="p-6 space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={
                    avatarPreview ||
                    "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png"
                  }
                  className="w-20 h-20 rounded-full border object-cover"
                />
                <label className="absolute bottom-0 right-0 bg-primary text-white p-1 rounded-full cursor-pointer">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("uploadNewProfilePicture")}
              </p>
            </div>

            {/* Account Info */}
            <div>
              <h2 className="text-lg font-semibold mb-1">
                {t("accountInformation")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("updateYourPersonalDetails")}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>{t("firstName")}</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>

              <div>
                <Label>{t("lastName")}</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>

              <div>
                <Label>{t("email")}</Label>
                <Input value={user?.email || ""} disabled />
              </div>
            </div>

            {/* Theme & Language */}
            <div className="pt-4 border-t space-y-4">
              {/* Theme */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("theme")}</Label>
                  <p className="text-sm text-muted-foreground capitalize">
                    {t("current")}: {theme}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  {theme === "dark" ? t("switchToLight") : t("switchToDark")}
                </Button>
              </div>

              {/* Language */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("language")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {locale === "vi" ? t("vietnamese") : t("english")}
                  </p>
                </div>

                <div className="w-44">
                  <Select value={locale} onValueChange={(v) => setLocale(v as "en" | "vi")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t("english")}</SelectItem>
                      <SelectItem value="vi">{t("vietnamese")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                t("saving")
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t("saveChanges")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
