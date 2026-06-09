/**
 * Seed script — creates one synthetic demo household.
 * All names, photos, and data are fictional. No real child data.
 *
 * Run: npx tsx prisma/seed.ts
 */
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding demo household…");

  // Clean slate for demo household
  const existingDemo = await prisma.household.findFirst({ where: { name: "Demo Family" } });
  if (existingDemo) {
    console.log("Demo household already exists — skipping seed.");
    return;
  }

  const household = await prisma.household.create({ data: { name: "Demo Family" } });

  // Parent accounts
  const passwordHash = await bcrypt.hash("demo1234", 12);
  await prisma.user.create({
    data: {
      householdId: household.id,
      email: "parent@demo.local",
      passwordHash,
      role: "PARENT",
    },
  });

  const bethHash = await bcrypt.hash("beth1234", 12);
  await prisma.user.create({
    data: {
      householdId: household.id,
      email: "beth@demo.local",
      passwordHash: bethHash,
      role: "PARENT",
    },
  });

  // Synthetic children (fictional names)
  const [alex, sam] = await Promise.all([
    prisma.childProfile.create({
      data: { householdId: household.id, displayName: "Alex", avatar: "🦁" },
    }),
    prisma.childProfile.create({
      data: { householdId: household.id, displayName: "Sam", avatar: "🐼" },
    }),
  ]);

  // Tasks
  const tasks = await Promise.all([
    prisma.taskDefinition.create({
      data: {
        householdId: household.id,
        title: "Make bed",
        icon: "🛏️",
        category: "GET_READY",
        cadence: "DAILY",
        points: 10,
        dueBy: "08:00",
        requiresPhoto: true,
      },
    }),
    prisma.taskDefinition.create({
      data: {
        householdId: household.id,
        title: "Get dressed",
        icon: "👕",
        category: "GET_READY",
        cadence: "DAILY",
        points: 5,
        dueBy: "08:00",
      },
    }),
    prisma.taskDefinition.create({
      data: {
        householdId: household.id,
        title: "Brush teeth (morning)",
        icon: "🦷",
        category: "GET_READY",
        cadence: "DAILY",
        points: 5,
        dueBy: "08:00",
      },
    }),
    prisma.taskDefinition.create({
      data: {
        householdId: household.id,
        title: "Set the table",
        icon: "🍽️",
        category: "DINNER",
        cadence: "DAILY",
        points: 10,
        dueBy: "18:00",
      },
    }),
    prisma.taskDefinition.create({
      data: {
        householdId: household.id,
        title: "Clear the table",
        icon: "🧹",
        category: "DINNER",
        cadence: "DAILY",
        points: 10,
        dueBy: "19:00",
      },
    }),
    prisma.taskDefinition.create({
      data: {
        householdId: household.id,
        title: "Brush teeth (night)",
        icon: "🦷",
        category: "BEDTIME",
        cadence: "DAILY",
        points: 5,
        dueBy: "21:00",
      },
    }),
    prisma.taskDefinition.create({
      data: {
        householdId: household.id,
        title: "Read for 20 min",
        icon: "📚",
        category: "STUDY",
        cadence: "DAILY",
        points: 15,
      },
    }),
    prisma.taskDefinition.create({
      data: {
        householdId: household.id,
        title: "Tidy bedroom",
        icon: "🏠",
        category: "WEEKLY",
        cadence: "WEEKLY",
        points: 30,
        requiresPhoto: true,
      },
    }),
    prisma.taskDefinition.create({
      data: {
        householdId: household.id,
        title: "Take out trash",
        icon: "🗑️",
        category: "WEEKLY",
        cadence: "WEEKLY",
        points: 20,
      },
    }),
    prisma.taskDefinition.create({
      data: {
        householdId: household.id,
        title: "Feed & water pets",
        icon: "🐾",
        category: "DAILY_ANYTIME",
        cadence: "DAILY",
        points: 10,
        requiresPhoto: false,
      },
    }),
    prisma.taskDefinition.create({
      data: {
        householdId: household.id,
        title: "Extra chore (bonus)",
        icon: "⭐",
        category: "BONUS",
        cadence: "DAILY",
        points: 25,
        isBonus: true,
        repeatable: true,
      },
    }),
  ]);

  // Assign all tasks to both children
  await Promise.all(
    tasks.flatMap((task) =>
      [alex.id, sam.id].map((childId) =>
        prisma.taskAssignment.create({
          data: { taskDefinitionId: task.id, childProfileId: childId },
        })
      )
    )
  );

  // Reward
  await prisma.reward.create({
    data: {
      householdId: household.id,
      title: "Holiday World ticket",
      thresholdPoints: 280,
      window: "WEEKLY",
      mode: "THRESHOLD",
    },
  });

  // Seed some historical approved completions to populate the leaderboard
  const today = new Date().toISOString().slice(0, 10);
  const dailyTasks = tasks.filter((t) => t.cadence === "DAILY").slice(0, 3);

  for (const task of dailyTasks) {
    for (const child of [alex, sam]) {
      const completion = await prisma.completion.create({
        data: {
          householdId: household.id,
          taskDefinitionId: task.id,
          childProfileId: child.id,
          periodKey: today,
          status: "APPROVED",
          pointsAwarded: task.points,
        },
      });
      await prisma.pointsLedgerEntry.create({
        data: {
          householdId: household.id,
          childProfileId: child.id,
          type: "COMPLETION",
          amount: task.points,
          sourceCompletionId: completion.id,
          note: task.title,
        },
      });
    }
  }

  // One pending completion for the review queue
  const pendingTask = tasks.find((t) => t.title === "Make bed")!;
  await prisma.completion.create({
    data: {
      householdId: household.id,
      taskDefinitionId: pendingTask.id,
      childProfileId: alex.id,
      // Offset period key so it doesn't conflict with the approved one
      periodKey: today + "#pending",
      status: "PENDING_REVIEW",
    },
  });

  console.log(`✓ Demo household seeded. Login: parent@demo.local / demo1234`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
