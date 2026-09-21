"use server";

import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { journalEntries } from "@/lib/db/schema";

export async function listJournalEntries(userId: string, goalId?: string) {
  const rows = await db
    .select()
    .from(journalEntries)
    .where(
      goalId
        ? and(eq(journalEntries.userId, userId), eq(journalEntries.goalId, goalId))
        : eq(journalEntries.userId, userId),
    )
    .orderBy(desc(journalEntries.date));
  return rows.map((r) => ({ ...r, topics: r.topics ? (JSON.parse(r.topics) as string[]) : [] }));
}

export async function getJournalEntry(userId: string, date: string) {
  const [row] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.date, date)))
    .limit(1);
  return row ?? null;
}
