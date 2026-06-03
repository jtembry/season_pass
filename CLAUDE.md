# Chore Quest

Self-hosted, multi-user chore-and-reward app for one household. Kids earn points
for chores and unlock real rewards at a weekly threshold. A parent approves every
completion; a vision agent only recommends. Full data model and flows: @SPEC.md

## Stack

- Next.js (App Router) + TypeScript, one language end to end
- Postgres + Prisma (schema in SPEC.md is the migration source of truth)
- Anthropic API (Claude vision) for photo verification
- Docker Compose + Caddy (auto-TLS) + GitHub Actions CI

## Non-negotiable rules

- **Parents approve everything. The agent NEVER changes a completion's status** —
  it only writes a `VerificationCheck` recommendation.
- **Points live in an append-only ledger.** Never store a mutable total on a
  child; derive balances and weekly totals by summing `PointsLedgerEntry`.
- **No materialized recurrence.** Use `periodKey` + the unique constraint on
  `(taskDefinitionId, childProfileId, periodKey)`.
- **Synthetic data only outside the real family instance.** No real child names
  or photos in the repo, seeds, tests, or the public demo.
- Snapshot `pointsAwarded` on the completion at approval time.

## Conventions

- Commit Prisma migrations; never hand-edit the database.
- Every `VerificationCheck` records `modelVersion`, `latencyMs`, `costUsd`.
- Keep the eval harness runnable as a standalone script.

## Scope guardrails (do not gold-plate)

- No mobile app, payments, or third-party integrations.
- Photo-verify only a few chore types (made bed, tidy room, cage), not all.
- One real household + one synthetic demo household. Keep the UI clean and plain.

## Build order

1. Deploy the empty shell first (auth + task CRUD, TLS + CI green) before features.
1. Profiles → tasks → kid mode → completions → review queue → ledger →
   leaderboard → reward threshold.
1. Photo verification + eval harness + cost/latency view.
1. Stretch: streak/repeatable bonuses, anti-gaming detection.

## Commands

- Dev: `npm run dev`
- Test: `npm test`
- Migrate: `npx prisma migrate dev`
- Eval: `npm run eval`
- Docker: `docker compose up -d`
