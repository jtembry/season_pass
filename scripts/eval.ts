#!/usr/bin/env npx tsx
// @ts-nocheck — eval script uses runtime-only imports not tracked by tsc
/**
 * Photo verification eval harness.
 *
 * Usage:
 *   npm run eval                  # run against eval fixtures
 *   npm run eval -- --summary     # summary table only
 *
 * Fixtures: scripts/eval-fixtures.json
 * Each fixture: { photo: string (URL or path), task: string, expected: "LOOKS_DONE"|"NOT_DONE"|"UNSURE" }
 *
 * Metrics reported:
 *   - Accuracy
 *   - False-approval rate  (agent=LOOKS_DONE, truth≠LOOKS_DONE) — gaming risk
 *   - False-rejection rate (agent=NOT_DONE,   truth=LOOKS_DONE) — frustration risk
 *   - p50 / p95 latency
 *   - Total cost (USD)
 */

import "dotenv/config";
import { verifyPhoto } from "../lib/verification";
import { readFileSync, existsSync } from "fs";
import path from "path";

type Fixture = {
  photo: string;
  task: string;
  expected: "LOOKS_DONE" | "NOT_DONE" | "UNSURE";
  note?: string;
};

type Result = {
  fixture: Fixture;
  verdict: string;
  confidence: number;
  reasoning: string;
  latencyMs: number;
  costUsd: number;
  correct: boolean;
  falseApproval: boolean;
  falseRejection: boolean;
  error?: string;
};

const fixturesPath = path.join(__dirname, "eval-fixtures.json");

function loadFixtures(): Fixture[] {
  if (!existsSync(fixturesPath)) {
    console.error(`No fixtures file found at ${fixturesPath}`);
    console.error(`Create it with entries like:`);
    console.error(JSON.stringify([{ photo: "/uploads/sample.jpg", task: "Make bed", expected: "LOOKS_DONE" }], null, 2));
    process.exit(1);
  }
  return JSON.parse(readFileSync(fixturesPath, "utf-8")) as Fixture[];
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.max(0, Math.ceil(sorted.length * (p / 100)) - 1);
  return sorted[idx];
}

async function runEval() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  const fixtures = loadFixtures();
  console.log(`Running eval on ${fixtures.length} fixture(s)...\n`);

  const results: Result[] = [];

  for (const fixture of fixtures) {
    process.stdout.write(`  [${fixture.expected}] ${fixture.task} (${fixture.photo}) ... `);
    try {
      const r = await verifyPhoto(fixture.task, fixture.photo);
      const correct = r.verdict === fixture.expected;
      const falseApproval = r.verdict === "LOOKS_DONE" && fixture.expected !== "LOOKS_DONE";
      const falseRejection = r.verdict === "NOT_DONE" && fixture.expected === "LOOKS_DONE";
      results.push({
        fixture,
        verdict: r.verdict,
        confidence: r.confidence,
        reasoning: r.reasoning,
        latencyMs: r.latencyMs,
        costUsd: r.costUsd,
        correct,
        falseApproval,
        falseRejection,
      });
      console.log(`${r.verdict} (${(r.confidence * 100).toFixed(0)}%) ${correct ? "✓" : "✗"}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        fixture,
        verdict: "ERROR",
        confidence: 0,
        reasoning: msg,
        latencyMs: 0,
        costUsd: 0,
        correct: false,
        falseApproval: false,
        falseRejection: false,
        error: msg,
      });
      console.log(`ERROR: ${msg}`);
    }
  }

  const n = results.length;
  const correct = results.filter((r) => r.correct).length;
  const falseApprovals = results.filter((r) => r.falseApproval).length;
  const falseRejections = results.filter((r) => r.falseRejection).length;
  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const totalCost = results.reduce((sum, r) => sum + r.costUsd, 0);

  console.log("\n─────────────────────────────────────────");
  console.log(`  Fixtures:           ${n}`);
  console.log(`  Accuracy:           ${((correct / n) * 100).toFixed(1)}%  (${correct}/${n})`);
  console.log(`  False-approval:     ${((falseApprovals / n) * 100).toFixed(1)}%  (${falseApprovals}/${n}) ← gaming risk`);
  console.log(`  False-rejection:    ${((falseRejections / n) * 100).toFixed(1)}%  (${falseRejections}/${n}) ← frustration risk`);
  console.log(`  p50 latency:        ${percentile(latencies, 50)}ms`);
  console.log(`  p95 latency:        ${percentile(latencies, 95)}ms`);
  console.log(`  Total cost:         $${totalCost.toFixed(4)}`);
  console.log("─────────────────────────────────────────\n");

  // Exit non-zero if any false approvals (the critical failure mode)
  if (falseApprovals > 0) {
    console.warn(`⚠  ${falseApprovals} false approval(s) detected.`);
    process.exit(1);
  }
}

runEval().catch((err) => { console.error(err); process.exit(1); });
