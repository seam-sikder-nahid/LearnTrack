import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-surface-sunken text-text-muted border border-border",
        streak: "bg-[var(--accent-streak-bg)] text-accent-streak",
        synced: "bg-[var(--accent-synced-bg)] text-accent-synced",
        pending: "bg-[var(--accent-pending-bg)] text-accent-pending",
        failed: "bg-[var(--accent-failed-bg)] text-accent-failed",
        primary: "bg-[var(--accent-primary-bg)] text-accent-primary",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
