"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  ListChecks,
  Calendar,
  BookOpen,
  BarChart3,
  GitBranch,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/today", label: "Today's Tasks", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/github", label: "GitHub Sync", icon: GitBranch },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface-raised px-3 py-5 md:flex"
    >
      <div className="mb-6 px-2">
        <span className="text-sm font-semibold tracking-tight">LearnTrack</span>
      </div>
      <ul className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--radius-interactive)] px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-surface-sunken text-text font-medium"
                    : "text-text-muted hover:bg-surface-sunken hover:text-text",
                )}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
