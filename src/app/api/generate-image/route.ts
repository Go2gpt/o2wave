import { NextRequest, NextResponse } from "next/server";
import type { ContentFormData } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { formData }: { formData: ContentFormData } = await request.json();
    const { tipoOrganizacion, redSocial, formatoInstagram, tema } = formData;

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return NextResponse.json({ error: "REPLICATE_API_TOKEN no configurado" }, { status: 500 });

    const aspectRatio = redSocial === "Instagram" && formatoInstagram === "Story 9:16" ? "9:16"
      : redSocial === "Facebook" ? "16:9" : "1:1";

    const orgType = (tipoOrganizacion === "ong_pequena" || tipoOrganizacion === "ong_mediana")
      ? "non-profit organization" : "small business";

    // Prompt SIN texto ni logos: solo imagen visual. El texto se añade luego
    // por código (overlay propio con Montserrat).
    const imagePrompt = `Professional photographic illustration for the social media of a ${orgType}, about "${tema}". Modern, vibrant, high quality, clean and uncluttered composition. Clean photographic illustration. No text, no letters, no words, no typography, no logos, no watermarks, no signatures. Pure visual content only.`;

    // FLUX 1.1 Pro (mejor calidad y adherencia al prompt). Devolvemos el
    // predictionId; el cliente hace polling y la composición del texto ocurre
    // al terminar. flux-1.1-pro NO usa num_inference_steps ni guidance.
    const res = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          prompt: imagePrompt,
          aspect_ratio: aspectRatio,
          output_format: "webp",
          output_quality: 90,
          safety_tolerance: 2,
          prompt_upsampling: false,
        },
      }),
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
