import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  trackClassName,
}: {
  value: number;
  className?: string;
  trackClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-sunken", trackClassName)}
    >
      <div
        className={cn("h-full rounded-full bg-accent-primary transition-[width]", className)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
