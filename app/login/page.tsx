import { redirect } from "next/navigation";
import { GitBranch } from "lucide-react";
import { auth, signIn } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">LearnTrack</h1>
        <p className="mt-2 max-w-xs text-sm text-text-muted">
          Learn every day. Track everything. Build your GitHub history automatically.
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: "/onboarding" });
        }}
      >
        <Button type="submit" size="lg" className="gap-2.5">
          <GitBranch size={18} aria-hidden="true" />
          Sign in with GitHub
        </Button>
      </form>
      <p className="max-w-sm text-center text-xs text-text-faint">
        LearnTrack requests read access to your profile and repositories so it
        can write your learning journal to a repository you choose. It never
        stores your password, and access tokens never leave the server.
      </p>
    </div>
  );
}
