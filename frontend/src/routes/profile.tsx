import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { changePassword, updateProfile } from "@/lib/api/client";
import { useAuth, formatRoleLabel } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, roles, refresh } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setUsername(profile.username);
    }
  }, [profile]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        username: username.trim(),
      });
      await refresh();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setSavingPassword(false);
    }
  };

  const roleLabel = roles[0] ? formatRoleLabel(roles[0]) : "staff";

  return (
    <AppShell title="My profile">
      <div className="mx-auto grid max-w-2xl gap-6">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-primary-foreground">
            <UserCircle className="h-7 w-7" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">
              {profile?.full_name || profile?.username || user?.email}
            </div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
            <div className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">{roleLabel}</div>
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-base font-semibold">Edit profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">Update your display name and username.</p>
          <form onSubmit={saveProfile} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input value={user?.email ?? ""} disabled className="bg-muted/50" />
              <p className="text-xs text-muted-foreground">Contact an admin to change your email.</p>
            </div>
            <Button type="submit" disabled={savingProfile} className="bg-gradient-primary">
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
              Save profile
            </Button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-base font-semibold">Change password</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use a strong password with at least 6 characters.</p>
          <form onSubmit={savePassword} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm new password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" disabled={savingPassword} variant="outline">
              {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              Change password
            </Button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
