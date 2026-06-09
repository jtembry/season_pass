# Chore Quest — Build Spec

A self-hosted, multi-user chore-and-reward app for one household. Kids complete
daily/weekly chores, earn points, and unlock real-world rewards at a threshold
(e.g. **280 points/week → a Holiday World ticket**). A parent reviews and
approves every completion. Photo-proof chores get a first-pass recommendation
from a vision agent, but the parent always makes the final call.

This document is the source of truth for the data model, roles, and core flows.
Keep `CLAUDE.md` (repo root) short; it points here.

-----

## Locked decisions

1. **Shared leaderboard.** Siblings see each other's point totals. Competition
   is intended. No per-child visibility restrictions.
1. **Parent reviews everything. No auto-approve.** Every completion lands in a
   parent review queue. The vision agent only writes a *recommendation*; it
   never changes a completion's status.
1. **Kids get their own login.** Each child profile may have a `username` +
   `passwordHash`. A kid signs in on the shared `/login` page and lands directly
   in their own kid mode (`role = CHILD`). Kids are still restricted to kid mode:
   they cannot view parent pages, approve completions, edit tasks, or adjust
   points. Parents (`role = PARENT`) remain the only ones who manage the
   household. (An optional PIN remains for parent-opened kid mode.)
1. **Points are an append-only ledger,** never a mutable counter on the child.
   Balances and weekly totals are derived by summing ledger entries.
1. **No materialized recurrence.** Daily/weekly tasks are not pre-generated as
   rows. A `periodKey` on each completion plus a unique constraint handles it.

-----

## Roles & permissions

**Parent (logged-in user)**

- Full CRUD on tasks, child profiles, rewards.
- The review queue: approve / reject completions; leave a note.
- Manual point adjustments (creates an `ADJUSTMENT` ledger entry).
- Sees everything.

**Kid (a child profile with a `username` + password, `role = CHILD`)**

- Signs in on `/login`; lands directly in their own kid mode.
- See today's and this week's assigned tasks.
- Mark a task done; attach a photo when the task requires one.
- View own points, progress toward the reward, and the household leaderboard.
- Cannot edit tasks, cannot approve, cannot adjust points.

-----

## Completion → approval flow (state machine)

States: `PENDING_REVIEW` → `APPROVED` | `REJECTED`

1. In kid mode, a child marks a task done → a `Completion` is created with
   status `PENDING_REVIEW`. If `task.requiresPhoto`, the child attaches a photo
   (`photoUrl` set).
1. If a photo is present, enqueue a vision verification job → it writes a
   `VerificationCheck` (verdict / confidence / reasoning). **The completion stays
   `PENDING_REVIEW`.** The verdict is shown in the parent's queue as a hint and
   can be used to sort (e.g. surface `NOT_DONE` / `UNSURE` first).
1. Parent opens the review queue (task, child, photo, agent recommendation):
- **Approve** → status `APPROVED`, snapshot `pointsAwarded`, create a
  `PointsLedgerEntry` of type `COMPLETION` for `+points`.
- **Reject** → status `REJECTED`, optional `reviewNote`. The child may
  resubmit, which flips the same completion back to `PENDING_REVIEW` with a
  new photo (one completion per task/child/period).
1. On approval, recompute the child's weekly total. If it crosses an active
   `THRESHOLD` reward, create a `RewardGrant` and notify the parent.

-----

## Reward / threshold logic

- A reward unlocks when a child reaches `thresholdPoints` (`mode = THRESHOLD`).
  Its `window` decides which points count:
  - `CUMULATIVE` (default) — the child's **all-time total**. Earned once, ever.
  - `WEEKLY` — points within the current ISO week. Earnable once per week.
- `mode = REDEEMABLE` (spend points to claim) is a future variant; not core.
- Cumulative total = sum of all `PointsLedgerEntry.amount` for the child.
  Weekly total = the same sum restricted to `occurredAt` in the current ISO week.

-----

## Data model (Prisma / Postgres)

Stack is swappable; this schema translates to any ORM. `periodKey` is the date
(`2026-06-03`) for daily tasks and the ISO week (`2026-W23`) for weekly tasks.

