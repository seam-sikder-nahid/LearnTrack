import { auth } from "@/lib/auth/config";
import { listJournalEntries } from "@/server/actions/journal";
import { EmptyState } from "@/components/ui/empty-state";
import { JournalBrowser } from "@/components/journal/journal-browser";

export default async function JournalPage() {
  const session = await auth();
  const entries = await listJournalEntries(session!.user.id);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Journal</h1>
        <p className="mt-1 text-sm text-text-muted">
          Automatically generated from your completed tasks — never fabricated.
        </p>
      </header>

      {entries.length === 0 ? (
        <EmptyState
          title="No journal entries yet."
          description="Complete your first task to start your learning journal."
          action={{ href: "/today", label: "Go to Today's Tasks" }}
        />
      ) : (
        <JournalBrowser entries={entries} />
      )}
    </div>
  );
}
