import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-structural)] border border-dashed border-border py-16 text-center">
      <p className="text-sm font-medium text-text">{title}</p>
      {description && <p className="max-w-xs text-sm text-text-muted">{description}</p>}
      {action && (
        <Button asChild size="sm" className="mt-1">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