```prisma
enum Role            { PARENT CHILD }
enum TaskCategory    { GET_READY BREAKFAST LUNCH DINNER BEDTIME STUDY WEEKLY DAILY_ANYTIME BONUS }
enum Cadence         { DAILY WEEKLY ONE_TIME }
enum CompletionStatus{ PENDING_REVIEW APPROVED REJECTED }
enum Verdict         { LOOKS_DONE NOT_DONE UNSURE }
enum LedgerEntryType { COMPLETION BONUS ADJUSTMENT REDEMPTION }
enum RewardWindow    { WEEKLY CUMULATIVE }
enum RewardMode      { THRESHOLD REDEEMABLE }

model Household {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  users         User[]
  children      ChildProfile[]
  tasks         TaskDefinition[]
  completions   Completion[]
  ledgerEntries PointsLedgerEntry[]
  rewards       Reward[]
}

model User {
  id           String   @id @default(cuid())
  householdId  String
  email        String   @unique
  passwordHash String
  role         Role     @default(PARENT)
  createdAt    DateTime @default(now())
  household     Household    @relation(fields: [householdId], references: [id])
  reviewedItems Completion[] @relation("ReviewedBy")
}

model ChildProfile {
  id          String    @id @default(cuid())
  householdId String
  displayName String
  avatar       String?
  birthdate    DateTime?
  pinHash      String?   // optional lock for parent-opened kid mode
  username     String?   @unique // kid login handle (role = CHILD)
  passwordHash String?   // kid login password; null = no self-service login
  createdAt    DateTime  @default(now())
  household     Household          @relation(fields: [householdId], references: [id])
  assignments   TaskAssignment[]
  completions   Completion[]
  ledgerEntries PointsLedgerEntry[]
  rewardGrants  RewardGrant[]
}

model TaskDefinition {
  id            String       @id @default(cuid())
  householdId   String
  title         String
  icon          String?
  category      TaskCategory
  points        Int
  cadence       Cadence
  dueBy         String?      // e.g. "08:00" — display/ordering only
  requiresPhoto Boolean      @default(false)
  isBonus       Boolean      @default(false)
  repeatable    Boolean      @default(false) // bonus tasks earnable multiple times per period
  active        Boolean      @default(true)
  createdAt     DateTime     @default(now())
  household   Household        @relation(fields: [householdId], references: [id])
  assignments TaskAssignment[]
  completions Completion[]
}

model TaskAssignment {
  id               String @id @default(cuid())
  taskDefinitionId String
  childProfileId   String
  task  TaskDefinition @relation(fields: [taskDefinitionId], references: [id])
  child ChildProfile   @relation(fields: [childProfileId], references: [id])
  @@unique([taskDefinitionId, childProfileId])
}

model Completion {
  id               String           @id @default(cuid())
  householdId      String
  taskDefinitionId String
  childProfileId   String
  periodKey        String           // "2026-06-03" or "2026-W23"
  status           CompletionStatus @default(PENDING_REVIEW)
  pointsAwarded    Int?             // snapshot at approval
  photoUrl         String?
  submittedAt      DateTime         @default(now())
  reviewedById     String?
  reviewedAt       DateTime?
  reviewNote       String?
  household     Household           @relation(fields: [householdId], references: [id])
  task          TaskDefinition      @relation(fields: [taskDefinitionId], references: [id])
  child         ChildProfile        @relation(fields: [childProfileId], references: [id])
  reviewedBy    User?               @relation("ReviewedBy", fields: [reviewedById], references: [id])
  verifications VerificationCheck[]
  ledgerEntry   PointsLedgerEntry?
  // For repeatable bonus tasks, suffix periodKey (e.g. "2026-06-03#<cuid>")
  // or use a partial unique index where repeatable = false.
  @@unique([taskDefinitionId, childProfileId, periodKey])
  @@index([householdId, status])
}

model VerificationCheck {
  id           String   @id @default(cuid())
  completionId String
  verdict      Verdict
  confidence   Float
  reasoning    String
  modelVersion String
  latencyMs    Int
  costUsd      Float
  createdAt    DateTime @default(now())
  completion Completion @relation(fields: [completionId], references: [id])
}

model PointsLedgerEntry {
  id                 String          @id @default(cuid())
  householdId        String
  childProfileId     String
  type               LedgerEntryType
  amount             Int             // signed
  sourceCompletionId String?         @unique
  note               String?
  occurredAt         DateTime        @default(now())
  household        Household    @relation(fields: [householdId], references: [id])
  child            ChildProfile @relation(fields: [childProfileId], references: [id])
  sourceCompletion Completion?  @relation(fields: [sourceCompletionId], references: [id])
  @@index([childProfileId, occurredAt])
}

model Reward {
  id              String       @id @default(cuid())
  householdId     String
  title           String
  thresholdPoints Int
  window          RewardWindow @default(WEEKLY)
  mode            RewardMode   @default(THRESHOLD)
  active          Boolean      @default(true)
  createdAt       DateTime     @default(now())
  household Household     @relation(fields: [householdId], references: [id])
  grants    RewardGrant[]
}

model RewardGrant {
  id             String   @id @default(cuid())
  rewardId       String
  childProfileId String
  grantedAt      DateTime @default(now())
  pointsSpent    Int?
  note           String?
  reward Reward       @relation(fields: [rewardId], references: [id])
  child  ChildProfile @relation(fields: [childProfileId], references: [id])
}
```

