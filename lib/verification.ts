import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const MODEL = "claude-opus-4-8";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface VerificationResult {
  verdict: "LOOKS_DONE" | "NOT_DONE" | "UNSURE";
  confidence: number;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are a household chore verification assistant.
A child has submitted a photo claiming they completed a chore.
Assess the photo and return ONLY valid JSON with this shape:
{
  "verdict": "LOOKS_DONE" | "NOT_DONE" | "UNSURE",
  "confidence": <0.0-1.0>,
  "reasoning": "<one concise sentence>"
}
- LOOKS_DONE: the chore clearly appears completed
- NOT_DONE: the chore clearly is not done or the photo is misleading/irrelevant
- UNSURE: you cannot confidently determine from the photo alone
Be strict — children may try to submit old photos or irrelevant images to game the system.`;

export async function verifyPhoto(
  taskTitle: string,
  photoUrl: string
): Promise<VerificationResult & { modelVersion: string; latencyMs: number; costUsd: number }> {
  const start = Date.now();

  // Fetch image bytes so we can send as base64 (works for both local and remote URLs)
  const imageRes = await fetch(
    photoUrl.startsWith("/") ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${photoUrl}` : photoUrl
  );
  if (!imageRes.ok) throw new Error(`Could not fetch photo: ${photoUrl}`);
  const arrayBuffer = await imageRes.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mediaType = (imageRes.headers.get("content-type") as Anthropic.Base64ImageSource["media_type"]) ?? "image/jpeg";

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: `The chore to verify: "${taskTitle}". Does this photo show the chore is done?`,
          },
        ],
      },
    ],
  });

  const latencyMs = Date.now() - start;
  const rawText = response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from response (may have markdown fences)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Unexpected response: ${rawText}`);
  const parsed = JSON.parse(jsonMatch[0]) as VerificationResult;

  // Cost estimate: $15/MTok input, $75/MTok output for Opus 4
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const costUsd = (inputTokens * 15 + outputTokens * 75) / 1_000_000;

  return {
    verdict: parsed.verdict,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    modelVersion: MODEL,
    latencyMs,
    costUsd,
  };
}

export async function enqueueVerification(
  completionId: string,
  taskTitle: string,
  photoUrl: string
): Promise<void> {
  const result = await verifyPhoto(taskTitle, photoUrl);
  await prisma.verificationCheck.create({
    data: {
      completionId,
      verdict: result.verdict,
      confidence: result.confidence,
      reasoning: result.reasoning,
      modelVersion: result.modelVersion,
      latencyMs: result.latencyMs,
      costUsd: result.costUsd,
    },
  });
}
