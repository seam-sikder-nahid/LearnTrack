/**
 * §42 Sample Data.
 *
 * Seeds a demo user + "Android Pentesting — 6 Months" goal with realistic
 * milestones/tasks. Every row this script creates is marked `isSeed: true`
 * so it's unambiguous in the UI/DB which data is real vs. example (§42:
 * "Clearly mark seed/example data").
 *
 * Per §16/§41, seeded tasks stick to labs, CTFs, and theory/defensive
 * topics — never real-world unauthorized targets.
 *
 * Run with: npm run db:seed
 */
import { db } from "@/lib/db/client";
import { users, goals, milestones, tasks, userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SEED_USER_ID = "seed-user-android-pentesting";

const MILESTONE_PLAN: { title: string; monthIndex: number; tasks: string[] }[] = [
  {
    title: "Android Fundamentals",
    monthIndex: 1,
    tasks: [
      "Learn Android application architecture",
      "Study APK structure",
      "Practice basic ADB commands",
      "Analyze a sample APK from an intentionally vulnerable app",
    ],
  },
  {
    title: "APK Analysis",
    monthIndex: 1,
    tasks: [
      "Learn APK anatomy",
      "Study AndroidManifest.xml",
      "Learn APK signing basics",
      "Practice APK extraction with apktool",
    ],
  },
  {
    title: "Static Analysis",
    monthIndex: 2,
    tasks: ["Install and configure JADX", "Decompile a sample app with JADX", "Run MobSF against a test APK"],
  },
  {
    title: "Dynamic Analysis",
    monthIndex: 3,
    tasks: ["Set up Frida on an emulator", "Intercept traffic with Burp Suite on a lab app", "Practice with an Android CTF"],
  },
  {
    title: "Android Security Testing",
    monthIndex: 4,
    tasks: ["Study insecure storage patterns (theory)", "Review WebView security guidance", "Study IPC security fundamentals"],
  },
  {
    title: "Advanced Research",
    monthIndex: 6,
    tasks: ["Write up findings from a completed lab", "Review a public Android CTF writeup"],
  },
];

async function main() {
  console.log("Seeding LearnTrack demo data...");

  await db
    .insert(users)
    .values({ id: SEED_USER_ID, name: "Demo Learner", email: "demo@example.com" })
    .onConflictDoNothing();

  await db.insert(userSettings).values({ userId: SEED_USER_ID }).onConflictDoNothing();

  const existing = await db.select().from(goals).where(eq(goals.userId, SEED_USER_ID));
  if (existing.length > 0) {
    console.log("Seed data already present — skipping. Delete learntrack.db to reseed.");
    return;
  }

  const startDate = new Date();
  const targetDate = new Date(startDate);
  targetDate.setDate(targetDate.getDate() + 180);

  const [goal] = await db
    .insert(goals)
    .values({
      userId: SEED_USER_ID,
      title: "Android Pentesting — 6 Months",
      durationDays: 180,
      startDate,
      targetDate,
      dailyTaskTarget: 2,
      isSeed: true,
    })
    .returning();

  let dayCursor = 0;
  for (const plan of MILESTONE_PLAN) {
    const [milestone] = await db
      .insert(milestones)
      .values({
        goalId: goal.id,
        title: plan.title,
        monthIndex: plan.monthIndex,
        isSeed: true,
      })
      .returning();

    for (let i = 0; i < plan.tasks.length; i++) {
      const scheduledDate = new Date(startDate);
      scheduledDate.setDate(scheduledDate.getDate() + Math.floor(dayCursor / 2));
      dayCursor++;

      await db.insert(tasks).values({
        userId: SEED_USER_ID,
        goalId: goal.id,
        milestoneId: milestone.id,
        title: plan.tasks[i],
        category: plan.title,
        scheduledDate,
        isSeed: true,
      });
    }
  }

  console.log(`Seeded goal "${goal.title}" for user ${SEED_USER_ID}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
