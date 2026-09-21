import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { hasCompletedOnboarding } from "@/server/actions/onboarding";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const onboarded = await hasCompletedOnboarding(session.user.id);
  if (!onboarded) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-16 md:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
}