-----

## Agentic photo verification

- Only a handful of tasks set `requiresPhoto = true` (e.g. make bed, tidy room,
  clean guinea pig cage). Most chores don't need it.
- On photo submission, call a vision model with the task title + the photo and
  ask for a structured verdict: `LOOKS_DONE | NOT_DONE | UNSURE`, a confidence,
  and a short reasoning. Persist it as a `VerificationCheck`.
- **It never approves.** It sorts and informs the parent's queue. Full stop.
- Every parent approve/reject decision becomes ground truth paired with the
  agent's verdict — that pairing is the eval dataset (below).

## Eval harness (the portfolio centerpiece)

- Build a labeled set of `(photo, task, expected_verdict)` — seed it with
  synthetic/staged photos, grow it from real parent decisions over time.
- Metrics that matter, reported in the README:
  - **False-approval rate** (agent said done, it wasn't) — the gaming risk.
  - **False-rejection rate** (agent said not done, it was) — the frustration risk.
  - Accuracy, plus p50/p95 latency and cost per check.
- A standalone script runs the eval set against the current prompt/model and
  prints the table. Treat the model as a fallible component you measure and tune.

-----

## Recommended stack (swap freely; the model doesn't change)

- **App:** Next.js (App Router) + TypeScript — one language end to end.
- **DB/ORM:** Postgres + Prisma (schema above is the migration source).
- **Vision:** Anthropic API (Claude vision) for the verification check.
- **Storage:** local disk or S3-compatible (MinIO) for photos.
- **Infra:** Docker Compose, Caddy reverse proxy (automatic TLS), GitHub Actions CI.
- **Observability:** log every `VerificationCheck` cost/latency; optional Langfuse.

## Build order

1. **Deploy the empty shell first** — auth + task CRUD on the self-hosted box,
   TLS + CI green, end to end. Never leave deployment for last.
1. Child profiles, task definitions/assignments, kid mode, completions, the
   parent review queue, points ledger, leaderboard, reward threshold.
1. Photo verification + the eval harness + a small cost/latency view.
1. Stretch: streak bonuses (e.g. "pullup dry 2 weeks → up to 2x"), repeatable
   bonus tasks, anti-gaming pattern detection.

## Scope / non-goals (do not gold-plate)

- One household for real use; one synthetic household for the public demo.
- No mobile app, no payments, no third-party integrations.
- Photo-verify only a few chore types, not all.
- Keep the UI clean and simple; the engineering is the headline, not the visuals.

## Privacy

- The real instance has the kids' real names and photos. **Never** commit those
  or expose them in a public repo or demo.
- The public demo uses synthetic child profiles and placeholder/stock images.
  Note this separation in the README — it's deliberate judgment worth showing.
