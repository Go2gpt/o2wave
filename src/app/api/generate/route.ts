import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildContentPrompt } from "@/lib/prompts";
import { generateId } from "@/lib/utils";
import type { ContentRequest, GeneratedContent } from "@/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body: ContentRequest = await req.json();

    if (!body.topic || !body.orgName || !body.platform) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: topic, orgName, platform" },
        { status: 400 }
      );
    }

    const prompt = buildContentPrompt(body);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown code fences if Claude wraps the JSON in ```json ... ```
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    let parsed: { content: string; hashtags: string[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Error al parsear la respuesta de IA", raw: rawText },
        { status: 500 }
      );
    }

    const result: GeneratedContent = {
      id: generateId(),
      ...body,
      content: parsed.content,
      hashtags: parsed.hashtags ?? [],
      createdAt: new Date(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
