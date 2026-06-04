import { NextRequest, NextResponse } from "next/server";
import type { ContentFormData } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { formData }: { formData: ContentFormData } = await request.json();
    const { nombreOrganizacion, tipoOrganizacion, redSocial, formatoInstagram, tema } = formData;

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return NextResponse.json({ error: "REPLICATE_API_TOKEN no configurado" }, { status: 500 });

    const aspectRatio = redSocial === "Instagram" && formatoInstagram === "Story 9:16" ? "9:16"
      : redSocial === "Facebook" ? "16:9" : "1:1";

    const orgType = (tipoOrganizacion === "ong_pequena" || tipoOrganizacion === "ong_mediana")
      ? "non-profit organization" : "small business";
    const imagePrompt = `Professional social media image for ${redSocial} from ${orgType} "${nombreOrganizacion}" about "${tema}". Modern design, vibrant colors, high quality, clean composition. No text, no words, no letters in the image.`;

    // Create the prediction and return immediately — the client polls
    // /api/generate-image/status for the result (no server-side polling,
    // so the serverless function returns fast and never hits the timeout).
    const res = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: { prompt: imagePrompt, aspect_ratio: aspectRatio, output_format: "webp", output_quality: 90, num_outputs: 1 } }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Replicate error:", err);
      return NextResponse.json({ error: "Error iniciando generación" }, { status: 500 });
    }

    const prediction = await res.json();
    return NextResponse.json({ predictionId: prediction.id });
  } catch (error) {
    return NextResponse.json({ error: `Error: ${error instanceof Error ? error.message : "desconocido"}` }, { status: 500 });
  }
}
