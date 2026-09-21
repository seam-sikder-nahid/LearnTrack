import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { hasCompletedOnboarding } from "@/server/actions/onboarding";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const onboarded = await hasCompletedOnboarding(session.user.id);
  if (onboarded) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <OnboardingWizard />
    </div>
  );
}
