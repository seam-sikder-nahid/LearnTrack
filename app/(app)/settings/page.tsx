import { auth, signOut } from "@/lib/auth/config";
import { getSettings } from "@/server/actions/settings";
import { SettingsForm } from "@/components/settings/settings-form";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const session = await auth();
  const settings = await getSettings(session!.user.id);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      </header>

      <SettingsForm
        initial={{
          syncMode: settings?.syncMode ?? "automatic",
          commitMessageFormat: settings?.commitMessageFormat ?? "Learning: {goal} — {date}",
          streakRequiresGithub: settings?.streakRequiresGithub ?? false,
          notificationsEnabled: settings?.notificationsEnabled ?? true,
        }}
      />

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="secondary" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
