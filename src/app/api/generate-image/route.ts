import { NextRequest, NextResponse } from "next/server";
import type { ContentFormData } from "@/types";

export const maxDuration = 60;

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

    const res = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
      body: JSON.stringify({ input: { prompt: imagePrompt, aspect_ratio: aspectRatio, output_format: "webp", output_quality: 90, num_outputs: 1 } }),
    });

    if (!res.ok) return NextResponse.json({ error: "Error iniciando generación" }, { status: 500 });

    const prediction = await res.json();
    if (prediction.status === "succeeded" && prediction.output?.[0]) {
      return NextResponse.json({ imagenUrl: prediction.output[0] });
    }

    // Poll
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await poll.json();
      if (data.status === "succeeded" && data.output?.[0]) return NextResponse.json({ imagenUrl: data.output[0] });
      if (data.status === "failed") return NextResponse.json({ error: "Generación fallida" }, { status: 500 });
    }
    return NextResponse.json({ error: "Timeout" }, { status: 504 });
  } catch (error) {
    return NextResponse.json({ error: `Error: ${error instanceof Error ? error.message : "desconocido"}` }, { status: 500 });
  }
}
